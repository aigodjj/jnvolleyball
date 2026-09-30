import { BALL_R, G_B, GROUND, GameState, Input, NET_TOP, NET_W, NET_X, W, emptyInput } from "./engine";

export type Difficulty = "easy" | "medium" | "hard" | "nightmare";

interface Cfg {
  speed: number;
  react: number;
  err: number;
  jump: number;
  spike: number;
  aim: boolean;
}

const CFG: Record<Difficulty, Cfg> = {
  easy: { speed: 0.6, react: 26, err: 80, jump: 0.3, spike: 0.35, aim: false },
  medium: { speed: 0.8, react: 14, err: 42, jump: 0.6, spike: 0.65, aim: false },
  hard: { speed: 1, react: 5, err: 16, jump: 0.9, spike: 0.9, aim: true },
  nightmare: { speed: 1.2, react: 0, err: 0, jump: 1, spike: 1, aim: true },
};

function predict(bx: number, by: number, bvx: number, bvy: number, hitY: number) {
  let x = bx,
    y = by,
    vx = bvx,
    vy = bvy;
  for (let t = 0; t < 400; t++) {
    vy += G_B;
    x += vx;
    y += vy;
    if (x < BALL_R) {
      x = BALL_R;
      vx = -vx;
    } else if (x > W - BALL_R) {
      x = W - BALL_R;
      vx = -vx;
    }
    if (Math.abs(x - NET_X) < NET_W / 2 + BALL_R && y + BALL_R > NET_TOP) {
      vx = -vx * 0.8;
      x += vx > 0 ? 6 : -6;
    }
    if (vy > 0 && y >= hitY) return x;
  }
  return x;
}

export class CpuAI {
  private cfg: Cfg;
  private side: 0 | 1;
  private targetX: number;
  private errOff = 0;
  private tick = 0;

  constructor(diff: Difficulty, side: 0 | 1) {
    this.cfg = CFG[diff];
    this.side = side;
    this.targetX = side === 0 ? 200 : 600;
  }

  apply(s: GameState): Input {
    const inp = emptyInput();
    const cfg = this.cfg;
    const side = this.side;
    const me = s.p[side];
    const b = s.ball;
    const dir = side === 0 ? 1 : -1;
    me.speed = cfg.speed;
    const mine = (x: number) => (side === 0 ? x < NET_X : x > NET_X);
    const home = side === 0 ? 200 : 600;

    if (this.tick++ % Math.max(1, cfg.react) === 0) {
      this.errOff = (Math.random() * 2 - 1) * cfg.err;
      if (s.phase === "ready" || s.phase === "point") {
        this.targetX = s.server === side ? b.x - dir * 16 : home;
      } else {
        const px = predict(b.x, b.y, b.vx, b.vy, GROUND - 80);
        if (mine(px) || mine(b.x)) {
          this.targetX = px - dir * (cfg.aim ? 20 : 6) + this.errOff;
        } else {
          this.targetX = home + (cfg.aim ? dir * -20 : 0);
        }
      }
    }

    const dx = this.targetX - me.x;
    if (dx > 7) inp.right = true;
    else if (dx < -7) inp.left = true;

    if (s.phase === "play" && mine(b.x)) {
      const bx = b.x - me.x;
      const by = me.y - b.y; // ball height above feet
      const cyBody = me.y - 50;
      const dist = Math.hypot(b.x - me.x, b.y - cyBody);
      if (me.ground) {
        if (Math.abs(bx) < 60 && b.vy > 0 && by < 250 && by > 120 && Math.random() < 0.3 * cfg.jump) {
          inp.up = true;
        }
        // power lob from the ground
        if (dist < 90 && by < 90 && b.vy > 0 && Math.random() < 0.15 * cfg.spike) inp.spike = true;
      } else {
        if (dist < 88 && Math.random() < cfg.spike + 0.05) {
          inp.spike = true;
          if (cfg.aim) {
            if (dir === 1) inp.right = true;
            else inp.left = true;
            if (by > 70) inp.down = true;
          }
        }
      }
    }
    return inp;
  }
}
