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
  if (!settings.enabled) return 'Buttery Smooth is off everywhere.';
  return siteEnabled.value ? 'Smooth here. Changes apply right away.' : 'Paused on this site.';
});
</script>

<template>
  <div class="flex flex-col">
    <header class="flex items-center gap-3 px-4 pb-3 pt-4">
      <img src="/icons/48.png" alt="" class="size-8" />
      <div class="flex-1">
        <h1 class="text-[15px] font-semibold leading-5">Buttery Smooth</h1>
        <p class="text-xs text-muted">Phone-smooth scrolling</p>
      </div>
      <SwitchToggle v-model="settings.enabled" label="Buttery Smooth on everywhere" />
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
      <SettingRow title="Swipe to switch tabs" hint="Hold the right mouse button and drag left or right to go to the tab on that side. A plain right-click still opens the menu.">
        <SwitchToggle v-model="settings.swipeTabs" label="Swipe to switch tabs" :disabled="!settings.enabled" />
      </SettingRow>
      <SettingRow v-if="settings.swipeTabs" title="Butter trail" hint="A streak of melting butter follows the swipe. Off: just the tab pill.">
        <SwitchToggle v-model="settings.swipeTrail" label="Butter trail" :disabled="!settings.enabled" />
      </SettingRow>
      <SettingRow title="Smooth every wheel" hint="Includes high-res and free-spin mouse wheels and trackpads. Off: only classic notched wheels are smoothed.">
        <SwitchToggle v-model="settings.trackpad" label="Smooth every wheel" :disabled="!settings.enabled" />
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

    <p class="px-5 pb-1 pt-3 text-[11px] leading-4 text-muted">
      Sites with their own smooth scrolling, maps and scroll-snap carousels keep theirs.
    </p>

    <section class="mx-3 mb-4 mt-2 rounded-xl border border-line bg-card">
      <SettingRow title="Debug log" hint="Not smoothing somewhere? Turn this on, scroll there, then open the console (F12) to see why.">
        <SwitchToggle v-model="settings.debug" label="Debug log" />
      </SettingRow>
    </section>
  </div>
</template>
