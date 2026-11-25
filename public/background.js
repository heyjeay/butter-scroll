// Chrome only runs content scripts in pages loaded after the extension is installed, updated or reloaded,
// so tabs that were already open (a Reddit tab, say) would stay unsmoothed until refreshed.
// Inject the engine into them right away; content.js tells any older copy in the page to stand down.
const debug = false;
const log = (...a) => { if (debug) console.log('[buttery-smooth bg]', ...a); };

// Right-drag gestures from content.js: a new tab right after this one (drag up), close this one (drag down),
// or switch to the neighbour in the same window, wrapping like Ctrl+Tab (drag left / right)
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!msg || !sender.tab) return;
  const from = sender.tab;
  if (msg.type === 'butter:new-tab') {
    chrome.tabs.create({ windowId: from.windowId, index: from.index + 1, active: true })
      .catch((err) => log('new tab failed', err && err.message));
    return;
  }
  if (msg.type === 'butter:close-tab') {
    chrome.tabs.remove(from.id).catch((err) => log('close failed', err && err.message)); // Ctrl+Shift+T brings it back
    return;
  }
  if (msg.type !== 'butter:switch-tab') return;
  chrome.tabs.query({ windowId: from.windowId }).then((tabs) => {
    tabs.sort((a, b) => a.index - b.index);
    const i = tabs.findIndex((t) => t.id === from.id);
    if (i < 0 || tabs.length < 2) return;
    const to = tabs[(i + (msg.dir > 0 ? 1 : -1) + tabs.length) % tabs.length];
    log('switch', from.id, '->', to.id);
    return chrome.tabs.update(to.id, { active: true });
  }).catch((err) => log('switch failed', err && err.message));
});

chrome.runtime.onInstalled.addListener(async () => {
  const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
  for (const tab of tabs) {
    if (tab.discarded || tab.id === undefined) continue; // a sleeping tab gets the manifest's script when it wakes
    chrome.scripting
      .executeScript({ target: { tabId: tab.id, allFrames: true }, files: ['content.js'] })
      .then(() => log('injected', tab.id), (err) => log('skipped', tab.id, err && err.message)); // e.g. the Web Store
  }
});
