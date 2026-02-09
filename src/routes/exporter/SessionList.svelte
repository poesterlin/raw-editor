<script lang="ts">
	import { onDestroy } from 'svelte';
	import Scroller from '$lib/ui/Scroller.svelte';
	import Tooltip from '$lib/ui/Tooltip.svelte';
	import type { ExporterSessionsResponse } from '../api/exporter/sessions/+server';
	import Modal from '$lib/ui/Modal.svelte';
	import { enhance } from '$app/forms';
	import { app } from '$lib/state/app.svelte';
	import { integrationLogos } from '$lib/ui/integrations';

	type Session = ExporterSessionsResponse['sessions'][number];
	interface Props {
		sessions: ExporterSessionsResponse['sessions'];
		next: number | null;
		onLoaded: (data: ExporterSessionsResponse) => void;
		integrations: string[];
	}

	let { sessions, next, onLoaded, integrations }: Props = $props();

	let scroller = $state<Scroller<Session>>();
	let loading = $state(false);
	let jobStates = $state<Record<number, 'exporting' | 'cancelling'>>({});
	let pollingIntervals: Record<number, ReturnType<typeof setInterval>> = {};

	let albumCreateSession = $state<number>();

	function pollJobStatus(sessionId: number) {
		const intervalId = setInterval(async () => {
			const response = await fetch(`/api/sessions/${sessionId}/export`);

			console.log(`[Polling] Session ${sessionId}: status check returned ${response.status}`);

			if (response.status === 404) {
				// Job is no longer active, so it's done.
				clearInterval(intervalId);
				delete pollingIntervals[sessionId];
				delete jobStates[sessionId];

				const session = sessions.find((s) => s.id === sessionId);
				if (session) {
					session.status = 'Exported';
				}
			}
		}, 2000);

		pollingIntervals[sessionId] = intervalId;
	}

	async function exportSession(sessionId: number) {
		jobStates[sessionId] = 'exporting';
		await fetch(`/api/sessions/${sessionId}/export`, { method: 'POST' });
		pollJobStatus(sessionId);
	}

	async function cancelExport(sessionId: number) {
		jobStates[sessionId] = 'cancelling';
		const intervalId = pollingIntervals[sessionId];
		if (intervalId) {
			clearInterval(intervalId);
			delete pollingIntervals[sessionId];
		}
		await fetch(`/api/sessions/${sessionId}/export`, { method: 'DELETE' });
		delete jobStates[sessionId];
	}

	onDestroy(() => {
		for (const intervalId of Object.values(pollingIntervals)) {
			clearInterval(intervalId);
		}
	});

	function formatDate(dateString: string) {
		if (!dateString) return '';
		return new Date(dateString).toLocaleDateString(undefined, {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		});
	}
</script>

{#snippet item({ item }: { item: Session })}
	<div class="group relative mb-6 overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900/40 p-6 transition-all hover:border-neutral-700 hover:bg-neutral-900/60">
		<div class="flex flex-col gap-8 md:flex-row md:items-center">
			<div class="flex flex-1 items-start gap-6">
				{#if item.images.length > 0}
					<a href="/exporter/{item.id}" class="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl ring-offset-black transition-all group-hover:ring-2 group-hover:ring-neutral-700">
						<img
							src="/api/images/{item.images[0].id}/preview"
							alt={`${item.name} thumbnail`}
							class="h-full w-full object-cover"
						/>
					</a>
				{/if}
				<div class="flex flex-col gap-2">
					<div class="flex flex-wrap items-center gap-3">
						<h2 class="text-xl font-bold tracking-tight text-neutral-100">{item.name}</h2>

						{#if jobStates[item.id] === 'exporting'}
							<span
								class="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-blue-400 border border-blue-500/20"
							>
								<span class="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400"></span>
								Exporting
							</span>
						{:else if item.status === 'Updated'}
							<span
								class="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-400 border border-amber-500/20"
							>
								<span class="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
								Changes Pending
							</span>
						{:else}
							<span
								class="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-400 border border-emerald-500/20"
							>
								<span class="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
								Exported
							</span>
						{/if}
					</div>
					<p class="text-sm font-medium text-neutral-500">
						{item.images.length} images <span class="mx-2 text-neutral-800">•</span> {formatDate(item.startedAt)}
					</p>
					
					<div class="mt-2 flex items-center gap-3">
						{#each integrations as integration}
							{@const album = item.albums.find((a) => a.integration === integration)}
							{@const img = integrationLogos[integration]}
							{#if album}
								<Tooltip text="View Album on {integration}" position="top">
									<a
										href={album?.url}
										target="_blank"
										rel="noopener noreferrer"
										class="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-800/50 p-1.5 text-neutral-100 transition-all hover:bg-neutral-800 hover:scale-110"
									>
										{@html img}
									</a>
								</Tooltip>
							{:else}
								<Tooltip text="Create Album on {integration}" position="top">
									<button
										onclick={() => (albumCreateSession = item.id)}
										class="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-800/30 p-1.5 text-neutral-500 opacity-50 transition-all hover:bg-neutral-800 hover:text-neutral-100 hover:opacity-100 hover:scale-110"
									>
										{@html img}
									</button>
								</Tooltip>
							{/if}
						{/each}
					</div>
				</div>
			</div>

			<div class="flex items-center gap-3 shrink-0">
				<a
					href="/exporter/{item.id}"
					class="flex items-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-900/50 px-5 py-3 text-xs font-bold text-neutral-400 transition-all hover:bg-neutral-800 hover:text-neutral-100"
				>
					View Details
				</a>

				{#if jobStates[item.id] === 'exporting'}
					<button
						onclick={() => cancelExport(item.id)}
						class="flex items-center gap-2 rounded-2xl bg-neutral-800 px-6 py-3 text-xs font-bold text-neutral-100 transition-all hover:bg-neutral-700"
					>
						Cancel
					</button>
				{:else if item.status === 'Updated'}
					<button
						onclick={() => exportSession(item.id)}
						class="group/btn flex items-center gap-3 rounded-2xl bg-neutral-100 px-8 py-3 text-xs font-black uppercase tracking-tight text-neutral-950 transition-all hover:bg-white hover:scale-105"
					>
						Export Now
						<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="transition-transform group-hover/btn:translate-x-1"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
					</button>
				{:else}
					<button
						onclick={() => exportSession(item.id)}
						class="flex items-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-900/50 px-6 py-3 text-xs font-bold text-neutral-500 transition-all hover:bg-neutral-800 hover:text-neutral-100"
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
						Re-export
					</button>
				{/if}
			</div>
		</div>
	</div>
{/snippet}

{#snippet empty()}
	<div class="flex h-[40vh] items-center justify-center rounded-[2.5rem] border border-neutral-800 bg-neutral-900/20">
		<div class="text-center">
			<div class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-neutral-900 text-neutral-700">
				<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
			</div>
			<h3 class="text-2xl font-black italic uppercase tracking-tighter text-neutral-100">Nothing to Export</h3>
			<p class="mt-2 font-medium text-neutral-500">Finish some edits in the gallery to see them here.</p>
		</div>
	</div>
{/snippet}

{#snippet footer()}
	{#if loading}
		<div class="flex justify-center py-12">
			<div class="h-6 w-6 animate-spin rounded-full border-2 border-neutral-700 border-t-transparent"></div>
		</div>
	{/if}
{/snippet}

<Scroller
	bind:this={scroller}
	items={sessions}
	{item}
	{empty}
	{footer}
	onMore={async () => {
		if (loading || !next) return;
		loading = true;

		const response = await fetch(`/api/exporter/sessions?cursor=${next}`);
		const result = (await response.json()) as ExporterSessionsResponse;

		onLoaded(result);

		loading = false;
	}}
></Scroller>

{#if albumCreateSession}
	<Modal onClose={() => (albumCreateSession = undefined)} class="!max-w-md !rounded-[2.5rem] !border-neutral-800 !bg-neutral-950 shadow-3xl">
		<div class="p-10">
			<h1 class="mb-2 text-3xl font-black italic uppercase tracking-tighter text-neutral-100 leading-none">Create <span class="text-neutral-500 not-italic font-light">Album</span></h1>
			<p class="mb-10 font-medium leading-relaxed text-neutral-400">Sync this session with your connected photo services.</p>
			
			<form
				method="POST"
				action="?/create-album"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success') {
							app.addToast('Album created successfully!', 'success');
							albumCreateSession = undefined;
						} else if (result.type === 'error') {
							app.addToast(`Failed to create album`, 'error');
						} else if (result.type === 'redirect') {
							update();
						} else if (result.type === 'failure') {
							app.addToast(`Failed to create album: ${result.data?.error}`, 'error');
						}
					};
				}}
				class="flex flex-col gap-8"
			>
				<input type="hidden" name="session" value={albumCreateSession} required />

				<div>
					<label for="integration-select" class="mb-3 block text-xs font-bold uppercase tracking-widest text-neutral-500">Choose Service</label>
					<div class="relative">
						<select
							id="integration-select"
							name="integration"
							class="w-full appearance-none rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4 capitalize text-neutral-100 outline-none transition-all focus:border-neutral-100"
							required
						>
							{#each integrations as integrationType}
								<option value={integrationType} class="bg-neutral-900 capitalize">{integrationType}</option>
							{/each}
						</select>
						<div class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500">
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
						</div>
					</div>
				</div>

				<div class="flex flex-col gap-3 pt-4">
					<button class="w-full rounded-2xl bg-neutral-100 py-4 text-sm font-black tracking-tight text-neutral-950 transition-all hover:bg-white hover:scale-[1.02]" type="submit">
						CREATE ALBUM
					</button>
					<button type="button" onclick={() => (albumCreateSession = undefined)} class="w-full py-2 text-sm font-bold text-neutral-600 transition-colors hover:text-neutral-400">
						Nevermind
					</button>
				</div>
			</form>
		</div>
	</Modal>
{/if}
