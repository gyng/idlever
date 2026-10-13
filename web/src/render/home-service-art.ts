/** Cached code-native ink/wash props. No game state or external atlas dependency. */
export function paintHomeService(
  g: CanvasRenderingContext2D,
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  if (!id.startsWith("town_service_")) return false;
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
  g.restore();
  return true;
}
