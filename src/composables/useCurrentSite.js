import { computed, ref } from 'vue';
import { useSettings } from './useSettings';

// pages Chrome never lets an extension script run on
const BLOCKED = /^(chrome|chrome-extension|edge|about|devtools|view-source):/;
const STORE_HOSTS = ['chromewebstore.google.com', 'chrome.google.com'];

const site = ref(null); // { host, supported }

async function detect() {
  let url = '';
  try {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      url = (tab && tab.url) || '';
    } else url = location.href; // Vite dev server
  } catch (err) { url = ''; }
  if (!url) { site.value = { host: '', supported: false }; return; }
  const u = new URL(url);
  const supported = !BLOCKED.test(u.protocol) && !STORE_HOSTS.includes(u.hostname) && u.protocol !== 'file:';
  site.value = { host: u.hostname, supported };
}
detect();

export function useCurrentSite() {
  const { settings } = useSettings();
  const siteEnabled = computed({
    get: () => !!site.value && !settings.disabledSites.includes(site.value.host),
    set: (on) => {
      if (!site.value || !site.value.host) return;
      const list = settings.disabledSites.filter((h) => h !== site.value.host);
      if (!on) list.push(site.value.host);
      settings.disabledSites = list;
    },
  });
  return { site, siteEnabled };
}
