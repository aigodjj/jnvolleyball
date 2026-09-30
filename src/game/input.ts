import { Input, emptyInput } from "./engine";

const GAME_KEYS = new Set([
  "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", "NumpadEnter",
  "KeyR", "KeyF", "KeyD", "KeyG", "KeyZ", "Space",
]);

export interface Keyboard {
  keys: Set<string>;
  dispose: () => void;
}

export function createKeyboard(onEscape?: () => void): Keyboard {
  const keys = new Set<string>();
  const down = (e: KeyboardEvent) => {
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (e.code === "Escape") onEscape?.();
    keys.add(e.code);
  };
  const up = (e: KeyboardEvent) => {
    keys.delete(e.code);
  };
  const blur = () => keys.clear();
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  window.addEventListener("blur", blur);
  return {
    keys,
    dispose() {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    },
  };
}

/** Right-hand map: arrows + Enter */
export function arrowsInput(k: Set<string>): Input {
  return {
    left: k.has("ArrowLeft"),
    right: k.has("ArrowRight"),
    up: k.has("ArrowUp"),
    down: k.has("ArrowDown"),
    spike: k.has("Enter") || k.has("NumpadEnter"),
  };
}

/** Left-hand map: R/F/D/G + Z */
export function rdfgInput(k: Set<string>): Input {
  return {
    left: k.has("KeyD"),
    right: k.has("KeyG"),
    up: k.has("KeyR"),
    down: k.has("KeyF"),
    spike: k.has("KeyZ"),
  };
}

export function mergeInput(a: Input, b: Input): Input {
  return {
    left: a.left || b.left,
    right: a.right || b.right,
    up: a.up || b.up,
    down: a.down || b.down,
    spike: a.spike || b.spike,
  };
}

export function emptyTouch(): Input {
  return emptyInput();
}

export const packInput = (i: Input) =>
  (i.left ? 1 : 0) | (i.right ? 2 : 0) | (i.up ? 4 : 0) | (i.down ? 8 : 0) | (i.spike ? 16 : 0);

export const unpackInput = (n: number): Input => ({
  left: !!(n & 1),
  right: !!(n & 2),
  up: !!(n & 4),
  down: !!(n & 8),
  spike: !!(n & 16),
});
