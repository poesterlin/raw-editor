<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		onclick?: () => void;
		title?: string;
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
	}

	const { children, onclick, title, type = 'button', disabled = false }: Props = $props();
</script>

<button
	{onclick}
	{type}
	disabled={disabled}
	class="rounded-md border-2 border-neutral-500/30 bg-linear-to-r from-neutral-800 to-neutral-900 p-2.5 transition-colors hover:border-neutral-200 hover:from-neutral-600 hover:to-neutral-800 focus:ring-2 focus:ring-neutral-200"
	{title}
>
	{@render children()}
</button>
