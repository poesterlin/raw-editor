<script lang="ts">
	import Scroller from '$lib/ui/Scroller.svelte';
	import type { SessionsResponse } from '../api/sessions/+server';

	type Session = SessionsResponse['sessions'][number];
	interface Props {
		sessions: SessionsResponse['sessions'];
		next: number | null;
		onLoaded: (data: SessionsResponse) => void;
	}

	let { sessions, next, onLoaded }: Props = $props();

	let scroller = $state<Scroller<Session>>();
	let loading = $state(false);
	let importJobStates = $state<Record<number, 'importing'>>({});

	async function importSession(sessionId: number) {
		importJobStates[sessionId] = 'importing';
		const response = await fetch(`/api/sessions/${sessionId}/import`, { method: 'POST' });

		if (!response.ok && response.status !== 409) {
			// Handle unexpected errors, maybe show a toast notification
			console.error('Failed to start import job', await response.text());
			// Reset state on failure
			delete importJobStates[sessionId];
		}
		// If 409, it's already running, so we just leave the UI in the 'importing' state.
		// A full implementation would also poll a GET endpoint to clear the state when done.
	}

	export function capture() {
		return scroller?.capture();
	}

	export function restore(values: any) {
		scroller?.restore(values);
	}

	const intl = new Intl.DateTimeFormat('de-DE', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric'
	});
	function formatDate(date: Date) {
		return intl.format(new Date(date));
	}
</script>

{#snippet item({ item }: { item: Session })}
	<section>
		<div class="mb-4 flex items-center justify-between">
			<div class="flex items-center gap-4">
				<h2 class="text-xl font-semibold text-neutral-200 sm:text-2xl">{item.name}</h2>
				{#if importJobStates[item.id]}
					<span class="inline-flex items-center rounded-full bg-blue-900/50 px-2.5 py-1 text-xs font-medium text-blue-300">
						<span class="me-2 h-2 w-2 animate-pulse rounded-full bg-blue-300"></span>
						Processing...
					</span>
				{:else}
					<button
						aria-label="Reprocess Session Images"
						onclick={() => importSession(item.id)}
						title="Process Session Images"
						class="text-neutral-400 transition-colors hover:text-neutral-100"
					>
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5">
							<path
								fill-rule="evenodd"
								d="M2 10a8 8 0 1 1 16 0 8 8 0 0 1-16 0Zm6.39-2.908a.75.75 0 0 1 .328.53l.043.282a.75.75 0 0 1-.588.843l-3.478.39a.75.75 0 0 1-.843-.587l-.043-.282a.75.75 0 0 1 .588-.843l3.478-.39a.75.75 0 0 1 .53-.328ZM12.25 7.5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5a.75.75 0 0 1 .75-.75Z"
								clip-rule="evenodd"
							/>
						</svg>
					</button>
				{/if}
			</div>
			<p class="ml-4 flex-shrink-0 text-neutral-400">{formatDate(item.startedAt)}</p>
		</div>
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
			{#each item.images as preview}
				<a
					href={`/editor/${preview.id}`}
					class="group block aspect-[3/2] overflow-hidden rounded-lg bg-neutral-900 ring-1 ring-transparent transition hover:ring-neutral-700"
				>
					<img
						src="/api/images/{preview.id}/preview?version={preview.version}"
						alt=""
						loading="lazy"
						class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
					/>
				</a>
			{/each}
		</div>
	</section>
{/snippet}

{#snippet empty()}
	<div class="flex h-full flex-col items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 p-8 text-center">
		<svg xmlns="http://www.w3.org/2000/svg" class="mb-6 h-20 w-20 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.158 0a.075.075 0 0 1 .075-.075h.009a.075.075 0 0 1 .075.075v.009a.075.075 0 0 1-.075.075h-.009a.075.075 0 0 1-.075-.075V8.25Z"
			/>
		</svg>
		<h2 class="mb-2 text-2xl font-bold text-neutral-200">Your Gallery is Empty</h2>
		<p class="max-w-md text-neutral-400">It looks like you haven't created any sessions yet. Start a new editing session to see your photos here.</p>
	</div>
{/snippet}

{#snippet footer()}
	{#if loading}
		<div class="flex justify-center p-4">
			<p class="text-neutral-400">Loading more...</p>
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

		const response = await fetch(`/api/sessions?offset=${next}`);
		const result = (await response.json()) as SessionsResponse;

		onLoaded(result);

		loading = false;
	}}
></Scroller>
