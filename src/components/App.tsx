"use client";

import { useEffect, useRef, useState } from "react";
import Game, { GameConfig } from "./Game";
import { LANGS, LangProvider, useLang } from "@/lib/i18n";
import type { Difficulty } from "@/game/ai";
import type { CharId } from "@/game/sprites";
import { SPRITE_URL } from "@/game/sprites";
import { hostRoom, joinRoom, Session } from "@/game/online";
import { unlockAudio } from "@/game/audio";

type Screen = "menu" | "cpu" | "online" | "game";

const DIFFS: Difficulty[] = ["easy", "medium", "hard", "nightmare"];
const TARGETS = [7, 11, 15];

function CharImg({ id, pose = "idle", className = "" }: { id: CharId; pose?: "idle" | "spike"; className?: string }) {
  const { name } = useLang();
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={SPRITE_URL(id, pose)} alt={name(id)} className={`object-contain ${className}`} style={{ objectFit: "contain" }} draggable={false} />
  );
}

function CharCard({ id, selected, onClick }: { id: CharId; selected?: boolean; onClick?: () => void }) {
  const { name } = useLang();
  return (
    <button
      onClick={onClick}
      className={`flex w-32 flex-col items-center rounded-lg border-4 p-2 transition sm:w-40 ${
        selected ? "border-yellow-300 bg-white/25 shadow-[0_0_20px_rgba(255,220,80,0.6)]" : "border-white/20 bg-white/10 hover:bg-white/20"
      }`}
    >
      <div className="flex h-40 w-full items-end justify-center sm:h-52">
        <CharImg id={id} className="h-full w-full" />
      </div>
      <span className="pixel-title mt-1 text-lg text-white">{name(id)}</span>
    </button>
  );
}

function LangSwitch() {
  const { lang, setLang } = useLang();
  return (
    <div className="flex gap-1" role="group" aria-label="language">
      {LANGS.map((l) => (
        <button
          key={l.id}
          onClick={() => setLang(l.id)}
          className={`rounded border-2 px-2 py-1 text-xs font-bold ${
            lang === l.id ? "border-yellow-300 bg-yellow-300 text-[#1a1035]" : "border-white/40 bg-black/30 text-white hover:bg-black/50"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

function Controls() {
  const { t } = useLang();
  const Key = ({ children }: { children: React.ReactNode }) => (
    <kbd className="rounded border-2 border-white/60 bg-black/40 px-1.5 py-0.5 font-mono text-xs text-yellow-100">{children}</kbd>
  );
  return (
    <div className="mx-auto mt-6 w-full max-w-2xl rounded-lg border-2 border-white/20 bg-black/35 p-4 text-sm text-white/90">
      <h3 className="pixel-title mb-2 text-base text-yellow-300">{t("controls")}</h3>
      <ul className="space-y-1.5">
        <li>
          <b>{t("ctl1p")} / {t("ctl2pRight")}:</b> {t("move")} <Key>←</Key> <Key>→</Key> <Key>↑</Key> <Key>↓</Key> · {t("spike")} <Key>Enter</Key>
        </li>
        <li>
          <b>{t("ctl2pLeft")}:</b> {t("move")} <Key>R</Key> <Key>F</Key> <Key>D</Key> <Key>G</Key> <span className="text-xs text-white/60">({t("rdfg")})</span> · {t("spike")} <Key>Z</Key>
        </li>
      </ul>
      <p className="mt-2 text-xs text-white/70">{t("rules")}</p>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="arcade-bg min-h-screen">
      <div className="mx-auto flex max-w-4xl items-center justify-end gap-2 px-3 pt-3">
        <LangSwitch />
      </div>
      {children}
    </div>
  );
}

function Main() {
  const { t, name } = useLang();
  const [screen, setScreen] = useState<Screen>("menu");
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [playerChar, setPlayerChar] = useState<CharId>("abao");
  const [target, setTarget] = useState(15);

  // online
  const [tab, setTab] = useState<"create" | "join">("create");
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [netStatus, setNetStatus] = useState<"idle" | "creating" | "waiting" | "connecting">("idle");
  const [netError, setNetError] = useState("");
  const [copied, setCopied] = useState(false);
  const sessionRef = useRef<Session | null>(null);

  const cleanupSession = () => {
    sessionRef.current?.close();
    sessionRef.current = null;
    setNetStatus("idle");
    setRoomCode("");
  };

  useEffect(() => {
    return () => {
      sessionRef.current?.close();
    };
  }, []);

  const go = (mode: GameConfig["mode"], session: Session | null = null) => {
    unlockAudio();
    setConfig({ mode, difficulty, target, playerChar, session });
    setScreen("game");
  };

  const exitGame = () => {
    cleanupSession();
    setConfig(null);
    setScreen("menu");
  };

  const createRoom = async () => {
    unlockAudio();
    cleanupSession();
    setNetError("");
    setNetStatus("creating");
    try {
      const s = await hostRoom({
        onCode: (c) => {
          setRoomCode(c);
          setNetStatus("waiting");
        },
        onConnected: (sess) => {
          go("host", sess);
        },
        onError: () => {
          setNetError(t("netError"));
          cleanupSession();
        },
      });
      sessionRef.current = s;
    } catch {
      setNetError(t("netError"));
      setNetStatus("idle");
    }
  };

  const doJoin = async () => {
    unlockAudio();
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) return;
    cleanupSession();
    setNetError("");
    setNetStatus("connecting");
    try {
      const s = await joinRoom(code, {
        onConnected: (sess) => {
          go("guest", sess);
        },
        onError: (m) => {
          setNetError(m === "not-found" ? t("notFound") : t("netError"));
          cleanupSession();
        },
      });
      sessionRef.current = s;
    } catch {
      setNetError(t("netError"));
      setNetStatus("idle");
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  if (screen === "game" && config) {
    return (
      <div className="arcade-bg min-h-screen">
        <Game config={config} onExit={exitGame} />
      </div>
    );
  }

  return (
    <Shell>
      <main className="mx-auto max-w-4xl px-4 pb-10 pt-2 text-center">
        <h1 className="pixel-title mt-2 text-3xl leading-tight text-yellow-300 sm:text-5xl">{t("title")}</h1>
        <p className="pixel-title mt-2 text-xs tracking-widest text-sky-200 sm:text-sm">{t("subtitle")}</p>

        {screen === "menu" && (
          <>
            <div className="mt-5 flex items-end justify-center gap-4 sm:gap-10">
              <CharCard id="ajie" />
              <span className="pixel-title mb-16 text-3xl text-white">VS</span>
              <CharCard id="abao" />
            </div>
            <p className="mt-3 text-sm text-white/80">{t("pressStart")}</p>
            <div className="mx-auto mt-3 flex max-w-sm flex-col gap-3">
              <button className="arcade-btn" onClick={() => setScreen("cpu")}>
                {t("onePlayer")}
              </button>
              <button className="arcade-btn" onClick={() => go("local")}>
                {t("twoPlayers")}
              </button>
              <button className="arcade-btn arcade-btn-alt" onClick={() => setScreen("online")}>
                {t("online")}
              </button>
            </div>
            <Controls />
          </>
        )}

        {screen === "cpu" && (
          <div className="mx-auto mt-6 max-w-xl rounded-xl border-4 border-white/20 bg-black/35 p-5">
            <h2 className="pixel-title mb-3 text-xl text-yellow-300">{t("chooseChar")}</h2>
            <div className="flex justify-center gap-4">
              <CharCard id="ajie" selected={playerChar === "ajie"} onClick={() => setPlayerChar("ajie")} />
              <CharCard id="abao" selected={playerChar === "abao"} onClick={() => setPlayerChar("abao")} />
            </div>
            <p className="mt-2 text-xs text-white/70">
              {name(playerChar)} · {t("cpuSide")}
            </p>

            <h2 className="pixel-title mb-2 mt-5 text-xl text-yellow-300">{t("difficulty")}</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {DIFFS.map((d) => (
                <button key={d} onClick={() => setDifficulty(d)} className={`opt-btn ${difficulty === d ? "opt-btn-on" : ""} ${d === "nightmare" ? "text-red-200" : ""}`}>
                  {t(d)}
                </button>
              ))}
            </div>

            <h2 className="pixel-title mb-2 mt-5 text-xl text-yellow-300">{t("pointsToWin")}</h2>
            <div className="flex justify-center gap-2">
              {TARGETS.map((n) => (
                <button key={n} onClick={() => setTarget(n)} className={`opt-btn w-16 ${target === n ? "opt-btn-on" : ""}`}>
                  {n}
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-center gap-3">
              <button className="arcade-btn arcade-btn-alt" onClick={() => setScreen("menu")}>
                {t("back")}
              </button>
              <button className="arcade-btn" onClick={() => go("cpu")}>
                {t("start")}
              </button>
            </div>
          </div>
        )}

        {screen === "online" && (
          <div className="mx-auto mt-6 max-w-xl rounded-xl border-4 border-white/20 bg-black/35 p-5">
            <h2 className="pixel-title mb-3 text-xl text-yellow-300">{t("online")}</h2>
            <div className="mb-4 flex justify-center gap-2">
              <button
                className={`opt-btn ${tab === "create" ? "opt-btn-on" : ""}`}
                onClick={() => {
                  cleanupSession();
                  setNetError("");
                  setTab("create");
                }}
              >
                {t("createRoom")}
              </button>
              <button
                className={`opt-btn ${tab === "join" ? "opt-btn-on" : ""}`}
                onClick={() => {
                  cleanupSession();
                  setNetError("");
                  setTab("join");
                }}
              >
                {t("joinRoom")}
              </button>
            </div>

            {tab === "create" && (
              <div className="flex flex-col items-center gap-3">
                {netStatus === "idle" && (
                  <button className="arcade-btn" onClick={createRoom}>
                    {t("createRoom")}
                  </button>
                )}
                {netStatus === "creating" && <p className="text-white">{t("connecting")}</p>}
                {netStatus === "waiting" && (
                  <>
                    <p className="text-sm text-white/80">{t("shareCode")}</p>
                    <div className="flex items-center gap-3">
                      <span className="pixel-title rounded-lg border-4 border-yellow-300 bg-black/50 px-5 py-2 text-4xl tracking-[0.3em] text-yellow-200">{roomCode}</span>
                      <button className="opt-btn" onClick={copyCode}>
                        {copied ? t("copied") : t("copy")}
                      </button>
                    </div>
                    <p className="animate-pulse text-white">{t("waiting")}</p>
                    <div className="flex items-end gap-2">
                      <CharImg id="ajie" className="h-24 w-16" />
                      <span className="pb-6 text-xs text-white/70">{t("youHost")}</span>
                    </div>
                  </>
                )}
              </div>
            )}

            {tab === "join" && (
              <div className="flex flex-col items-center gap-3">
                <label className="text-sm text-white/80">{t("enterCode")}</label>
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") doJoin();
                  }}
                  placeholder="ABCDE"
                  className="pixel-title w-56 rounded-lg border-4 border-yellow-300 bg-black/50 px-3 py-2 text-center text-3xl tracking-[0.3em] text-yellow-100 outline-none"
                />
                {netStatus === "connecting" ? (
                  <p className="animate-pulse text-white">{t("connecting")}</p>
                ) : (
                  <button className="arcade-btn" onClick={doJoin} disabled={joinCode.length < 4}>
                    {t("join")}
                  </button>
                )}
              </div>
            )}

            {netError && <p className="mt-3 rounded bg-red-900/60 px-3 py-2 text-sm text-red-100">{netError}</p>}
            <p className="mt-4 text-xs text-white/60">{t("onlineHint")}</p>

            <div className="mt-5 flex justify-center">
              <button
                className="arcade-btn arcade-btn-alt"
                onClick={() => {
                  cleanupSession();
                  setNetError("");
                  setScreen("menu");
                }}
              >
                {t("back")}
              </button>
            </div>
          </div>
        )}
      </main>
    </Shell>
  );
}

export default function App() {
  return (
    <LangProvider>
      <Main />
    </LangProvider>
  );
}
