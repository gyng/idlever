/** Exact generated service IDs; unknown art still uses the primitive fallback. */
const SERVICE_ART = new Set([
  "town_service_guild",
  "town_service_pool",
  "town_service_device",
  "town_service_device_active_0",
  "town_service_device_active_1",
  "town_service_station",
]);
export const isHomeServiceArt = (id: string | undefined): boolean => !!id && SERVICE_ART.has(id);
/** Cached code-native ink/wash props. No game state or external atlas dependency. */
export function paintHomeService(
  g: CanvasRenderingContext2D,
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  depth = false,
): boolean {
  if (!isHomeServiceArt(id)) return false;
  g.save();
  g.translate(x, y);
  const rect = (c: string, a: number, b: number, cw: number, ch: number) => {
    g.fillStyle = c;
    g.fillRect(
      Math.round(a),
      Math.round(b),
      Math.max(1, Math.round(cw)),
      Math.max(1, Math.round(ch)),
    );
  };
  const poly = (c: string, p: number[][]) => {
    g.fillStyle = c;
    g.beginPath();
    p.forEach(([a, b], i) =>
      i ? g.lineTo(Math.round(a!), Math.round(b!)) : g.moveTo(Math.round(a!), Math.round(b!)),
    );
    g.closePath();
    g.fill();
  };
  const ellipse = (c: string, cx: number, cy: number, rx: number, ry: number) => {
    for (let yy = Math.ceil(cy - ry); yy <= Math.floor(cy + ry); yy++) {
      const half = rx * Math.sqrt(Math.max(0, 1 - ((yy - cy) / ry) ** 2));
      rect(c, cx - half, yy, half * 2, 1);
    }
  };
  const pigment = (a: number, b: number, cw: number, ch: number, n: number) => {
    for (let i = 0; i < n; i++) {
      const xx = a + (((i * 37 + 11) % 97) / 97) * cw,
        yy = b + (((i * 29 + 7) % 89) / 89) * ch;
      rect(i % 3 ? "#eadfc512" : "#0d0c142e", xx, yy, 1, 1);
    }
  };
  if (id.includes("_station")) {
    ellipse("#0d0c14", w * 0.5, h * 0.62, w * 0.49, h * 0.35);
    ellipse("#555864", w * 0.5, h * 0.48, w * 0.44, h * 0.36);
    ellipse("#2b3350", w * 0.5, h * 0.48, w * 0.33, h * 0.22);
    rect("#7088a0", w * 0.28, h * 0.47, w * 0.43, 1);
    rect("#a4bcd6", w * 0.47, h * 0.26, 1, h * 0.5);
  } else if (id.includes("_guild")) {
    poly("#0d0c14", [
      [2, h - 1],
      [w - 2, h - 1],
      [w - 4, h * 0.36],
      [w * 0.68, 2],
      [w * 0.34, 0],
      [3, h * 0.27],
    ]);
    poly("#444757", [
      [4, h * 0.34],
      [w * 0.34, 3],
      [w * 0.67, 4],
      [w - 5, h * 0.39],
      [w * 0.7, h * 0.5],
      [6, h * 0.5],
    ]);
    poly("#626476", [
      [6, h * 0.3],
      [w * 0.34, 4],
      [w * 0.66, 5],
      [w * 0.42, h * 0.36],
    ]);
    for (let i = 0; i < 5; i++)
      rect("#2b3350", w * 0.18 + i * w * 0.12, h * 0.26 + (i % 2), w * 0.1, 1);
    poly("#655d57", [
      [7, h * 0.48],
      [w * 0.69, h * 0.45],
      [w * 0.69, h - 3],
      [7, h - 3],
    ]);
    poly("#353442", [
      [w * 0.69, h * 0.45],
      [w - 5, h * 0.38],
      [w - 5, h - 5],
      [w * 0.69, h - 3],
    ]);
    pigment(8, h * 0.5, w * 0.6, h * 0.36, 46);
    for (let row = 0; row < 3; row++) rect("#353442", 8, h * 0.55 + row * 6, w * 0.55, 1);
    rect("#0d0c14", w * 0.19, h * 0.56, w * 0.2, h * 0.38);
    rect("#4d6c99", w * 0.21, h * 0.58, w * 0.16, h * 0.19);
    rect("#b3a59a", w * 0.45, h * 0.56, w * 0.17, h * 0.2);
    rect("#eadfc5", w * 0.47, h * 0.59, w * 0.12, 1);
    rect("#353442", w * 0.49, h * 0.63, w * 0.07, 1);
    rect("#2b3350", w * 0.14, h * 0.74, w * 0.55, 4);
    rect("#b3a59a", w * 0.13, h * 0.74, w * 0.57, 1);
    rect("#918477", w * 0.18, h - 3, w * 0.42, 2);
    rect("#e8923a", w * 0.76, h * 0.51, 2, 3);
    rect("#eadfc5", w * 0.77, h * 0.51, 1, 1);
    poly("#4d6c99", [
      [w * 0.72, h * 0.1],
      [w * 0.89, h * 0.12],
      [w * 0.87, h * 0.38],
      [w * 0.75, h * 0.36],
    ]);
    rect("#a4bcd6", w * 0.78, h * 0.19, 2, 5);
  } else if (id.includes("_pool")) {
    ellipse("#0d0c14", w * 0.5, h * 0.64, w * 0.49, h * 0.34);
    ellipse("#555864", w * 0.5, h * 0.54, w * 0.47, h * 0.38);
    ellipse("#909098", w * 0.5, h * 0.45, w * 0.44, h * 0.33);
    ellipse("#1c1b2b", w * 0.5, h * 0.46, w * 0.35, h * 0.25);
    ellipse("#2b3350", w * 0.5, h * 0.48, w * 0.33, h * 0.23);
    ellipse("#4d6c99", w * 0.46, h * 0.49, w * 0.29, h * 0.17);
    ellipse("#46617b", w * 0.59, h * 0.53, w * 0.21, h * 0.11);
    rect("#a4bcd6", w * 0.28, h * 0.43, w * 0.14, 1);
    rect("#7088a0", w * 0.56, h * 0.57, w * 0.18, 1);
    for (let i = 0; i < 9; i++) {
      const px = w * (0.12 + i * 0.095);
      rect(i % 2 ? "#1c1b2b" : "#c0b8a9", px, h * 0.67 + Math.sin(i) * 2, 1, h * 0.1);
    }
    pigment(3, h * 0.59, w - 6, h * 0.28, 24);
    rect("#655d57", w * 0.04, h * 0.62, 3, h * 0.2);
    rect("#67775e", w * 0.02, h * 0.53, 2, 3);
    rect("#67775e", w * 0.93, h * 0.58, 2, 2);
  } else if (id.includes("_device")) {
    ellipse("#0d0c14", w * 0.5, h * 0.92, w * 0.46, h * 0.08);
    poly("#555864", [
      [3, h * 0.86],
      [w * 0.21, h * 0.72],
      [w * 0.8, h * 0.72],
      [w - 2, h * 0.87],
      [w * 0.81, h - 1],
      [w * 0.17, h - 1],
    ]);
    poly("#2b3350", [
      [w * 0.25, h * 0.76],
      [w * 0.22, h * 0.2],
      [w * 0.5, 1],
      [w * 0.77, h * 0.2],
      [w * 0.73, h * 0.76],
    ]);
    poly("#727487", [
      [w * 0.17, h * 0.77],
      [w * 0.14, h * 0.17],
      [w * 0.34, h * 0.04],
      [w * 0.36, h * 0.16],
      [w * 0.29, h * 0.25],
      [w * 0.31, h * 0.76],
    ]);
    poly("#444757", [
      [w * 0.7, h * 0.76],
      [w * 0.71, h * 0.24],
      [w * 0.64, h * 0.13],
      [w * 0.66, h * 0.04],
      [w * 0.86, h * 0.18],
      [w * 0.83, h * 0.77],
    ]);
    poly("#a4bcd6", [
      [w * 0.17, h * 0.17],
      [w * 0.33, h * 0.04],
      [w * 0.68, h * 0.04],
      [w * 0.82, h * 0.18],
      [w * 0.7, h * 0.21],
      [w * 0.63, h * 0.12],
      [w * 0.36, h * 0.12],
      [w * 0.29, h * 0.21],
    ]);
    rect("#1c1b2b", w * 0.34, h * 0.25, w * 0.31, h * 0.49);
    rect("#4d6c99", w * 0.39, h * 0.31, w * 0.22, h * 0.36);
    rect("#637d97", w * 0.42, h * 0.33, 1, h * 0.3);
    rect("#0d0c14", w * 0.38, h * 0.74, w * 0.23, 2);
    rect("#a4bcd6", w * 0.28, h * 0.81, w * 0.43, 1);
    rect("#e8923a", w * 0.12, h * 0.7, 2, 3);
    rect("#e8923a", w * 0.86, h * 0.7, 2, 3);
    if (id.includes("_active")) {
      const beat = id.endsWith("_1") ? 1 : 0;
      rect("#eadfc5", w * 0.45, h * (beat ? 0.45 : 0.52), w * 0.1, 1);
      rect("#a4bcd6", w * 0.49, h * 0.4, 1, h * 0.19);
    }
    pigment(w * 0.14, h * 0.14, w * 0.7, h * 0.67, 28);
  }
  if (depth) {
    // Matte detail stays inside existing pigment and preserves the silhouette alpha.
    g.globalCompositeOperation = "source-atop";
    const line = (c: string, ax: number, ay: number, bx: number, by: number) => {
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay))));
      for (let i = 0; i <= steps; i++)
        rect(c, ax + ((bx - ax) * i) / steps, ay + ((by - ay) * i) / steps, 1, 1);
    };
    if (id === "town_service_guild") {
      // A steep gable, overlapping slate courses and the darker receding roof.
      poly("#2b3350", [
        [5, h * 0.49],
        [w * 0.34, 2],
        [w * 0.69, h * 0.47],
      ]);
      poly("#353442", [
        [w * 0.34, 2],
        [w * 0.67, 4],
        [w - 5, h * 0.39],
        [w * 0.69, h * 0.47],
      ]);
      for (let row = 0; row < 5; row++) {
        const yy = h * (0.13 + row * 0.066),
          half = w * (0.035 + row * 0.044);
        line(row % 2 ? "#4d5268" : "#555864", w * 0.34 - half, yy, w * 0.34 + half * 1.23, yy + 1);
        for (let tile = 0; tile < row + 1; tile++)
          rect("#1c1b2b", w * 0.34 - half + tile * 7 + (row % 2) * 3, yy, 1, 2);
        line(
          "#252737",
          w * (0.42 + row * 0.035),
          h * (0.1 + row * 0.066),
          w * (0.72 + row * 0.04),
          h * (0.14 + row * 0.052),
        );
      }
      line("#918477", w * 0.34, 2, w * 0.67, 4);
      line("#655d57", 5, h * 0.49, w * 0.34, 2);
      line("#0d0c14", w * 0.34, 3, w * 0.69, h * 0.47);
      line("#918477", w * 0.35, 4, w * 0.68, h * 0.46);
      // Warm plaster held by timber, with braces and a stone foundation.
      poly("#918477", [
        [8, h * 0.51],
        [w * 0.68, h * 0.49],
        [w * 0.68, h * 0.93],
        [8, h * 0.93],
      ]);
      poly("#655d57", [
        [w * 0.69, h * 0.49],
        [w - 5, h * 0.4],
        [w - 5, h * 0.88],
        [w * 0.69, h * 0.93],
      ]);
      pigment(9, h * 0.53, w * 0.52, h * 0.34, 48);
      for (const xx of [8, w * 0.42, w * 0.68]) {
        rect("#353442", xx, h * 0.5, 2, h * 0.43);
        rect("#655d57", xx, h * 0.51, 1, h * 0.4);
      }
      rect("#353442", 7, h * 0.5, w * 0.59, 2);
      rect("#353442", 8, h * 0.76, w * 0.56, 2);
      line("#353442", 9, h * 0.55, w * 0.28, h * 0.74);
      line("#353442", w * 0.45, h * 0.55, w * 0.65, h * 0.74);
      line("#655d57", 10, h * 0.55, w * 0.28, h * 0.72);
      // Recessed arched door, small notice board and side window/lamp.
      ellipse("#655d57", w * 0.26, h * 0.65, w * 0.12, h * 0.15);
      ellipse("#0d0c14", w * 0.26, h * 0.67, w * 0.095, h * 0.13);
      rect("#0d0c14", w * 0.17, h * 0.66, w * 0.19, h * 0.29);
      rect("#45404a", w * 0.19, h * 0.69, w * 0.15, h * 0.24);
      for (let i = 0; i < 3; i++) rect("#2b2939", w * 0.2 + i * 3, h * 0.7, 1, h * 0.21);
      rect("#b3a59a", w * 0.32, h * 0.82, 1, 1);
      rect("#353442", w * 0.48, h * 0.58, w * 0.16, h * 0.14);
      rect("#b3a59a", w * 0.5, h * 0.6, w * 0.12, h * 0.1);
      rect("#eadfc5", w * 0.51, h * 0.61, w * 0.09, 1);
      rect("#655d57", w * 0.54, h * 0.65, w * 0.06, 1);
      rect("#0d0c14", w * 0.76, h * 0.6, w * 0.1, h * 0.17);
      rect("#4d6c99", w * 0.78, h * 0.62, w * 0.07, h * 0.12);
      rect("#555864", w * 0.81, h * 0.63, 1, h * 0.1);
      rect("#e8923a", w * 0.76, h * 0.51, 2, 3);
      rect("#eadfc5", w * 0.77, h * 0.51, 1, 1);
      for (let row = 0; row < 2; row++)
        for (let block = 0; block < 6; block++) {
          const xx = 8 + block * 6 + (row % 2) * 3,
            yy = h * 0.91 + row * 2;
          rect((block + row) % 2 ? "#655d57" : "#777377", xx, yy, 5, 2);
          rect("#353442", xx + 5, yy, 1, 2);
          rect("#918477", xx, yy, 4, 1);
        }
    } else if (id === "town_service_pool") {
      // Quiet stepped water bands; the far side is deeper and darker.
      ellipse("#353442", w * 0.5, h * 0.64, w * 0.43, h * 0.24);
      ellipse("#1c1b2b", w * 0.5, h * 0.46, w * 0.35, h * 0.25);
      ellipse("#2b3350", w * 0.5, h * 0.49, w * 0.33, h * 0.22);
      ellipse("#46617b", w * 0.48, h * 0.53, w * 0.29, h * 0.16);
      ellipse("#4d6c99", w * 0.49, h * 0.56, w * 0.23, h * 0.11);
      rect("#7088a0", w * 0.28, h * 0.48, w * 0.12, 1);
      rect("#557280", w * 0.57, h * 0.56, w * 0.1, 1);
      rect("#637d97", w * 0.39, h * 0.6, 3, 1);
      // Interlocking wedge stones describe the oval rather than a plain ring.
      for (let block = 0; block < 14; block++) {
        const a = (block * Math.PI) / 7 + 0.045,
          b = ((block + 1) * Math.PI) / 7 - 0.045;
        const outer = (angle: number) => [
          w * (0.5 + 0.44 * Math.cos(angle)),
          h * (0.45 + 0.33 * Math.sin(angle)),
        ];
        const inner = (angle: number) => [
          w * (0.5 + 0.35 * Math.cos(angle)),
          h * (0.46 + 0.25 * Math.sin(angle)),
        ];
        poly(block % 3 === 0 ? "#909098" : block % 2 ? "#777a87" : "#80818a", [
          outer(a),
          outer(b),
          inner(b),
          inner(a),
        ]);
        const oa = outer(a),
          ia = inner(a);
        line("#434350", oa[0]!, oa[1]!, ia[0]!, ia[1]!);
        const ob = outer(b);
        if (Math.sin((a + b) * 0.5) < 0.2) line("#b3a59a", oa[0]!, oa[1]!, ob[0]!, ob[1]!);
        else {
          rect("#434350", oa[0]!, oa[1]! + 1, 2, 2);
          rect("#b3a59a", ia[0]!, ia[1]!, 2, 1);
        }
      }
      for (let block = 0; block < 7; block++) {
        const xx = w * (0.18 + block * 0.095),
          yy = h * (0.8 - Math.abs(block - 3) * 0.015);
        rect(block % 2 ? "#555864" : "#655d68", xx, yy, 4, 2);
        rect("#353442", xx + 4, yy, 1, 2);
        rect("#909098", xx, yy, 3, 1);
      }
      rect("#67775e", w * 0.14, h * 0.66, 3, 1);
      rect("#555e50", w * 0.81, h * 0.66, 2, 2);
    }
  }
  g.restore();
  return true;
}
