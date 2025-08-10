<script lang="ts">
	let { data } = $props();
</script>

<div class="image-grid">
	{#each data.images as img}
		<a href="/{img}/">
			<img src="/{img}/raw?preview" alt="" class="h-32" loading="lazy" />
		</a>
	{/each}
</div>
