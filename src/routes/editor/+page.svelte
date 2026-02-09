<script lang="ts">
	let { data } = $props();
</script>

<div class="h-full overflow-y-auto p-4 sm:p-6 md:p-8">
	{#if data.lastEditedImages.length > 0}
		<h1 class="mb-6 text-2xl font-bold tracking-tight text-neutral-100 sm:text-3xl">Last Edited</h1>
		<div class="mb-8 gap-6 overflow-x-auto py-1 flex scrollbar-thin">
			{#each data.lastEditedImages as image}
				<a
					href={`/editor/${image.id}`}
					class="group relative block w-48 h-32 min-w-48 mb-4 min-h-32 overflow-hidden rounded-xl bg-neutral-900 shadow-lg ring-1 ring-neutral-800 transition-all hover:shadow-2xl hover:ring-neutral-600"
					aria-label="Edit Image"
				>
					<img
						src={`/api/images/${image.id}/preview`}
						alt=""
						loading="lazy"
						class="h-full w-full min-w-48 min-h-32 object-cover transition-transform duration-500 group-hover:scale-110"
					/>
					<div class="absolute inset-0 bg-linear-to-t from-neutral-950/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100"></div>
				</a>
			{/each}
		</div>
	{/if}

	<h1 class="mb-6 text-2xl font-bold tracking-tight text-neutral-100 sm:text-3xl">Tagged Images</h1>

	<div class="flex flex-col gap-12">
		{#each data.tags as tag}
			<div>
				<span class="inline-block rounded-full border border-neutral-700 bg-neutral-800 px-4 py-1.5 text-xs font-bold tracking-wider uppercase text-neutral-300">
					{tag.name}
				</span>
				<div class="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
					{#each tag.images as imageId}
						<a
							href={`/editor/${imageId}`}
							class="group relative block aspect-[3/2] overflow-hidden rounded-xl bg-neutral-900 shadow-lg ring-1 ring-neutral-800 transition-all hover:shadow-2xl hover:ring-neutral-600"
							aria-label="Edit Image"
						>
							<img
								src={`/api/images/${imageId}/preview`}
								alt=""
								loading="lazy"
								class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
							/>
							<div class="absolute inset-0 bg-linear-to-t from-neutral-950/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100"></div>
						</a>
					{/each}
				</div>
			</div>
		{:else}
			<div class="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-800 bg-neutral-900/30 p-12 text-center">
				<p class="text-neutral-500">No tagged images found.</p>
			</div>
		{/each}
	</div>
</div>

<style>
	.scrollbar-thin {
		scrollbar-width: thin;
	}
</style>