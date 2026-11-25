import { reactive, ref, watch } from 'vue';
import { DEFAULTS } from '../settings';

const debug = false;
const log = (...a) => { if (debug) console.log('[butter-scroll popup]', ...a); };

// chrome.storage.sync inside the extension; localStorage when the popup runs on the Vite dev server
const store = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync;
const LOCAL_KEY = 'butter-scroll-settings';

const settings = reactive({ ...DEFAULTS, disabledSites: [] });
const ready = ref(false);
let lastSaved = '';
let timer = 0;
let lastWrite = 0;

async function load() {
  let stored = {};
  try {
    stored = store ? await store.get(DEFAULTS) : JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
  } catch (err) { log('load failed', err); }
  Object.assign(settings, { ...DEFAULTS, ...stored });
  lastSaved = JSON.stringify(settings);
  ready.value = true;
}

function write() {
  clearTimeout(timer);
  timer = 0;
  const json = JSON.stringify(settings);
  if (json === lastSaved) return;
  lastSaved = json;
  lastWrite = Date.now();
  log('save', json);
  try {
    if (store) store.set(JSON.parse(json));
    else localStorage.setItem(LOCAL_KEY, json);
  } catch (err) { log('save failed', err); }
}

// a toggle saves at once; a slider being dragged saves at most every 250 ms (storage.sync allows 120 writes a minute)
function save() {
  const wait = 250 - (Date.now() - lastWrite);
  if (wait <= 0) write();
  else if (!timer) timer = setTimeout(write, wait);
}

watch(settings, () => { if (ready.value) save(); }, { deep: true });
// the popup closes the moment it loses focus: don't lose a pending slider value
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') write(); });

load();

export function useSettings() {
  return { settings, ready, defaults: DEFAULTS };
}
