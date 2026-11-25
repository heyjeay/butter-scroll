<script setup>
import { computed } from 'vue';
import RangeSlider from '../components/RangeSlider.vue';
import { useSettings } from '../composables/useSettings';

const { settings, defaults } = useSettings();
const isDefault = computed(() => settings.smoothness === defaults.smoothness && settings.stepScale === defaults.stepScale);
function reset() {
  settings.smoothness = defaults.smoothness;
  settings.stepScale = defaults.stepScale;
}
const lines = Array.from({ length: 40 }, (_, i) => i + 1);
</script>

<template>
  <div class="flex flex-col">
    <header class="flex items-center gap-1 px-2 pb-2 pt-3">
      <RouterLink
        to="/"
        aria-label="Back"
        class="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-card hover:text-ink focus-visible:outline-2 focus-visible:outline-butter-deep"
      >
        <svg viewBox="0 0 16 16" class="size-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3 5 8l5 5" /></svg>
      </RouterLink>
      <h1 class="text-[15px] font-semibold">Tune the glide</h1>
    </header>

    <section class="mx-3 divide-y divide-line rounded-xl border border-line bg-card">
      <RangeSlider
        v-model="settings.smoothness"
        label="Smoothness"
        :min="40" :max="300" :step="5"
        :value="`${settings.smoothness} ms`"
        low="Snappy" high="Floaty"
      />
      <RangeSlider
        v-model="settings.stepScale"
        label="Distance per notch"
        :min="0.5" :max="2.5" :step="0.1"
        :value="`${settings.stepScale.toFixed(1)}×`"
        low="Short" high="Long"
      />
    </section>

    <h2 class="px-5 pb-1.5 pt-4 text-xs font-medium text-muted">Try it here</h2>
    <div class="mx-3 h-40 overflow-y-auto rounded-xl border border-line bg-card">
      <p
        v-for="n in lines" :key="n"
        class="m-0 border-b border-line px-4 py-2 text-xs text-muted last:border-b-0"
      >
        Line {{ n }}: scroll past the ends to feel the bounce
      </p>
    </div>

    <div class="flex items-center justify-between px-4 pb-4 pt-3">
      <span class="text-[11px] text-muted">krp_phone feel: 110 ms · 1.0×</span>
      <button
        type="button"
        class="rounded-lg bg-butter px-3 py-1.5 text-xs font-semibold text-butter-ink transition-[filter,opacity] hover:brightness-95 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-butter-deep"
        :disabled="isDefault"
        @click="reset"
      >
        Reset
      </button>
    </div>
  </div>
</template>
