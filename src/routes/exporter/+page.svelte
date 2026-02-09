<script lang="ts">
	import SessionList from './SessionList.svelte';

	let { data } = $props();
</script>

<div class="relative flex h-full flex-col bg-black">
	<div class="mx-auto w-full max-w-7xl p-6 lg:p-12 pb-0">
		<div class="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
			<div>
				<h1 class="text-4xl sm:text-5xl font-black italic uppercase tracking-tighter text-neutral-100 mb-2">Exporter</h1>
				<p class="text-neutral-400 font-medium max-w-md">Manage and export your processed sessions to external integrations or local storage.</p>
			</div>
		</div>
	</div>

	<div class="flex-1 overflow-hidden px-6 lg:px-12">
		<div class="mx-auto h-full max-w-7xl">
			<SessionList
				sessions={data.sessions}
				next={data.next}
				onLoaded={({ sessions, next }) => {
					data.sessions = [...data.sessions, ...sessions];
					data.next = next;
				}}
				integrations={data.configuredIntegrations}
			/>
		</div>
	</div>
</div>

<style>
	/* Elegant Scrollbar */
	:global(::-webkit-scrollbar) {
		width: 6px;
	}
	:global(::-webkit-scrollbar-track) {
		background: black;
	}
	:global(::-webkit-scrollbar-thumb) {
		background: #262626;
		border-radius: 10px;
	}
	:global(::-webkit-scrollbar-thumb:hover) {
		background: #404040;
	}
</style>
