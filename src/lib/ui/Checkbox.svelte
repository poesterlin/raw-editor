<script lang="ts">
	interface Props {
		checked?: boolean;
		disabled?: boolean;
		label?: string;
		id?: string;
		name?: string;
		small?: boolean;
		onchange?: (value: boolean) => void;
	}

	let { checked = $bindable(false), disabled = false, label = 'Toggle', id = `toggle-${Math.random().toString(36).slice(2, 9)}`, name, small, onchange }: Props = $props();

	function handleChange(e: Event) {
		const next = (e.target as HTMLInputElement).checked;
		checked = next;
		onchange?.(next);
	}
</script>

<div class="focus flex flex-1 items-center justify-between gap-3" class:py-2={!small}>
	<label for={id} class="flex-1 font-medium text-zinc-300 select-none">
		{label}
	</label>

	<!-- Switch wrapper -->
	<label
		role="switch"
		aria-checked={checked}
		aria-disabled={disabled}
		class="relative z-10 h-5 w-12 cursor-pointer rounded-full pointer-events-auto
		transition-colors outline-none select-none focus-visible:ring-2
		focus-visible:ring-sky-500/60
		{checked ? 'bg-neutral-200 ring-neutral-300' : 'bg-neutral-950 ring-neutral-500'}"
		class:opacity-60={disabled}
	>
		<!-- Track background (dark) -->
		<div
			class="
        background absolute inset-0 overflow-hidden rounded-full
        ring-1
      "
		>
			<div class={`absolute inset-0 ${checked ? 'bg-neutral-200' : 'bg-neutral-950'}`}></div>
		</div>

		<!-- Knob -->
		<div
			class={`
        transition-left absolute top-1/2 h-4 w-4 -translate-y-1/2
        rounded-full shadow-sm ring-1
        duration-150 ease-out
        ${checked ? 'bg-neutral-500 ring-neutral-600' : 'bg-white ring-neutral-300'}
      `}
			style={`left:${checked ? `calc(100% - 1.15rem)` : '0.25rem'}`}
			aria-hidden="true"
		></div>

		<!-- Native checkbox for keyboard + screen readers -->
		<input {id} {name} type="checkbox" class="absolute inset-0 opacity-0 pointer-events-auto" {disabled} bind:checked onchange={handleChange} />
	</label>
</div>

<style>
	div[role='switch'] {
		box-shadow: inset 4px 4px black;
	}

	.focus:focus-within {
		label {
		}

		.background {
			outline: 2px solid white;
		}
	}
</style>
