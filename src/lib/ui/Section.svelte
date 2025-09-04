<script lang="ts">
	import type { Snippet } from 'svelte';
	import Checkbox from './Checkbox.svelte';
	import { edits } from '$lib/state/editing.svelte';
	import { IconChevronRight } from '@tabler/icons-svelte';

	interface Props {
		title: string;
		section: string;
		children: Snippet<[]>;
		enabledKey?: string;
	}

	let { title, section, children, enabledKey = 'Enabled' }: Props = $props();

	let enabled = $derived.by(() => {
		const sectionState = edits.pp3[section];
		return sectionState[enabledKey] as boolean;
	});

	function setEnabled(value: boolean) {
		enabled = value;
		edits.pp3[section][enabledKey] = value;
	}
</script>

<details class="border-b border-neutral-700/50">
	<summary class="mb-1 flex cursor-pointer items-center rounded-lg bg-neutral-800 px-4 py-2 select-none">
		<IconChevronRight class="mr-2 shrink-0" />
		<Checkbox label={title} checked={enabled} onchange={(e) => setEnabled(e)} small></Checkbox>
	</summary>
	<div class="flex flex-col gap-2 px-4 py-2" class:opacity-70={enabled}>
		{@render children()}
	</div>
</details>

<style>
	details summary::-webkit-details-marker {
		display: unset;
	}

	details[open] {
		summary > :global(svg) {
			transform: rotate(90deg);
		}
	}
</style>
