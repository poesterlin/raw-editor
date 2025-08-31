<script lang="ts">
	import Modal from '$lib/ui/Modal.svelte';
	import { preventDefault } from 'svelte/legacy';

	let { data } = $props();

	let selectedIds = $state<Set<number>>(new Set(data.items.map((item) => item.id)));
	let showModal = $state(false);
	let sessionName = $state('');
	let isCreating = $state(false);

	function toggleSelection(id: number) {
		if (selectedIds.has(id)) {
			selectedIds.delete(id);
		} else {
			selectedIds.add(id);
		}

		selectedIds = new Set(selectedIds);
	}

	async function createSession() {
		isCreating = true;
		try {
			const response = await fetch('/api/sessions', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					name: sessionName,
					importIds: Array.from(selectedIds)
				})
			});

			if (!response.ok) {
				throw new Error('Failed to create session');
			}

			// Remove imported items from the UI
			data.items = data.items.filter((item) => !selectedIds.has(item.id));

			// Reset state
			selectedIds.clear();
			sessionName = '';
			showModal = false;
		} catch (error) {
			console.error('Creation failed', error);
			// Handle error display
		} finally {
			isCreating = false;
		}
	}

	function formatDate(date: Date) {
		return new Date(date).toLocaleDateString();
	}
</script>

{#snippet empty()}
	<div class="flex h-64 items-center justify-center">
		<div class="text-center">
			<h3 class="text-lg font-semibold text-neutral-300">No Images to Import</h3>
			<p class="mt-1 text-neutral-400">Drop image files into your configured import directory.</p>
		</div>
	</div>
{/snippet}

{#if selectedIds.size > 0}
	<button class="fixed bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-neutral-800 p-2 px-6 shadow-2xl" onclick={() => (showModal = true)}>
		<span>
			Import {selectedIds.size} image{selectedIds.size > 1 ? 's' : ''}...
		</span>
	</button>
{/if}

{#if showModal}
	<Modal onClose={() => (showModal = false)}>
		<h1 class="border-b border-neutral-600 p-4 text-lg font-medium text-neutral-200">Create New Session</h1>
		<form onsubmit={preventDefault(createSession)} class="flex flex-col gap-4 p-4">
			<label for="session-name" class="text-neutral-300">Session Name</label>
			<input id="session-name" type="text" bind:value={sessionName} class="rounded-md border-neutral-600 bg-neutral-900 p-2 text-neutral-200 focus:ring-blue-500" required />
			<div class="flex justify-end gap-2">
				<button
					class="rounded-md border border-neutral-600 bg-neutral-900 p-2 text-neutral-200 transition-colors"
					type="button"
					onclick={() => (showModal = false)}
					disabled={isCreating}>Cancel</button
				>
				<button class="rounded-md border border-neutral-600 bg-neutral-900 p-2 text-neutral-200 transition-colors" type="submit" disabled={isCreating}>
					{#if isCreating}Creating...{:else}Create Session{/if}
				</button>
			</div>
		</form>
	</Modal>
{/if}

<div class="grid p-4">
	{#each data.items as item}
		<button
			class="relative aspect-3/2 w-[160px] cursor-pointer overflow-hidden rounded-lg bg-neutral-900 shadow-md transition-all"
			class:ring-4={selectedIds.has(item.id)}
			class:ring-blue-500={selectedIds.has(item.id)}
			onclick={() => toggleSelection(item.id)}
		>
			<img
				src={`/api/imports/${item.id}/preview`}
				alt=""
				loading="lazy"
				class="h-full w-full object-cover transition-transform duration-300"
				class:scale-105={!selectedIds.has(item.id)}
				class:group-hover:scale-110={!selectedIds.has(item.id)}
			/>
			<div class="absolute right-0 bottom-0 left-0 bg-black/50 p-2 text-center text-xs font-medium text-white backdrop-blur-sm">
				{formatDate(item.date)}
			</div>
			{#if selectedIds.has(item.id)}
				<div class="absolute inset-0 flex items-center justify-center bg-blue-500/50 transition-opacity">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-12 w-12 text-white">
						<path
							fill-rule="evenodd"
							d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
							clip-rule="evenodd"
						/>
					</svg>
				</div>
			{/if}
		</button>
	{:else}
		{@render empty()}
	{/each}
</div>

<style>
	.aspect-3\/2 {
		aspect-ratio: 3 / 2;
	}

	.grid {
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		grid-gap: 0.125rem;
	}
</style>
