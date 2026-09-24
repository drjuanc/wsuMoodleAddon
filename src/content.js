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

  // Initial state (defaults to ON)
  chrome.storage.local.get("enabled").then(({ enabled = true }) => apply(enabled));

  // React instantly when the toolbar icon is clicked, in every open tab
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && "enabled" in changes) {
      apply(changes.enabled.newValue !== false);
    }
  });
})();