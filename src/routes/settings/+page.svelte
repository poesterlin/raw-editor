<script lang="ts">
    import { enhance } from '$app/forms';
    import Checkbox from '$lib/ui/Checkbox.svelte';
    let { data } = $props();

    let triageEnabled = $derived(data.settings.triage_enabled !== 'false');
    let form = $state<HTMLFormElement>();
</script>

<div class="flex h-full items-center justify-center">
    <div class="w-full max-w-md">

        <div class="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
            <h1 class="mb-6 text-2xl font-bold text-center">Settings</h1>
            
            <form method="POST" action="?/update" use:enhance bind:this={form}>
                <div class="flex flex-col gap-1 py-3">
                    <Checkbox 
                        label="Triage Step" 
                        name="triage_enabled" 
                        bind:checked={triageEnabled} 
                        onchange={() => form?.requestSubmit()} 
                    />
                    <div class="text-sm text-neutral-400 pr-16">Enable or disable the Triage view.</div>
                </div>
            </form>
        </div>
        
        <div class="rounded-lg border border-neutral-800 bg-neutral-900 p-6 text-center mt-12">
            <h1 class="mb-4 text-2xl font-bold">Legal</h1>
            <a href="/legal" class="underline">Licenses and more</a>
        </div>
    </div>
</div>
