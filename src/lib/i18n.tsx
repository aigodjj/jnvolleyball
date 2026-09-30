"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Lang = "en" | "zh-TW" | "zh-CN";

export const LANGS: { id: Lang; label: string }[] = [
  { id: "en", label: "EN" },
  { id: "zh-TW", label: "繁中" },
  { id: "zh-CN", label: "简中" },
];

type Dict = Record<string, string>;

const en: Dict = {
  title: "A-Jie & A-Bao Volleyball",
  subtitle: "RETRO ARCADE BEACH VOLLEYBALL",
  pressStart: "Choose a mode",
  onePlayer: "1 Player (vs CPU)",
  twoPlayers: "2 Players (Local)",
  online: "Online Room",
  back: "Back",
  difficulty: "Difficulty",
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  nightmare: "Nightmare",
  chooseChar: "Choose your character",
  pointsToWin: "Points to win",
  start: "Start!",
  createRoom: "Create Room",
  joinRoom: "Join Room",
  roomCode: "Room code",
  enterCode: "Enter 5-letter code",
  join: "Join",
  waiting: "Waiting for a friend to join…",
  shareCode: "Share this code with your friend",
  copy: "Copy",
  copied: "Copied!",
  connecting: "Connecting…",
  notFound: "Room not found. Check the code and try again.",
  netError: "Could not connect. Please try again.",
  connectionLost: "Connection lost",
  winsMatch: "wins!",
  playAgain: "Play again",
  menu: "Menu",
  ready: "READY?",
  point: "POINT:",
  firstTo: "FIRST TO",
  waitHost: "Waiting for the host to restart…",
  language: "Language",
  controls: "Controls",
  ctl1p: "1 Player",
  ctl2pRight: "Right player",
  ctl2pLeft: "Left player",
  move: "Move",
  spike: "Spike / Hit",
  arrows: "Arrow keys",
  rdfg: "R / F / D / G = Up / Down / Left / Right",
  rules: "Hit the ball over the net. It scores when it lands on the opponent's side. Press spike near the ball to smash (in the air) or lob (on the ground).",
  cpuLabel: "CPU",
  p1: "P1",
  p2: "P2",
  youHost: "You: host (left side)",
  youGuest: "You: guest (right side)",
  onlineHint: "Peer-to-peer play: the host creates a room and sends the code to a friend. Both players use the arrow keys + Enter (R/F/D/G + Z also works).",
  sound: "Sound",
  on: "ON",
  off: "OFF",
  exit: "Esc: Menu",
  cpuSide: "You play on the right side with the arrow keys.",
};

const zhTW: Dict = {
  title: "阿接 & 阿包 打排球",
  subtitle: "復古街機沙灘排球",
  pressStart: "選擇遊戲模式",
  onePlayer: "單人模式 (對戰電腦)",
  twoPlayers: "雙人模式 (本機同樂)",
  online: "線上開房",
  back: "返回",
  difficulty: "難度",
  easy: "簡單",
  medium: "普通",
  hard: "困難",
  nightmare: "惡夢",
  chooseChar: "選擇你的角色",
  pointsToWin: "獲勝分數",
  start: "開始！",
  createRoom: "建立房間",
  joinRoom: "加入房間",
  roomCode: "房間代碼",
  enterCode: "輸入 5 碼房間代碼",
  join: "加入",
  waiting: "等待朋友加入中…",
  shareCode: "把這組代碼傳給你的朋友",
  copy: "複製",
  copied: "已複製！",
  connecting: "連線中…",
  notFound: "找不到房間，請檢查代碼後再試一次。",
  netError: "連線失敗，請再試一次。",
  connectionLost: "連線已中斷",
  winsMatch: "獲勝！",
  playAgain: "再玩一局",
  menu: "回選單",
  ready: "準備！",
  point: "得分：",
  firstTo: "先得",
  waitHost: "等待房主重新開始…",
  language: "語言",
  controls: "操作說明",
  ctl1p: "單人模式",
  ctl2pRight: "右邊玩家",
  ctl2pLeft: "左邊玩家",
  move: "移動",
  spike: "扣球 / 擊球",
  arrows: "方向鍵",
  rdfg: "R / F / D / G = 上 / 下 / 左 / 右",
  rules: "把球打過網，球落在對手場地就得分。在球附近按扣球鍵：空中是大力扣殺，地面是高吊球。",
  cpuLabel: "電腦",
  p1: "玩家1",
  p2: "玩家2",
  youHost: "你是：房主 (左側)",
  youGuest: "你是：訪客 (右側)",
  onlineHint: "點對點連線：房主建立房間並把代碼傳給朋友。雙方都使用方向鍵 + Enter (R/F/D/G + Z 也可以)。",
  sound: "音效",
  on: "開",
  off: "關",
  exit: "Esc：回選單",
  cpuSide: "你在右側，使用方向鍵操作。",
};

const zhCN: Dict = {
  title: "阿接 & 阿包 打排球",
  subtitle: "复古街机沙滩排球",
  pressStart: "选择游戏模式",
  onePlayer: "单人模式 (对战电脑)",
  twoPlayers: "双人模式 (本机同乐)",
  online: "在线开房",
  back: "返回",
  difficulty: "难度",
  easy: "简单",
  medium: "普通",
  hard: "困难",
  nightmare: "噩梦",
  chooseChar: "选择你的角色",
  pointsToWin: "获胜分数",
  start: "开始！",
  createRoom: "创建房间",
  joinRoom: "加入房间",
  roomCode: "房间代码",
  enterCode: "输入 5 位房间代码",
  join: "加入",
  waiting: "等待朋友加入中…",
  shareCode: "把这组代码发给你的朋友",
  copy: "复制",
  copied: "已复制！",
  connecting: "连接中…",
  notFound: "找不到房间，请检查代码后再试一次。",
  netError: "连接失败，请再试一次。",
  connectionLost: "连接已断开",
  winsMatch: "获胜！",
  playAgain: "再玩一局",
  menu: "回菜单",
  ready: "准备！",
  point: "得分：",
  firstTo: "先得",
  waitHost: "等待房主重新开始…",
  language: "语言",
  controls: "操作说明",
  ctl1p: "单人模式",
  ctl2pRight: "右边玩家",
  ctl2pLeft: "左边玩家",
  move: "移动",
  spike: "扣球 / 击球",
  arrows: "方向键",
  rdfg: "R / F / D / G = 上 / 下 / 左 / 右",
  rules: "把球打过网，球落在对手场地就得分。在球附近按扣球键：空中是大力扣杀，地面是高吊球。",
  cpuLabel: "电脑",
  p1: "玩家1",
  p2: "玩家2",
  youHost: "你是：房主 (左侧)",
  youGuest: "你是：访客 (右侧)",
  onlineHint: "点对点连接：房主创建房间并把代码发给朋友。双方都使用方向键 + Enter (R/F/D/G + Z 也可以)。",
  sound: "音效",
  on: "开",
  off: "关",
  exit: "Esc：回菜单",
  cpuSide: "你在右侧，使用方向键操作。",
};

const DICTS: Record<Lang, Dict> = { en, "zh-TW": zhTW, "zh-CN": zhCN };

export const CHAR_NAMES: Record<Lang, { ajie: string; abao: string }> = {
  en: { ajie: "A-Jie", abao: "A-Bao" },
  "zh-TW": { ajie: "阿接", abao: "阿包" },
  "zh-CN": { ajie: "阿接", abao: "阿包" },
};

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: string) => string;
  name: (c: "ajie" | "abao") => string;
}

const LangCtx = createContext<Ctx | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = localStorage.getItem("lang") as Lang | null;
    if (saved && DICTS[saved]) {
      setLangState(saved);
      return;
    }
    const nav = navigator.language || "en";
    if (/^zh-(TW|HK|MO|Hant)/i.test(nav)) setLangState("zh-TW");
    else if (/^zh/i.test(nav)) setLangState("zh-CN");
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("lang", l);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      lang,
      setLang,
      t: (k: string) => DICTS[lang][k] ?? en[k] ?? k,
      name: (c) => CHAR_NAMES[lang][c],
    }),
    [lang, setLang],
  );
  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}

export function useLang(): Ctx {
  const c = useContext(LangCtx);
  if (!c) throw new Error("useLang outside provider");
  return c;
}
