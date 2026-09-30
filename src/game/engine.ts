// Deterministic 2D volleyball engine (fixed 60Hz step). Pure data in / data out so it can be
// serialized for online play.

export const W = 800;
export const H = 450;
export const GROUND = 400;
export const NET_X = 400;
export const NET_W = 8;
export const NET_H = 135;
export const NET_TOP = GROUND - NET_H;

export const PR = 28; // player capsule radius
export const SEG_TOP = 70; // capsule top segment offset above feet
export const SEG_BOT = 28; // capsule bottom segment offset above feet
export const BALL_R = 16;

export const G_P = 0.62;
export const JUMP_V = -13.2;
export const SPEED = 5.4;
export const G_B = 0.27;
const MAXV = 17;

export interface Input {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  spike: boolean;
}

export const emptyInput = (): Input => ({ left: false, right: false, up: false, down: false, spike: false });

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spike: number; // active swing frames left
  cd: number; // swing cooldown
  prevSpike: boolean;
  hitCd: number;
  ground: boolean;
  speed: number; // speed multiplier (used by CPU difficulty)
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
}

export type Phase = "ready" | "play" | "point" | "over";

export interface GameState {
  p: [Player, Player];
  ball: Ball;
  score: [number, number];
  server: 0 | 1;
  phase: Phase;
  timer: number;
  winner: -1 | 0 | 1;
  target: number;
  events: string[];
  frame: number;
  lastHit: -1 | 0 | 1;
  flash: number; // spike impact flash frames
}

const startX = (i: number) => (i === 0 ? 200 : 600);

function makePlayer(i: number): Player {
  return { x: startX(i), y: GROUND, vx: 0, vy: 0, spike: 0, cd: 0, prevSpike: false, hitCd: 0, ground: true, speed: 1 };
}

export function createState(target: number, server: 0 | 1 = 0): GameState {
  return {
    p: [makePlayer(0), makePlayer(1)],
    ball: { x: startX(server), y: 110, vx: 0, vy: 0, rot: 0 },
    score: [0, 0],
    server,
    phase: "ready",
    timer: 75,
    winner: -1,
    target,
    events: [],
    frame: 0,
    lastHit: -1,
    flash: 0,
  };
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function movePlayer(s: GameState, i: number, inp: Input) {
  const p = s.p[i];
  const minX = i === 0 ? PR : NET_X + NET_W / 2 + PR;
  const maxX = i === 0 ? NET_X - NET_W / 2 - PR : W - PR;
  const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
  p.vx = dir * SPEED * p.speed;
  p.x = clamp(p.x + p.vx, minX, maxX);

  if (inp.up && p.ground) {
    p.vy = JUMP_V;
    p.ground = false;
    s.events.push("jump");
  }
  if (!p.ground) {
    p.vy += G_P + (inp.down ? 0.45 : 0);
    p.y += p.vy;
    if (p.y >= GROUND) {
      p.y = GROUND;
      p.vy = 0;
      p.ground = true;
    }
  }
  if (inp.spike && !p.prevSpike && p.cd <= 0) {
    p.spike = 13;
    p.cd = 26;
    s.events.push("swing");
  }
  p.prevSpike = inp.spike;
  if (p.spike > 0) p.spike--;
  if (p.cd > 0) p.cd--;
  if (p.hitCd > 0) p.hitCd--;
}

function collidePlayer(s: GameState, i: number, inp: Input) {
  const p = s.p[i];
  const b = s.ball;
  const cy = clamp(b.y, p.y - SEG_TOP, p.y - SEG_BOT);
  let dx = b.x - p.x;
  let dy = b.y - cy;
  let d = Math.hypot(dx, dy);
  const R = PR + BALL_R;
  if (d >= R) return;
  if (d < 0.001) {
    dx = 0;
    dy = -1;
    d = 1;
  }
  const nx = dx / d;
  const ny = dy / d;
  b.x = p.x + nx * R;
  b.y = cy + ny * R;
  if (p.hitCd > 0) return;
  p.hitCd = 8;
  const dir = i === 0 ? 1 : -1;

  if (p.spike > 0) {
    const toward = dir === 1 ? inp.right : inp.left;
    if (!p.ground) {
      // Smash: aim so the ball just clears the net (down = flatter/riskier, up = softer)
      const vx = 11.5 + (toward ? 3 : 0);
      b.vx = dir * vx;
      const dxNet = (NET_X - b.x) * dir;
      if (dxNet > 12) {
        const t = dxNet / vx;
        const margin = inp.down ? 10 : inp.up ? 90 : 34;
        const yT = NET_TOP - BALL_R - margin;
        const vy0 = (yT - b.y - 0.5 * G_B * t * t) / t;
        b.vy = clamp(vy0, -14, inp.down ? 13 : 10);
      } else {
        b.vy = 6 + (inp.down ? 5 : 0);
      }
      s.flash = 10;
    } else {
      // Ground lob: high arc into the opponent's court
      b.vx = dir * (5.5 + (toward ? 2.5 : 0));
      b.vy = -11.5;
    }
    p.spike = Math.max(p.spike, 5);
    s.events.push("spike");
  } else {
    const rvx = b.vx - p.vx;
    const rvy = b.vy - p.vy;
    const vn = rvx * nx + rvy * ny;
    if (vn < 0) {
      b.vx -= 2 * vn * nx;
      b.vy -= 2 * vn * ny;
    }
    b.vx += p.vx * 0.4 + dir * 1.2;
    b.vy -= 1.2;
    const sp = Math.hypot(b.vx, b.vy);
    if (sp < 8) {
      if (sp < 0.01) {
        b.vy = -8;
      } else {
        b.vx *= 8 / sp;
        b.vy *= 8 / sp;
      }
    }
    s.events.push("hit");
  }
  const sp = Math.hypot(b.vx, b.vy);
  if (sp > MAXV) {
    b.vx *= MAXV / sp;
    b.vy *= MAXV / sp;
  }
  s.lastHit = i as 0 | 1;
}

function ballPhysics(s: GameState, live: boolean) {
  const b = s.ball;
  b.vy += G_B;
  b.x += b.vx;
  b.y += b.vy;
  b.rot += b.vx * 0.04;

  if (b.x < BALL_R) {
    b.x = BALL_R;
    b.vx = Math.abs(b.vx);
    if (live) s.events.push("wall");
  } else if (b.x > W - BALL_R) {
    b.x = W - BALL_R;
    b.vx = -Math.abs(b.vx);
    if (live) s.events.push("wall");
  }
  if (b.y < BALL_R) {
    b.y = BALL_R;
    b.vy = Math.abs(b.vy) * 0.9;
  }

  // Net (rect)
  const nl = NET_X - NET_W / 2;
  const nr = NET_X + NET_W / 2;
  const cx = clamp(b.x, nl, nr);
  const cy = clamp(b.y, NET_TOP, GROUND);
  let dx = b.x - cx;
  let dy = b.y - cy;
  const d = Math.hypot(dx, dy);
  if (d < BALL_R) {
    if (d < 0.001) {
      // center inside the net: push sideways according to velocity side
      dx = b.vx >= 0 ? -1 : 1;
      dy = 0;
    } else {
      dx /= d;
      dy /= d;
    }
    const nd = d < 0.001 ? 1 : d;
    void nd;
    b.x = cx + dx * BALL_R;
    b.y = cy + dy * BALL_R;
    const vn = b.vx * dx + b.vy * dy;
    if (vn < 0) {
      b.vx -= 1.8 * vn * dx;
      b.vy -= 1.8 * vn * dy;
      if (live) s.events.push("net");
    }
  }

  if (b.y + BALL_R >= GROUND) {
    b.y = GROUND - BALL_R;
    if (live) {
      const scorer: 0 | 1 = b.x < NET_X ? 1 : 0;
      s.score[scorer]++;
      s.server = scorer;
      s.phase = "point";
      s.timer = 85;
      s.events.push("score");
      b.vy = -Math.abs(b.vy) * 0.45;
      b.vx *= 0.6;
      if (s.score[scorer] >= s.target) s.winner = scorer;
    } else {
      b.vy = Math.abs(b.vy) > 2.5 ? -Math.abs(b.vy) * 0.5 : 0;
      b.vx *= 0.95;
    }
  }
}

function resetForServe(s: GameState) {
  for (let i = 0; i < 2; i++) {
    const p = s.p[i];
    p.x = startX(i);
    p.y = GROUND;
    p.vx = 0;
    p.vy = 0;
    p.ground = true;
    p.spike = 0;
    p.cd = 0;
    p.hitCd = 0;
  }
  s.ball = { x: startX(s.server), y: 110, vx: 0, vy: 0, rot: 0 };
  s.phase = "ready";
  s.timer = 65;
  s.lastHit = -1;
}

export function step(s: GameState, inputs: [Input, Input]) {
  s.events = [];
  s.frame++;
  if (s.flash > 0) s.flash--;
  movePlayer(s, 0, inputs[0]);
  movePlayer(s, 1, inputs[1]);

  switch (s.phase) {
    case "ready": {
      s.ball.y = 110 + Math.sin(s.frame * 0.15) * 4;
      s.timer--;
      if (s.timer <= 0) {
        s.phase = "play";
        s.events.push("serve");
      }
      break;
    }
    case "play": {
      ballPhysics(s, true);
      if (s.phase === "play") {
        collidePlayer(s, 0, inputs[0]);
        collidePlayer(s, 1, inputs[1]);
      }
      break;
    }
    case "point": {
      ballPhysics(s, false);
      s.timer--;
      if (s.timer <= 0) {
        if (s.winner >= 0) {
          s.phase = "over";
          s.events.push("win");
        } else resetForServe(s);
      }
      break;
    }
    case "over": {
      ballPhysics(s, false);
      break;
    }
  }
}

export function resetMatch(s: GameState) {
  const loserServe: 0 | 1 = s.winner === 0 ? 1 : 0;
  const n = createState(s.target, loserServe);
  Object.assign(s, n);
}
