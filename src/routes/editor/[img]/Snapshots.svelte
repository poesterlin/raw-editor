<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { toBase64 } from '$lib/pp3-utils';
	import type { Snapshot } from '$lib/server/db/schema';
	import { edits } from '$lib/state/editing.svelte';
	import Modal from '$lib/ui/Modal.svelte';

	interface Props {
		snapshots: Snapshot[];
	}

	let { snapshots }: Props = $props();

	async function deleteSnapshot(snapshotId: number) {
		if (confirm('Are you sure you want to delete this snapshot?')) {
			await fetch(`/api/images/${page.params.img}/snapshots/${snapshotId}`, {
				method: 'DELETE'
			});
			snapshots = snapshots.filter((s) => s.id !== snapshotId);
			invalidateAll();
		}
	}
</script>

<Modal onClose={() => goto(`/editor/${page.params.img}`)} class="space-y-4 p-5">
	<h2 class="mb-6 text-xl font-semibold text-white">Snapshots</h2>
	<div class="snapshot-list">
		{#each snapshots as snapshot}
			<div class="snapshot-item">
				<img src={`/api/images/${page.params.img}/edit?preview&config=${toBase64(snapshot.pp3)}`} alt="Snapshot" class="snapshot-preview" loading="lazy" />
				<div class="snapshot-info">
					<button onclick={() => edits.initialize(snapshot.pp3)}>Restore</button>
					<button onclick={() => deleteSnapshot(snapshot.id)}>Delete</button>
				</div>
			</div>
		{:else}
			<div class="snapshot-item">
				<p class="text-neutral-500">No snapshots available</p>
			</div>
		{/each}
	</div>
</Modal>

<style>
	.snapshot-list {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 1rem;
		max-height: 60vh;
		overflow-y: auto;
	}

	.snapshot-item {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		background: var(--bg-3);
		padding: 0.5rem;
		border-radius: 6px;
		border: 1px solid var(--border-1);
	}

	.snapshot-preview {
		width: 100%;
		height: auto;
		aspect-ratio: 3 / 2;
		object-fit: cover;
		border-radius: 4px;
	}

	.snapshot-info {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
	}

	.snapshot-info button {
		width: 100%;
		padding: 0.25rem 0.5rem;
		background: var(--bg-4);
		border: 1px solid var(--border-2);
		border-radius: 4px;
		color: var(--text-2);
		cursor: pointer;
		transition: background 0.2s ease;
	}

	.snapshot-info button:hover {
		background: var(--bg-1);
	}
</style>
