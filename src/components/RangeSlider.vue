<script setup>
const model = defineModel({ type: Number, required: true });
defineProps({
  label: { type: String, required: true },
  min: { type: Number, required: true },
  max: { type: Number, required: true },
  step: { type: Number, default: 1 },
  value: { type: String, required: true }, // the formatted reading
  low: { type: String, default: '' },
  high: { type: String, default: '' },
});
</script>

<template>
  <div class="px-4 py-3">
    <div class="flex items-baseline justify-between">
      <label class="text-[13px] font-medium text-ink">{{ label }}</label>
      <span class="text-xs font-medium tabular-nums text-muted">{{ value }}</span>
    </div>
    <input
      v-model.number="model"
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :aria-label="label"
      class="range mt-2.5 w-full"
      :style="{ '--fill': `${((model - min) / (max - min)) * 100}%` }"
    />
    <div v-if="low || high" class="mt-1 flex justify-between text-[11px] text-muted">
      <span>{{ low }}</span><span>{{ high }}</span>
    </div>
  </div>
</template>
