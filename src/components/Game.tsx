"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CpuAI, Difficulty } from "@/game/ai";
import { emptyInput, GameState, createState, resetMatch, step, Input } from "@/game/engine";
import { arrowsInput, createKeyboard, mergeInput, packInput, rdfgInput, unpackInput } from "@/game/input";
import { render, RenderInfo } from "@/game/render";
import { CharId, loadSprites, SPRITE_URL, Sprites } from "@/game/sprites";
import { isMuted, setMuted, sfx } from "@/game/audio";
import type { Session } from "@/game/online";
import { useLang } from "@/lib/i18n";

export interface GameConfig {
  mode: "cpu" | "local" | "host" | "guest";
  difficulty: Difficulty;
  target: number;
  playerChar: CharId;
  session: Session | null;
}

export default function Game({ config, onExit }: { config: GameConfig; onExit: () => void }) {
  const { t, name } = useLang();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createState(config.target, 0));
  const spritesRef = useRef<Sprites | null>(null);
  const infoRef = useRef<RenderInfo | null>(null);
  const exitRef = useRef(onExit);
  const [over, setOver] = useState<number>(-1);
  const [lost, setLost] = useState(false);
  const [muted, setMutedState] = useState(isMuted());

  useEffect(() => {
    exitRef.current = onExit;
  }, [onExit]);

  const chars = useMemo<[CharId, CharId]>(() => {
    if (config.mode === "cpu") return config.playerChar === "abao" ? ["ajie", "abao"] : ["abao", "ajie"];
    return ["ajie", "abao"];
  }, [config.mode, config.playerChar]);

  const tags = useMemo<[string, string]>(() => {
    switch (config.mode) {
      case "cpu":
        return [`${t("cpuLabel")} · ${t(config.difficulty)}`, t("p1")];
      case "local":
        return [t("p1"), t("p2")];
      case "host":
        return [t("youHost"), ""];
      default:
        return ["", t("youGuest")];
    }
  }, [config.mode, config.difficulty, t]);

  useEffect(() => {
    infoRef.current = {
      sprites: spritesRef.current,
      chars,
      names: [name(chars[0]), name(chars[1])],
      labels: { ready: t("ready"), point: t("point"), firstTo: t("firstTo") },
      tags,
    };
  }, [chars, tags, name, t]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const kb = createKeyboard(() => exitRef.current());
    const ai = config.mode === "cpu" ? new CpuAI(config.difficulty, 0) : null;
    let remote: Input = emptyInput();
    let lastFrame = -1;
    const session = config.session;

    loadSprites().then((sp) => {
      spritesRef.current = sp;
      if (infoRef.current) infoRef.current.sprites = sp;
    });

    if (session) {
      session.onData = (m) => {
        if (m.t === "input" && config.mode === "host") {
          remote = unpackInput(m.i);
        } else if (m.t === "state" && config.mode === "guest") {
          const st = m.s as GameState;
          if (st.frame < lastFrame) lastFrame = -1; // rematch reset
          if (st.frame > lastFrame) {
            lastFrame = st.frame;
            for (const ev of st.events) sfx(ev);
          }
          stateRef.current = st;
        }
      };
      session.onClose = () => setLost(true);
    }

    const tick = () => {
      const s = stateRef.current;
      const arrows = arrowsInput(kb.keys);
      const rd = rdfgInput(kb.keys);
      switch (config.mode) {
        case "cpu":
          step(s, [ai!.apply(s), arrows]);
          break;
        case "local":
          step(s, [rd, arrows]);
          break;
        case "host":
          step(s, [mergeInput(arrows, rd), remote]);
          session?.send({ t: "state", s });
          break;
        case "guest":
          session?.send({ t: "input", i: packInput(mergeInput(arrows, rd)) });
          return;
      }
      for (const ev of s.events) sfx(ev);
    };

    const STEP = 1000 / 60;
    let last = performance.now();
    let acc = 0;
    let overSeen = -1;
    const frame = (now: number) => {
      acc += Math.min(100, now - last);
      last = now;
      while (acc >= STEP) {
        acc -= STEP;
        tick();
      }
      const s = stateRef.current;
      if (infoRef.current) render(ctx, s, infoRef.current);
      const w = s.phase === "over" ? s.winner : -1;
      if (w !== overSeen) {
        overSeen = w;
        setOver(w);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      kb.dispose();
      if (session) {
        session.onData = () => {};
        session.onClose = () => {};
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rematch = () => {
    resetMatch(stateRef.current);
  };

  const toggleMute = () => {
    setMuted(!muted);
    setMutedState(!muted);
  };

  const ctl = (() => {
    switch (config.mode) {
      case "cpu":
        return `${t("arrows")} + Enter (${t("spike")}) · ${t("cpuSide")}`;
      case "local":
        return `${t("ctl2pLeft")}: ${t("rdfg")} + Z · ${t("ctl2pRight")}: ${t("arrows")} + Enter`;
      default:
        return `${t("arrows")} + Enter (${t("spike")})`;
    }
  })();

  return (
    <div className="mx-auto w-full max-w-[1000px] px-2 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <button className="arcade-btn arcade-btn-sm" onClick={onExit}>
          ← {t("menu")} <span className="opacity-70">(Esc)</span>
        </button>
        {config.session && (
          <span className="rounded bg-black/40 px-2 py-1 font-mono text-xs text-yellow-200">
            {t("roomCode")}: {config.session.code}
          </span>
        )}
        <button className="arcade-btn arcade-btn-sm" onClick={toggleMute}>
          {t("sound")}: {muted ? t("off") : t("on")}
        </button>
      </div>

      <div className="relative overflow-hidden rounded-lg border-4 border-[#1a1035] shadow-[0_0_0_4px_#ffd23f,0_10px_40px_rgba(0,0,0,0.6)]">
        <canvas ref={canvasRef} width={1600} height={900} className="block h-auto w-full" style={{ aspectRatio: "16 / 9" }} />

        {over >= 0 && !lost && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 p-4 text-center">
            <div className="flex h-36 w-28 items-end justify-center sm:h-44 sm:w-36">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SPRITE_URL(chars[over], "idle")} alt={name(chars[over])} className="h-full w-full object-contain drop-shadow-[0_0_12px_rgba(255,220,100,0.8)]" />
            </div>
            <h2 className="pixel-title text-2xl text-yellow-300 sm:text-4xl">
              {name(chars[over])} {t("winsMatch")}
            </h2>
            <div className="text-xl font-bold text-white">
              {stateRef.current.score[0]} - {stateRef.current.score[1]}
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {config.mode !== "guest" ? (
                <button className="arcade-btn" onClick={rematch}>
                  {t("playAgain")}
                </button>
              ) : (
                <span className="rounded bg-black/50 px-3 py-2 text-sm text-white">{t("waitHost")}</span>
              )}
              <button className="arcade-btn arcade-btn-alt" onClick={onExit}>
                {t("menu")}
              </button>
            </div>
          </div>
        )}

        {lost && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 p-4 text-center">
            <h2 className="pixel-title text-2xl text-red-300 sm:text-3xl">{t("connectionLost")}</h2>
            <button className="arcade-btn" onClick={onExit}>
              {t("menu")}
            </button>
          </div>
        )}
      </div>

      <p className="mt-3 text-center text-xs text-sky-100/90 sm:text-sm">{ctl}</p>
    </div>
  );
}
