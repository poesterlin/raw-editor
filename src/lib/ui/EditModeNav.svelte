<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { stringifyPP3 } from '$lib/pp3-utils';
	import { edits } from '$lib/state/editing.svelte';
	import { IconAdjustmentsHorizontal, IconArrowBackUp, IconArrowForwardUp, IconCameraFilled, IconCameraPlus, IconCheck, IconCrop, IconRestore } from '@tabler/icons-svelte';

	interface Props {
		img: string;
		showSnapshots?: boolean;
		showCrop?: boolean;
		showUndoRedo?: boolean;
		showReset?: boolean;
		showEdit?: boolean;
	}

	let { img, showSnapshots, showCrop, showUndoRedo, showReset, showEdit }: Props = $props();

	let savedSnapshot = $state(false);

	async function saveSnapshot() {
		const res = await fetch(`/api/images/${page.params.img}/snapshots`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ pp3: stringifyPP3(edits.pp3) })
		});
		savedSnapshot = res.ok;
		await invalidateAll();

		setTimeout(() => {
			savedSnapshot = false;
		}, 2000);
	}
</script>

<nav>
	{#if showUndoRedo}
		<button disabled={!edits.canRedo} onclick={edits.redo}>
			<IconArrowBackUp />
		</button>
		<button disabled={!edits.canUndo} onclick={edits.undo}>
			<IconArrowForwardUp />
		</button>
	{/if}
	{#if showReset && edits.canUndo}
		<button class="reset-btn" onclick={() => {}}>
			<IconRestore>
				<span class="sr-only">Reset All</span>
			</IconRestore>
		</button>
	{/if}
	{#if showCrop}
		<a href="/editor/{img}/crop">
			<IconCrop />
		</a>
	{/if}
	{#if showEdit}
		<a href="/editor/{img}">
			<IconAdjustmentsHorizontal />
		</a>
	{/if}
	{#if showSnapshots}
		<a href="?snapshot">
			<IconCameraFilled>
				<span class="sr-only">Snapshots</span>
			</IconCameraFilled>
		</a>
		<button onclick={saveSnapshot}>
			{#if savedSnapshot}
				<IconCheck />
			{:else}
				<IconCameraPlus>
					<span class="sr-only">Save Snapshot</span>
				</IconCameraPlus>
			{/if}
		</button>
	{/if}
</nav>

<style>
	nav {
		position: absolute;
		inset: 0 auto 0 1rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		height: max-content;
		background: rgba(0, 0, 0, 0.1);
		backdrop-filter: blur(10px);
		border-radius: 8px;
		margin: auto;
		padding: 0.4rem;
		z-index: 100;
		gap: 0.5rem;
	}

	a,
	button {
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), transparent);
		backdrop-filter: blur(30px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		padding: 0.5rem;
		border-radius: 4px;
		color: rgb(196, 196, 196);

		& > :global(svg) {
			width: 2rem;
			height: 2rem;
		}
	}

	a:hover,
	button:hover {
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), transparent);
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	button:disabled {
		opacity: 0.8;
		color: rgba(196, 196, 196, 0.5);
		pointer-events: none;
	}
</style>
