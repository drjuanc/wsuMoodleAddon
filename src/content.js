(() => {
  const TEXT = /chat to wale/i;
  const targets = new Set();
  let hidden = true;

  // Outermost fixed/sticky ancestor of a node
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

  function scan() {
    // 1. Find the widget by its label
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let t;
    while ((t = walker.nextNode())) {
      if (TEXT.test(t.nodeValue)) {
        const box = topFixed(t.parentElement);
        if (box) targets.add(box);
      }
    }
    // 2. Catch companion floating buttons overlapping it (the orange tab)
    const rects = [...targets].map((el) => el.getBoundingClientRect());
    if (rects.length) {
      document.querySelectorAll("body div, body a, body button, body iframe").forEach((el) => {
        if (el.id === "wale-toggle" || el.closest("#page-footer, .btn-footer-popover")) return;
        if (getComputedStyle(el).position !== "fixed") return;
        const r = el.getBoundingClientRect();
        if (rects.some((w) => overlaps(r, w))) targets.add(el);
      });
    }
    apply();
  }

  function apply() {
    targets.forEach((el) =>
      el.style.setProperty("display", hidden ? "none" : "", "important")
    );
    toggle.textContent = hidden ? "💬 Show chat" : "✕ Hide chat";
  }

  // Small restore pill, bottom-left, out of Moodle's way
  const toggle = document.createElement("button");
  toggle.id = "wale-toggle";
  Object.assign(toggle.style, {
    position: "fixed", left: "8px", bottom: "8px", zIndex: 2147483647,
    padding: "4px 10px", fontSize: "12px", borderRadius: "12px",
    border: "1px solid #999", background: "#fff", opacity: "0.6", cursor: "pointer"
  });
  toggle.onclick = () => { hidden = !hidden; apply(); };
  document.body.appendChild(toggle);

  // Widgets often load late, so keep watching (throttled)
  let timer;
  new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(scan, 300);
  }).observe(document.body, { childList: true, subtree: true });

  scan();
})();