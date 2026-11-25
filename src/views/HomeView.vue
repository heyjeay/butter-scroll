<script setup>
import { computed } from 'vue';
import SwitchToggle from '../components/SwitchToggle.vue';
import SettingRow from '../components/SettingRow.vue';
import { useSettings } from '../composables/useSettings';
import { useCurrentSite } from '../composables/useCurrentSite';

const { settings } = useSettings();
const { site, siteEnabled } = useCurrentSite();

const siteStatus = computed(() => {
  if (!site.value) return '';
  if (!site.value.supported) return 'Chrome keeps extensions off this page.';
  if (!settings.enabled) return 'Butter Scroll is off everywhere.';
  return siteEnabled.value ? 'Smooth here. Changes apply right away.' : 'Paused on this site.';
});
</script>

<template>
  <div class="flex flex-col">
    <header class="flex items-center gap-3 px-4 pb-3 pt-4">
      <img src="/icons/48.png" alt="" class="size-8" />
      <div class="flex-1">
        <h1 class="text-[15px] font-semibold leading-5">Butter Scroll</h1>
        <p class="text-xs text-muted">Phone-smooth scrolling</p>
      </div>
      <SwitchToggle v-model="settings.enabled" label="Butter Scroll on everywhere" />
    </header>

    <section class="mx-3 rounded-xl border border-line bg-card">
      <SettingRow :title="site && site.host ? site.host : 'This page'" :hint="siteStatus">
        <SwitchToggle
          v-model="siteEnabled"
          label="Smooth scrolling on this site"
          :disabled="!site || !site.supported || !settings.enabled"
        />
      </SettingRow>
    </section>

    <h2 class="px-5 pb-1.5 pt-4 text-xs font-medium text-muted">Feel</h2>
    <section class="mx-3 divide-y divide-line rounded-xl border border-line bg-card" :class="{ 'opacity-50': !settings.enabled }">
      <SettingRow title="Rubber-band ends" hint="Stretches a little past the top and bottom, then springs back.">
        <SwitchToggle v-model="settings.bounce" label="Rubber-band ends" :disabled="!settings.enabled" />
      </SettingRow>
      <SettingRow title="Drag to scroll" hint="Hold the mouse and throw the page like a phone. Text selection is off while this is on.">
        <SwitchToggle v-model="settings.dragScroll" label="Drag to scroll" :disabled="!settings.enabled" />
      </SettingRow>
      <SettingRow title="Smooth trackpads too" hint="Trackpads already glide on their own. Turn on to use this feel instead.">
        <SwitchToggle v-model="settings.trackpad" label="Smooth trackpads too" :disabled="!settings.enabled" />
      </SettingRow>
      <RouterLink
        to="/tune"
        class="flex items-center gap-3 rounded-b-xl px-4 py-3 transition-colors hover:bg-bg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-butter-deep"
      >
        <span class="flex-1 text-[13px] font-medium">Tune the glide</span>
        <span class="text-xs tabular-nums text-muted">{{ settings.smoothness }} ms · {{ settings.stepScale.toFixed(1) }}×</span>
        <svg viewBox="0 0 16 16" class="size-3.5 text-muted" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m6 3 5 5-5 5" /></svg>
      </RouterLink>
    </section>

    <p class="px-5 pb-4 pt-3 text-[11px] leading-4 text-muted">
      Sites with their own smooth scrolling, maps and scroll-snap carousels keep theirs.
    </p>
  </div>
</template>
