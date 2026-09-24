(() => {
  const STYLE_ID = "wale-hider-style";
  const CSS = "#wsu-chat-root { display: none !important; }";

  function apply(enabled) {
    const existing = document.getElementById(STYLE_ID);
    if (enabled && !existing) {
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = CSS;
      (document.head || document.documentElement).appendChild(style);
    } else if (!enabled && existing) {
      existing.remove();
    }
  }

  // Initial state (defaults to ON); "enabled" is the pre-1.4 key, read only
  // until the background script has migrated it
  chrome.storage.local.get(["hideChat", "enabled"])
    .then(({ hideChat, enabled }) => apply(hideChat ?? enabled ?? true));

  // React instantly when the switch in the popup changes, in every open tab
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && "hideChat" in changes) {
      apply(changes.hideChat.newValue !== false);
    }
  });
})();