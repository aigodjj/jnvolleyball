export type CharId = "ajie" | "abao";
export type Pose = "idle" | "spike";

export interface SpriteSet {
  idle: HTMLImageElement;
  spike: HTMLImageElement;
}
export type Sprites = Record<CharId, SpriteSet>;

export const SPRITE_URL = (c: CharId, p: Pose) => `/sprites/${c}_${p}.png`;

// Direction each source sprite is drawn facing (1 = right, -1 = left)
export const NATURAL_FACING: Record<CharId, Record<Pose, 1 | -1>> = {
  ajie: { idle: 1, spike: 1 },
  abao: { idle: 1, spike: -1 },
};

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(img);
    img.src = src;
  });
}

let cache: Promise<Sprites> | null = null;
export function loadSprites(): Promise<Sprites> {
  if (!cache) {
    cache = Promise.all([
      load(SPRITE_URL("ajie", "idle")),
      load(SPRITE_URL("ajie", "spike")),
      load(SPRITE_URL("abao", "idle")),
      load(SPRITE_URL("abao", "spike")),
    ]).then(([ai, as, bi, bs]) => ({
      ajie: { idle: ai, spike: as },
      abao: { idle: bi, spike: bs },
    }));
  }
  return cache;
}
