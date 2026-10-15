// Existing Cut241 pixel protocol reused for newly reached Cut243 child states.
// Copied from tools/menu-materials-check.mjs inspect(); source retained as reference.
import { writeFileSync } from "node:fs";
export async function auditContrast(p, out, id) {
  const audit = true,
    gpu = true,
    argv = ["--contrast"];
  if (!audit && !argv.includes("--contrast")) return undefined;
  const data = await p.evaluate(() => {
    const root =
      document.querySelector(".sheet-wrap:not(.under) > .sheet") ??
      document.querySelector(".report-sheet");
    const visible = (el) =>
      el.getClientRects().length &&
      !el.closest("[hidden]") &&
      getComputedStyle(el).visibility !== "hidden";
    const controls = [
      ...root.querySelectorAll("button,summary,input:not([type=hidden]),select,textarea"),
    ]
      .filter(visible)
      .map((el) => {
        const r = el.getBoundingClientRect(),
          s = getComputedStyle(el);
        return {
          tag: el.tagName,
          cls: el.className,
          text: (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 60),
          width: r.width,
          height: r.height,
          disabled: el.matches(":disabled"),
          outline: { color: s.outlineColor, width: s.outlineWidth },
        };
      });
    const containers = [
      ...root.querySelectorAll(
        ".sheet-body,.srow,.works-trunk,.wnode,.pkg-panel,.looks,.gold-sheet,.ledger,.runs-list,.hero-hub,.journal-panel",
      ),
    ]
      .filter(visible)
      .map((el) => ({ cls: el.className, overflow: el.scrollWidth - el.clientWidth }));
    const canvas = document.createElement("canvas"),
      ctx = canvas.getContext("2d"),
      samples = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode,
        el = node.parentElement;
      if (!el || !node.textContent.trim() || !visible(el)) continue;
      const range = document.createRange();
      range.selectNode(node);
      const style = getComputedStyle(el);
      let opacity = 1;
      for (let a = el; a; a = a.parentElement) opacity *= Number(getComputedStyle(a).opacity);
      ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const words = node.textContent
        .trim()
        .split(/\s+/)
        .filter((w) => w.length >= 3)
        .slice(0, 6)
        .map((word) => {
          const painted =
            style.textTransform === "uppercase"
              ? word.toUpperCase()
              : style.textTransform === "lowercase"
                ? word.toLowerCase()
                : word;
          const m = ctx.measureText(painted);
          return {
            word: painted,
            width: m.width,
            ascent: m.actualBoundingBoxAscent,
            descent: m.actualBoundingBoxDescent,
          };
        });
      for (const r of range.getClientRects()) {
        if (
          r.width <= 2 ||
          r.height <= 2 ||
          r.x < 0 ||
          r.y < 0 ||
          r.right > innerWidth ||
          r.bottom > innerHeight
        )
          continue;
        let clipped = false;
        for (let a = el.parentElement; a; a = a.parentElement) {
          const s = getComputedStyle(a),
            b = a.getBoundingClientRect();
          if (
            /auto|scroll|hidden|clip/.test(s.overflowY) &&
            (r.y < b.y + a.clientTop || r.bottom > b.y + a.clientTop + a.clientHeight)
          )
            clipped = true;
          if (
            /auto|scroll|hidden|clip/.test(s.overflowX) &&
            (r.x < b.x + a.clientLeft || r.right > b.x + a.clientLeft + a.clientWidth)
          )
            clipped = true;
        }
        if (clipped) continue;
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        if (!hit || !(el === hit || el.contains(hit))) continue;
        samples.push({
          text: node.textContent.trim().slice(0, 100),
          color: style.color,
          opacity,
          inactive: !!el.closest(':disabled,[aria-disabled="true"],.off'),
          cssSize: style.fontSize,
          font: style.fontFamily,
          words,
          rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        });
      }
    }
    return {
      width: innerWidth,
      height: innerHeight,
      dpr: devicePixelRatio,
      material: root.dataset.material ?? "journal",
      controls,
      containers,
      samples,
    };
  });
  if (gpu && argv.includes("--contrast")) {
    writeFileSync(`${out}/${id}-contrast.json`, JSON.stringify(data, null, 2));
    const invisible = await p.addStyleTag({
      content:
        ".sheet-wrap:not(.under) > .sheet *, .report-sheet * {-webkit-text-fill-color:transparent!important;text-shadow:none!important;text-decoration-color:transparent!important}",
    });
    await p.screenshot({ path: `${out}/${id}-background.png` });
    await invisible.evaluate((el) => el.remove());
  }
  return {
    controls: data.controls,
    containers: data.containers,
    visibleTextSamples: data.samples.length,
  };
}
