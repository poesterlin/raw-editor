<script lang="ts">
	import Button from '$lib/ui/Button.svelte';
	import { onMount } from 'svelte';
	import { IconChevronRight, IconChevronLeft, IconX } from '$lib/ui/icons';

	let { data } = $props();

	let currentIndex = $state(0);

	function nextImage() {
		currentIndex = (currentIndex + 1) % data.images.length;
	}

	function prevImage() {
		currentIndex = (currentIndex - 1 + data.images.length) % data.images.length;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowRight') {
			nextImage();
		} else if (event.key === 'ArrowLeft') {
			prevImage();
		}
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeydown);
		return () => {
			window.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

<svelte:head>
	<title>Exporter: {data.session.name}</title>
</svelte:head>

<div class="relative flex h-full w-full items-center justify-center bg-neutral-950">
	{#if data.images.length > 0}
		<div class="relative flex h-full w-full items-center justify-center">
			{#each data.images as image, i}
				<img
					src={`/api/exporter/sessions/${data.session.id}/${image}`}
					alt={`Exported image ${i + 1} for session ${data.session.name}`}
					class="h-full w-full object-contain transition-opacity duration-300 {i === currentIndex ? 'opacity-100' : 'opacity-0'}"
					style={i === currentIndex ? '' : 'position: absolute;'}
				/>
			{/each}
		</div>

		<div class="absolute top-1/2 left-4 -translate-y-1/2">
			<Button onclick={prevImage}>
				<IconChevronLeft />
			</Button>
		</div>
		<div class="absolute top-1/2 right-4 -translate-y-1/2">
			<Button onclick={nextImage}>
				<IconChevronRight />
			</Button>
		</div>

		<div class="absolute bottom-4 text-center text-neutral-400">
			{currentIndex + 1} / {data.images.length}
		</div>
	{:else}
		<div class="text-center text-neutral-400">
			<h1 class="mb-2 text-2xl font-bold">No exported images found for {data.session}</h1>
			<p>It seems this session has a folder but no .jpg files inside it.</p>
			<a href="/exporter" class="mt-4 inline-block text-blue-500 hover:underline"> Return to Exporter </a>
		</div>
	{/if}
</div>

<style>
	:global(main){
		padding-bottom: 0;
	}
</style>