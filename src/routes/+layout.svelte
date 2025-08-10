<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { edits } from '$lib/state/editing.svelte';
	import BasePP3 from '$lib/assets/client.pp3?raw';

	let { children } = $props();

	edits.initialize(BasePP3);

	$effect(() => {
		edits.updateThrottledPP3($state.snapshot(edits.pp3));
	});

	$effect(()=>{
		if (edits.throttledPP3){
			edits.isLoading = true;
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<main class="bg-black h-screen text-white">
	{@render children?.()}
</main>
