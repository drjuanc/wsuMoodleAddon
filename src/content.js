(() => {
  const TEXT = /chat to wale/i;
  const original = new Map(); // element -> its original inline display value
  let enabled = true;

  const topFixed = (el) => {
    let found = null;
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      const pos = getComputedStyle(n).position;
      if (pos === "fixed" || pos === "sticky") found = n;
    }
    return found;
  };

  const overlaps = (a, b) =>
    !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);

  const track = (el) => {
    if (!original.has(el)) {
      original.set(el, {
        value: el.style.getPropertyValue("display"),
        priority: el.style.getPropertyPriority("display")
      });
    }
  };

  function scan() {
    const found = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let t;
    while ((t = walker.nextNode())) {
      if (TEXT.test(t.nodeValue)) {
        const box = topFixed(t.parentElement);
        if (box) { track(box); found.push(box); }
      }
    }
    // Companion floating buttons overlapping the widget (the orange tab)
    const rects = found.map((el) => el.getBoundingClientRect());
    if (rects.length) {
      document.querySelectorAll("body div, body a, body button, body iframe").forEach((el) => {
        if (el.closest("#page-footer, .btn-footer-popover")) return;
        if (getComputedStyle(el).position !== "fixed") return;
        const r = el.getBoundingClientRect();
        if (rects.some((w) => overlaps(r, w))) track(el);
      });
    }
    apply();
  }

  function apply() {
    original.forEach((orig, el) => {
      if (enabled) {
        el.style.setProperty("display", "none", "important");
      } else if (orig.value) {
        el.style.setProperty("display", orig.value, orig.priority);
      } else {
        el.style.removeProperty("display");
      }
    });
  }

  // React instantly when the toolbar icon is clicked (in any tab)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && "enabled" in changes) {
      enabled = changes.enabled.newValue !== false;
      enabled ? scan() : apply();
    }
  });

  // Widgets often load late, so keep watching (throttled, only while ON)
  let timer;
  new MutationObserver(() => {
    if (!enabled) return;
    clearTimeout(timer);
    timer = setTimeout(scan, 300);
  }).observe(document.body, { childList: true, subtree: true });

  chrome.storage.local.get("enabled").then(({ enabled: e = true }) => {
    enabled = e;
    if (enabled) scan();
  });
})();
