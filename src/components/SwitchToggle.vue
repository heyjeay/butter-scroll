<script setup>
const model = defineModel({ type: Boolean, default: false });
defineProps({ label: { type: String, required: true }, disabled: Boolean });
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="model"
    :aria-label="label"
    :disabled="disabled"
    class="relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-butter-deep disabled:cursor-not-allowed disabled:opacity-40"
    :class="model ? 'bg-butter-deep' : 'bg-track'"
    @click="model = !model"
  >
    <span
      class="absolute left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform duration-300 ease-[cubic-bezier(.25,1,.5,1)]"
      :class="model ? 'translate-x-4' : 'translate-x-0'"
    />
  </button>
</template>
