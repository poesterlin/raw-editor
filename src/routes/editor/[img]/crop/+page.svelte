<script lang="ts">
	import { page } from '$app/state';
	import { assert } from '$lib';
	import Slider from '$lib/ui/Slider.svelte';
	import BasePP3 from '$lib/assets/client.pp3?raw';
	import {
		createInitialCrop,
		getAutoFillScale,
		getDisplayDimensions,
		getDisplayScale,
		getPreviewDimensions,
		safeNumber,
		sanitizeCrop,
		scaleCropPP3,
		screenToCropSpace,
		type Dimensions
	} from '$lib/canvas/crop';
	import { checkHandleCollision, drawCropGrid, moveHandle } from '$lib/canvas/grid';
	import { excludePP3, parsePP3, toBase64, type PP3 } from '$lib/pp3-utils';
	import { edits } from '$lib/state/editing.svelte';
	import Button from '$lib/ui/Button.svelte';
	import EditModeNav from '$lib/ui/EditModeNav.svelte';
	import { IconCheck, IconDeviceFloppy } from '$lib/ui/icons';
	
	let canvasEl = $state<HTMLCanvasElement>();
	let imgEl = $state<HTMLImageElement>();
			
	let { data } = $props();
	let imageDimensions: Dimensions = { width: 0, height: 0 };
	let displayDimensions: Dimensions = { width: 0, height: 0 };
	let autoFillScale = 1;
	let displayScale = 1;
	const padding = 24;
	let isMoving = false;
	let handle: string | undefined = undefined;
	let lastX = 0;
	let lastY = 0;
	let apiPath = $derived(`/api/images/${data.image.id}`);
	let imageUrl = $derived(apiPath + `/edit?preview&config=${toBase64(excludePP3(edits.throttledPP3, ['Crop', 'Rotation']))}`);

	$effect(() => {
		const latestSnapshot = data.snapshots[0];
		if (latestSnapshot) {
			edits.initialize(latestSnapshot.pp3, data.image);
		} else {
			edits.initialize(parsePP3(BasePP3), data.image);
		}
	});

	$effect(() => {
		fetch(apiPath + '/details')
			.then((res) => (res.ok ? res.json() : null))
			.then((data) => {
				imageInfo = data ? { resolutionX: data.resolutionX, resolutionY: data.resolutionY } : undefined;
			})
			.catch(() => {
				imageInfo = undefined;
			});
	});

	let moveCursor = $state(false);
	let snapshotSaved = $state(false);
	let flashKey = $state<string>();
	let flashTimer: number | null = null;
	let imageInfo = $state<{ resolutionX: number; resolutionY: number }>();

	let ctx = $derived.by(() => {
		if (!canvasEl) {
			return null;
		}

		const context = canvasEl?.getContext('2d');
		assert(context, 'Failed to get canvas context');
		return context;
	});

	function getRotationDeg() {
		return safeNumber(edits.pp3?.Rotation?.Degree);
	}

	function updateDimensions() {
		if (!canvasEl || !imgEl) {
			return;
		}

		imageDimensions = {
			width: imgEl.naturalWidth || imgEl.width,
			height: imgEl.naturalHeight || imgEl.height
		};

		const container = canvasEl.parentElement?.getBoundingClientRect();
		const maxWidth = Math.max(1, (container?.width ?? imageDimensions.width) - padding * 2);
		const maxHeight = Math.max(1, (container?.height ?? imageDimensions.height) - padding * 2);

		if (!imageDimensions.width || !imageDimensions.height) {
			displayScale = 0;
			displayDimensions = { width: 0, height: 0 };
			return;
		}

		const angleDeg = getRotationDeg();
		autoFillScale = getAutoFillScale(imageDimensions.width, imageDimensions.height, angleDeg);
		displayScale = getDisplayScale(imageDimensions.width, imageDimensions.height, maxWidth, maxHeight);
		displayDimensions = getDisplayDimensions(imageDimensions.width, imageDimensions.height, displayScale);
	}

	function getScaledPP3() {
		return scaleCropPP3(edits.pp3, displayScale);
	}

	function draw() {
		if (!canvasEl || !imgEl || !ctx) {
			return;
		}

		updateDimensions();
		if (!displayScale) {
			return;
		}

		const displayW = displayDimensions.width;
		const displayH = displayDimensions.height;
		canvasEl.width = displayW + padding * 2;
		canvasEl.height = displayH + padding * 2;

		// clear canvas
		ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
		ctx.fillStyle = '#000';
		ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);

		// clip to content area to hide black corners from rotation
		ctx.save();
		ctx.beginPath();
		ctx.rect(padding, padding, displayW, displayH);
		ctx.clip();

		// draw rotated image with AutoFill zoom
		const angleDeg = getRotationDeg();
		const angleRad = (angleDeg * Math.PI) / 180;
		const centerX = padding + displayW / 2;
		const centerY = padding + displayH / 2;
		ctx.translate(centerX, centerY);
		ctx.scale(displayScale * autoFillScale, displayScale * autoFillScale);
		ctx.rotate(-angleRad);
		ctx.translate(-imageDimensions.width / 2, -imageDimensions.height / 2);
		ctx.drawImage(imgEl, 0, 0, imageDimensions.width, imageDimensions.height);
		ctx.restore();

		// draw crop grid
		const scaledPP3 = getScaledPP3();
		if (!scaledPP3) {
			return;
		}

		drawCropGrid(ctx, scaledPP3, { padding, selected: handle });
	}

	async function snapshot() {
		await edits.snapshot()
		snapshotSaved = true;

		setTimeout(() => {
			snapshotSaved = false;
		}, 2000);
	}

	function move(event: PointerEvent) {
		if (!canvasEl || !ctx) {
			return;
		}

		const rect = canvasEl.getBoundingClientRect();
		const cropPoint = screenToCropSpace(
			event.clientX - rect.left,
			event.clientY - rect.top,
			padding,
			displayScale
		);
		const dx = cropPoint.x - lastX;
		const dy = cropPoint.y - lastY;
		lastX = cropPoint.x;
		lastY = cropPoint.y;

		if (!edits.pp3?.Crop || !displayScale) {
			return;
		}

		const scaledPP3 = getScaledPP3();
		if (!scaledPP3) {
			return;
		}

		moveCursor = !!checkHandleCollision(scaledPP3, cropPoint.x * displayScale, cropPoint.y * displayScale, 48);

		if (!isMoving || !handle) {
			return;
		}

		moveHandle(edits.pp3 as PP3<number>, handle, dx, dy, imageDimensions);

		requestAnimationFrame(() => draw());
	}

	function startMove(event: PointerEvent) {
		const pp3 = edits.pp3;
		if (!pp3) {
			return;
		}

		if (!displayScale) {
			updateDimensions();
		}

		if (!displayScale) {
			return;
		}

		const rect = canvasEl!.getBoundingClientRect();
		const cropPoint = screenToCropSpace(
			event.clientX - rect.left,
			event.clientY - rect.top,
			padding,
			displayScale
		);
		lastX = cropPoint.x;
		lastY = cropPoint.y;

		if (!pp3.Crop) {
			pp3.Crop = createInitialCrop(cropPoint.x, cropPoint.y, imageDimensions);

			handle = 'se';
			isMoving = true;
			moveCursor = true;
			canvasEl?.setPointerCapture(event.pointerId);
			return;
		}

		const scaledPP3 = getScaledPP3();
		handle = scaledPP3
			? checkHandleCollision(scaledPP3, cropPoint.x * displayScale, cropPoint.y * displayScale, 48)
			: undefined;
		if (handle && canvasEl) {
			isMoving = true;
			moveCursor = true;
			canvasEl.setPointerCapture(event.pointerId);
		} else {
			isMoving = false;
		}
	}

	function endMove(event: PointerEvent) {
		if (!canvasEl) {
			return;
		}
		
		isMoving = false;
		handle = undefined;

		canvasEl.releasePointerCapture(event.pointerId);
		moveCursor = false;

		if (edits.pp3?.Crop) {
			sanitizeCrop(edits.pp3.Crop as unknown as { X: number; Y: number; W: number; H: number }, imageDimensions, imageDimensions);
		}
		edits.pp3 = structuredClone($state.snapshot(edits.pp3));

		requestAnimationFrame(() => draw());
	}

	function handleKeyDown(event: KeyboardEvent) {
		const target = event.target as HTMLElement | null;
		if (event.repeat) {
			return;
		}
		if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) {
			return;
		}
		const normalizedKey = event.key.length === 1 ? event.key.toLowerCase() : event.key;
		if (normalizedKey === 's') {
			event.preventDefault();
			flashKey = normalizedKey;
			if (flashTimer) {
				clearTimeout(flashTimer);
			}
			flashTimer = window.setTimeout(() => {
				if (flashKey === normalizedKey) {
					flashKey = undefined;
				}
			}, 220);
			snapshot();
		}
	}

</script>

<svelte:window onkeydown={handleKeyDown} onpointerup={endMove} />

<img src={imageUrl} alt="" class="hidden" bind:this={imgEl} onload={draw} />

<div class="relative flex h-full w-full items-center justify-center">
	<canvas bind:this={canvasEl} onpointerdown={startMove} onpointermove={move} class:cursor-move={moveCursor} class="m-auto"></canvas>
	<EditModeNav showEdit img={page.params.img!} />
	<div class="absolute bottom-4 right-4">
		<Button onclick={snapshot} flash={flashKey === 's'}>
			<span>Save Crop</span>
			{#if snapshotSaved}
				<IconCheck />
			{:else}
				<IconDeviceFloppy />
			{/if}
		</Button>
		<div class="mt-2 max-w-[18rem] rounded-md border border-neutral-800/60 bg-neutral-950/70 p-2 text-xs text-neutral-300">
			{#if imageInfo}
				<div>RAW: {imageInfo.resolutionX} x {imageInfo.resolutionY}</div>
				{@const preview = getPreviewDimensions(imageInfo.resolutionX, imageInfo.resolutionY, {})}
				<div>Preview TIFF: {preview.width} x {preview.height}</div>
			{:else}
				<div>RAW: —</div>
				<div>Preview TIFF: —</div>
			{/if}
			{#if edits.pp3?.Crop}
				<div>Crop: X {edits.pp3.Crop.X} Y {edits.pp3.Crop.Y} W {edits.pp3.Crop.W} H {edits.pp3.Crop.H}</div>
			{:else}
				<div>Crop: —</div>
			{/if}
			<div>Rotation: {getRotationDeg().toFixed(1)}°</div>
			<div class="text-neutral-400">Export uses full-resolution crop coordinates.</div>
		</div>
		{#if edits.pp3?.Rotation?.Enabled}
		<div class="mt-2 max-w-[18rem] rounded-md border border-neutral-800/60 bg-neutral-950/70 p-2 text-xs text-neutral-300">
			<Slider
			label="Rotate"
			min={-45}
			max={45}
			step={0.1}
			centered
			resetValue={0}
			bind:value={edits.pp3.Rotation.Degree as number}
			onchange={(v) => (edits.pp3.Rotation.Degree = v)}
			></Slider>
		</div>
		{/if}
	</div>
</div>
