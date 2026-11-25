// Chrome only runs content scripts in pages loaded after the extension is installed, updated or reloaded,
// so tabs that were already open (a Reddit tab, say) would stay unsmoothed until refreshed.
// Inject the engine into them right away; content.js tells any older copy in the page to stand down.
const debug = false;
const log = (...a) => { if (debug) console.log('[butter-scroll bg]', ...a); };

chrome.runtime.onInstalled.addListener(async () => {
  const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
  for (const tab of tabs) {
    if (tab.discarded || tab.id === undefined) continue; // a sleeping tab gets the manifest's script when it wakes
    chrome.scripting
      .executeScript({ target: { tabId: tab.id, allFrames: true }, files: ['content.js'] })
      .then(() => log('injected', tab.id), (err) => log('skipped', tab.id, err && err.message)); // e.g. the Web Store
  }
});
