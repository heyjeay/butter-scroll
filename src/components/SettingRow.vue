<script setup>
defineProps({ title: { type: String, required: true }, hint: { type: String, default: '' } });
</script>

<template>
  <div class="flex items-start gap-3 px-4 py-3">
    <div class="min-w-0 flex-1">
      <p class="text-[13px] font-medium leading-5 text-ink">{{ title }}</p>
      <p v-if="hint" class="mt-0.5 text-xs leading-[1.45] text-muted">{{ hint }}</p>
    </div>
    <div class="pt-px"><slot /></div>
  </div>
</template>
