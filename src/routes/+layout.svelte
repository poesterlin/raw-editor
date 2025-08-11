<script lang="ts">
	import BasePP3 from '$lib/assets/client.pp3?raw';
	import favicon from '$lib/assets/favicon.svg';
	import { edits } from '$lib/state/editing.svelte';
	import '../app.css';

	let { children } = $props();

	edits.initialize(BasePP3);

	$effect(() => {
		const newPP3 = $state.snapshot(edits.pp3);
		// edits.store();
		edits.updateThrottledPP3(newPP3);
	});

	$effect(() => {
		if (edits.throttledPP3) {
			edits.isLoading = true;
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<main class="h-screen bg-black text-white">
	{@render children?.()}
</main>
