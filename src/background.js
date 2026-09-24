const SIZES = [16, 32];
let icons = null;

// Build colour and greyscale versions of the icon once, from icon-96.png
async function loadIcons() {
  if (icons) return icons;
  const blob = await (await fetch(chrome.runtime.getURL("icons/icon-96.png"))).blob();
  const bmp = await createImageBitmap(blob);
  const on = {}, off = {};
  for (const s of SIZES) {
    const ctx = new OffscreenCanvas(s, s).getContext("2d");
    ctx.drawImage(bmp, 0, 0, s, s);
    const img = ctx.getImageData(0, 0, s, s);
    on[s] = img;
    const grey = new ImageData(new Uint8ClampedArray(img.data), s, s);
    const d = grey.data;
    for (let i = 0; i < d.length; i += 4) {
      const y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      d[i] = d[i + 1] = d[i + 2] = y;
      d[i + 3] = d[i + 3] * 0.45; // fade it as well
    }
    off[s] = grey;
  }
  icons = { on, off };
  return icons;
}

async function getEnabled() {
  const { enabled = true } = await chrome.storage.local.get("enabled");
  return enabled;
}

async function render(enabled) {
  const { on, off } = await loadIcons();
  await chrome.action.setIcon({ imageData: enabled ? on : off });
  await chrome.action.setBadgeText({ text: enabled ? "ON" : "OFF" });
  await chrome.action.setBadgeBackgroundColor({ color: enabled ? "#2e7d32" : "#757575" });
  await chrome.action.setTitle({
    title: enabled
      ? "Moodle chat hider: ON (click to switch off)"
      : "Moodle chat hider: OFF (click to switch on)"
  });
}

chrome.action.onClicked.addListener(async () => {
  const enabled = !(await getEnabled());
  await chrome.storage.local.set({ enabled });
  await render(enabled);
});

chrome.runtime.onInstalled.addListener(async () => render(await getEnabled()));
chrome.runtime.onStartup.addListener(async () => render(await getEnabled()));
