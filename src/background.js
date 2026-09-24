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

const NAME = "WSU Moodle Helper";

async function getState() {
  const { hideChat = true, cleanPaste = true } =
    await chrome.storage.local.get(["hideChat", "cleanPaste"]);
  return { hideChat, cleanPaste };
}

// Colour icon if at least one feature is on; badge shows how many
async function render() {
  const { hideChat, cleanPaste } = await getState();
  const count = hideChat + cleanPaste;
  const { on, off } = await loadIcons();
  const active = [hideChat && "chat widget hidden", cleanPaste && "Word paste cleaning"].filter(Boolean);
  await chrome.action.setIcon({ imageData: count ? on : off });
  await chrome.action.setBadgeText({ text: count ? String(count) : "OFF" });
  await chrome.action.setBadgeBackgroundColor({
    color: count === 2 ? "#2e7d32" : count === 1 ? "#f59e0b" : "#757575"
  });
  await chrome.action.setTitle({
    title: count ? `${NAME}\nOn: ${active.join(", ")}` : `${NAME}\nBoth features are off`
  });
}

// Up to 1.3 a single "enabled" key controlled everything
async function migrate() {
  const { enabled } = await chrome.storage.local.get("enabled");
  if (enabled === undefined) return;
  await chrome.storage.local.set({ hideChat: enabled, cleanPaste: enabled });
  await chrome.storage.local.remove("enabled");
}

chrome.runtime.onInstalled.addListener(async () => {
  await migrate();
  await render();
});
chrome.runtime.onStartup.addListener(render);

// The popup writes to storage; keep the icon in step
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && ("hideChat" in changes || "cleanPaste" in changes)) render();
});
