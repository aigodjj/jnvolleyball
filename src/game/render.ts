import { BALL_R, GROUND, GameState, H, NET_H, NET_TOP, NET_W, NET_X, SPEED, W } from "./engine";
import { CharId, NATURAL_FACING, Sprites } from "./sprites";

export interface RenderInfo {
  sprites: Sprites | null;
  chars: [CharId, CharId];
  names: [string, string];
  labels: { ready: string; point: string; firstTo: string };
  tags: [string, string]; // e.g. "P1", "CPU"
}

let bg: HTMLCanvasElement | null = null;

function block(c: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number) {
  c.fillStyle = color;
  c.fillRect(x, y, w, h);
}

function makeBackground(): HTMLCanvasElement {
  const S = 2;
  const cv = document.createElement("canvas");
  cv.width = W * S;
  cv.height = H * S;
  const c = cv.getContext("2d")!;
  c.scale(S, S);
  c.imageSmoothingEnabled = false;

  // stepped sky
  const sky = ["#3f8fe8", "#4a9cee", "#5aaaf2", "#6eb8f5", "#84c6f8", "#9cd4fa", "#b4e1fc", "#cdeeff"];
  const bandH = 260 / sky.length;
  sky.forEach((col, i) => block(c, col, 0, i * bandH, W, bandH + 1));

  // sun
  c.fillStyle = "#fff3a8";
  c.beginPath();
  c.arc(650, 90, 46, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#ffe066";
  c.beginPath();
  c.arc(650, 90, 34, 0, Math.PI * 2);
  c.fill();

  // pixel clouds
  const cloud = (x: number, y: number, s: number) => {
    c.fillStyle = "#ffffff";
    block(c, "#ffffff", x, y + 8 * s, 70 * s, 12 * s);
    block(c, "#ffffff", x + 10 * s, y, 26 * s, 12 * s);
    block(c, "#ffffff", x + 30 * s, y + 4 * s, 26 * s, 12 * s);
    block(c, "#dff3ff", x, y + 18 * s, 70 * s, 3 * s);
  };
  cloud(70, 60, 1.4);
  cloud(300, 120, 1);
  cloud(470, 40, 1.2);
  cloud(700, 170, 0.9);

  // distant mountains (stepped)
  c.fillStyle = "#6fae9a";
  c.beginPath();
  c.moveTo(0, 290);
  const pts = [
    [0, 250], [60, 250], [60, 230], [110, 230], [110, 205], [150, 205], [150, 225], [200, 225], [200, 250],
    [280, 250], [280, 235], [340, 235], [340, 215], [390, 215], [390, 240], [450, 240], [450, 255],
    [560, 255], [560, 232], [620, 232], [620, 208], [670, 208], [670, 230], [740, 230], [740, 250], [800, 250],
  ];
  pts.forEach(([x, y]) => c.lineTo(x, y));
  c.lineTo(800, 300);
  c.lineTo(0, 300);
  c.closePath();
  c.fill();

  // ocean
  block(c, "#2f7fd0", 0, 280, W, 40);
  block(c, "#3b92e0", 0, 280, W, 14);
  for (let i = 0; i < 40; i++) {
    block(c, "#8fd0ff", (i * 97) % W, 290 + ((i * 13) % 26), 18, 2);
  }

  // palms
  const palm = (x: number, y: number, h: number, flip: number) => {
    block(c, "#8a5a2b", x - 4, y - h, 8, h);
    for (let k = 0; k < h; k += 12) block(c, "#6b431c", x - 4, y - k, 8, 2);
    c.fillStyle = "#2e9e4f";
    for (let a = 0; a < 5; a++) {
      const ang = -Math.PI / 2 + (a - 2) * 0.62;
      c.beginPath();
      c.moveTo(x, y - h);
      c.quadraticCurveTo(x + Math.cos(ang) * 34 * flip, y - h + Math.sin(ang) * 40 - 8, x + Math.cos(ang) * 58 * flip, y - h + Math.sin(ang) * 30 + 26);
      c.quadraticCurveTo(x + Math.cos(ang) * 30 * flip, y - h + Math.sin(ang) * 22 + 6, x, y - h + 4);
      c.fill();
    }
  };
  palm(40, 330, 120, 1);
  palm(765, 335, 110, -1);

  // sand back area
  block(c, "#f7dfa5", 0, 318, W, 82);
  for (let i = 0; i < 90; i++) {
    block(c, "#ecce85", (i * 67) % W, 322 + ((i * 29) % 74), 6, 2);
  }
  // crowd-ish bunting
  for (let i = 0; i < 20; i++) {
    const cols = ["#ff5d73", "#ffd166", "#06d6a0", "#4cc9f0"];
    block(c, cols[i % 4], 20 + i * 40, 308 + (i % 2) * 2, 10, 8);
  }
  block(c, "#ffffff", 0, 306, W, 2);

  // court floor
  block(c, "#f2c872", 0, GROUND, W, H - GROUND);
  for (let i = 0; i < 60; i++) {
    block(c, "#dcae55", (i * 53) % W, GROUND + 6 + ((i * 17) % 40), 8, 3);
  }
  block(c, "#ffffff", 0, GROUND, W, 4);
  block(c, "#b8872f", 0, GROUND + 4, W, 3);
  block(c, "#ffffff", 8, GROUND, 4, H - GROUND);
  block(c, "#ffffff", W - 12, GROUND, 4, H - GROUND);

  // net pole
  block(c, "#d9d9d9", NET_X - 5, NET_TOP - 8, 10, NET_H + 8);
  block(c, "#9a9a9a", NET_X + 2, NET_TOP - 8, 3, NET_H + 8);
  // mesh
  c.fillStyle = "rgba(255,255,255,0.55)";
  for (let y = NET_TOP + 6; y < GROUND; y += 8) c.fillRect(NET_X - NET_W / 2, y, NET_W, 1);
  block(c, "#ff4d6d", NET_X - 6, NET_TOP - 8, 12, 6);
  block(c, "#ffffff", NET_X - 6, NET_TOP - 2, 12, 4);

  return cv;
}

function drawBall(c: CanvasRenderingContext2D, s: GameState) {
  const b = s.ball;
  const sp = Math.hypot(b.vx, b.vy);
  // shadow
  const hgt = Math.max(0, GROUND - b.y);
  const sr = BALL_R * (1 - Math.min(hgt, 380) / 380 * 0.6);
  c.fillStyle = "rgba(0,0,0,0.22)";
  c.beginPath();
  c.ellipse(b.x, GROUND + 7, sr * 1.1, sr * 0.3, 0, 0, Math.PI * 2);
  c.fill();

  // speed streaks
  if (sp > 12 && s.phase === "play") {
    for (let i = 1; i <= 4; i++) {
      c.fillStyle = `rgba(255,255,255,${0.28 - i * 0.055})`;
      c.beginPath();
      c.arc(b.x - b.vx * i * 0.9, b.y - b.vy * i * 0.9, BALL_R * (1 - i * 0.12), 0, Math.PI * 2);
      c.fill();
    }
  }

  c.save();
  c.translate(b.x, b.y);
  c.rotate(b.rot);
  c.beginPath();
  c.arc(0, 0, BALL_R, 0, Math.PI * 2);
  c.fillStyle = "#ffffff";
  c.fill();
  c.save();
  c.clip();
  for (let k = 0; k < 3; k++) {
    c.save();
    c.rotate((k * Math.PI * 2) / 3);
    c.fillStyle = k % 2 === 0 ? "#ffd23f" : "#2d6cdf";
    c.beginPath();
    c.moveTo(-BALL_R, -BALL_R * 0.1);
    c.quadraticCurveTo(0, -BALL_R * 0.55, BALL_R, -BALL_R * 0.1);
    c.lineTo(BALL_R, BALL_R * 0.25);
    c.quadraticCurveTo(0, -BALL_R * 0.2, -BALL_R, BALL_R * 0.25);
    c.closePath();
    c.fill();
    c.restore();
  }
  c.restore();
  c.lineWidth = 2;
  c.strokeStyle = "#1c2b4a";
  c.beginPath();
  c.arc(0, 0, BALL_R, 0, Math.PI * 2);
  c.stroke();
  c.restore();

  if (s.flash > 0) {
    c.strokeStyle = `rgba(255,240,150,${s.flash / 10})`;
    c.lineWidth = 3;
    c.beginPath();
    c.arc(b.x, b.y, BALL_R + 4 + (10 - s.flash) * 3, 0, Math.PI * 2);
    c.stroke();
  }
}

function drawPlayer(c: CanvasRenderingContext2D, s: GameState, i: 0 | 1, info: RenderInfo) {
  const p = s.p[i];
  const hgt = GROUND - p.y;
  const sr = 28 * (1 - Math.min(hgt, 260) / 260 * 0.5);
  c.fillStyle = "rgba(0,0,0,0.22)";
  c.beginPath();
  c.ellipse(p.x, GROUND + 7, sr, sr * 0.28, 0, 0, Math.PI * 2);
  c.fill();

  const ch = info.chars[i];
  const pose = p.spike > 0 ? "spike" : "idle";
  const img = info.sprites?.[ch][pose];
  const facing = i === 0 ? 1 : -1;
  const flip = NATURAL_FACING[ch][pose] !== facing;
  const targetH = pose === "spike" ? 124 : 108;

  const running = p.ground && Math.abs(p.vx) > 0.1;
  const bob = running ? -Math.abs(Math.sin(s.frame * 0.4)) * 5 : 0;
  const lean = (p.vx / SPEED) * 0.07 + (p.ground ? 0 : p.vx * 0.006);
  const stretch = p.ground ? 1 : 1 + Math.min(0.06, Math.abs(p.vy) * 0.004);

  c.save();
  c.translate(p.x, p.y + 4 + bob);
  c.rotate(lean);
  if (img && img.naturalWidth > 0) {
    const h = targetH * stretch;
    const w = (img.naturalWidth / img.naturalHeight) * targetH; // preserve aspect ratio
    c.scale(flip ? -1 : 1, 1);
    c.drawImage(img, -w / 2, -h, w, h);
  } else {
    c.fillStyle = i === 0 ? "#2aa7a0" : "#e88ab0";
    c.beginPath();
    c.ellipse(0, -50, 26, 50, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

function outlineText(c: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, fill = "#fff", align: CanvasTextAlign = "center") {
  c.font = `bold ${size}px "Courier New", ui-monospace, monospace`;
  c.textAlign = align;
  c.textBaseline = "middle";
  c.lineJoin = "round";
  c.lineWidth = Math.max(3, size / 5);
  c.strokeStyle = "#1a1035";
  c.strokeText(text, x, y);
  c.fillStyle = fill;
  c.fillText(text, x, y);
}

function drawPortrait(c: CanvasRenderingContext2D, info: RenderInfo, i: 0 | 1, x: number, y: number) {
  const img = info.sprites?.[info.chars[i]].idle;
  if (!img || img.naturalWidth === 0) return;
  // crop head region, keep the crop's own aspect ratio
  const sw = img.naturalWidth;
  const sh = img.naturalHeight * 0.3;
  const dw = 44;
  const dh = (dw * sh) / sw;
  c.fillStyle = "rgba(20,10,50,0.55)";
  c.fillRect(x - 3, y - 3, dw + 6, dh + 6);
  c.drawImage(img, 0, 0, sw, sh, x, y, dw, dh);
}

export function render(ctx: CanvasRenderingContext2D, s: GameState, info: RenderInfo) {
  if (!bg) bg = makeBackground();
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(bg, 0, 0, W, H);

  drawPlayer(ctx, s, 0, info);
  drawPlayer(ctx, s, 1, info);
  drawBall(ctx, s);

  // net mesh top band again in front
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(NET_X - NET_W / 2 - 1, NET_TOP - 2, NET_W + 2, 4);

  // HUD
  drawPortrait(ctx, info, 0, 14, 12);
  drawPortrait(ctx, info, 1, W - 14 - 44, 12);
  outlineText(ctx, info.names[0], 66, 22, 16, "#fff", "left");
  outlineText(ctx, info.tags[0], 66, 42, 12, "#ffe066", "left");
  outlineText(ctx, info.names[1], W - 66, 22, 16, "#fff", "right");
  outlineText(ctx, info.tags[1], W - 66, 42, 12, "#ffe066", "right");
  outlineText(ctx, String(s.score[0]), W / 2 - 50, 34, 44, s.server === 0 ? "#ffe066" : "#ffffff");
  outlineText(ctx, "-", W / 2, 34, 36);
  outlineText(ctx, String(s.score[1]), W / 2 + 50, 34, 44, s.server === 1 ? "#ffe066" : "#ffffff");
  outlineText(ctx, `${info.labels.firstTo} ${s.target}`, W / 2, 68, 13, "#cfe8ff");

  if (s.phase === "ready" && s.frame > 0) {
    outlineText(ctx, info.labels.ready, W / 2, 190, 40, "#fff");
  }
  if (s.phase === "point") {
    const who = s.server;
    outlineText(ctx, `${info.labels.point} ${info.names[who]}`, W / 2, 190, 34, "#ffe066");
  }
}
