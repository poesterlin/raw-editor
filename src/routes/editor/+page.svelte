<script lang="ts">
	let { data } = $props();
</script>

<div class="h-full overflow-y-auto p-4 sm:p-6 md:p-8">
	<h1 class="mb-4 text-2xl font-bold text-neutral-50 sm:mb-6 sm:text-3xl">Tagged Images</h1>

	<div class="flex flex-col gap-8">
		{#each data.tags as tag}
			<div>
				<span class="inline-block rounded-full bg-neutral-800 px-3 py-1 text-sm font-semibold text-neutral-300">{tag.name}</span>
				<div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
					{#each tag.images as imageId}
						<a href={`/editor/${imageId}`} aria-label="Edit Image">
							<img src={`/api/images/${imageId}/preview`} alt="" class="h-auto w-full rounded-lg" />
						</a>
					{/each}
				</div>
			</div>
		{:else}
			<p class="text-neutral-400">No tagged images found.</p>
		{/each}
	</div>
</div>
