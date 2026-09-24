const KEYS = ["hideChat", "cleanPaste"];

const { name, version } = chrome.runtime.getManifest();
document.getElementById("name").textContent = name;
document.getElementById("version").textContent = `${name} v${version}`;

// Both default to ON; "enabled" is the pre-1.4 key, in case migration has not run yet
chrome.storage.local.get([...KEYS, "enabled"]).then((stored) => {
  for (const key of KEYS) {
    const input = document.getElementById(key);
    input.checked = stored[key] ?? stored.enabled ?? true;
    // Applies at once: content scripts and the toolbar icon listen for storage changes
    input.addEventListener("change", () => chrome.storage.local.set({ [key]: input.checked }));
  }
});
