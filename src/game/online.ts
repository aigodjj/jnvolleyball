// Peer-to-peer online rooms using WebRTC (PeerJS). The host simulates the match and streams
// snapshots; the guest sends its inputs. Friends connect with a short room code.
import type { DataConnection, Peer as PeerType } from "peerjs";

export type NetMsg =
  | { t: "input"; i: number }
  | { t: "state"; s: unknown }
  | { t: "rematch" }
  | { t: "bye" };

export class Session {
  role: "host" | "guest";
  code: string;
  peer: PeerType;
  conn: DataConnection | null = null;
  onData: (m: NetMsg) => void = () => {};
  onClose: () => void = () => {};
  closed = false;

  constructor(role: "host" | "guest", code: string, peer: PeerType) {
    this.role = role;
    this.code = code;
    this.peer = peer;
  }

  attach(conn: DataConnection) {
    this.conn = conn;
    conn.on("data", (d) => this.onData(d as NetMsg));
    conn.on("close", () => {
      if (!this.closed) this.onClose();
    });
    conn.on("error", () => {
      if (!this.closed) this.onClose();
    });
  }

  send(m: NetMsg) {
    if (this.conn && this.conn.open) this.conn.send(m);
  }

  close() {
    this.closed = true;
    try {
      this.conn?.close();
    } catch {}
    try {
      this.peer.destroy();
    } catch {}
  }
}

const PREFIX = "ajiebao-volley-";
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeCode(): string {
  let s = "";
  for (let i = 0; i < 5; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

export type HostEvents = {
  onCode: (code: string) => void;
  onConnected: (s: Session) => void;
  onError: (msg: string) => void;
};

export async function hostRoom(ev: HostEvents): Promise<Session> {
  const { Peer } = await import("peerjs");
  let attempts = 0;
  return new Promise<Session>((resolve) => {
    const tryCreate = () => {
      const code = makeCode();
      const peer = new Peer(PREFIX + code);
      const session = new Session("host", code, peer);
      let opened = false;
      peer.on("open", () => {
        opened = true;
        ev.onCode(code);
        resolve(session);
      });
      peer.on("connection", (conn) => {
        if (session.conn) {
          conn.on("open", () => conn.close());
          return;
        }
        conn.on("open", () => {
          session.attach(conn);
          ev.onConnected(session);
        });
      });
      peer.on("error", (err: { type?: string }) => {
        if (err.type === "unavailable-id" && !opened && attempts++ < 5) {
          peer.destroy();
          tryCreate();
          return;
        }
        if (!session.closed) ev.onError(err.type ?? "error");
      });
      peer.on("disconnected", () => {
        if (!session.closed && !peer.destroyed) peer.reconnect();
      });
    };
    tryCreate();
  });
}

export async function joinRoom(code: string, ev: { onConnected: (s: Session) => void; onError: (msg: string) => void }): Promise<Session> {
  const { Peer } = await import("peerjs");
  const peer = new Peer();
  const session = new Session("guest", code, peer);
  const timer = setTimeout(() => {
    if (!session.conn?.open) ev.onError("timeout");
  }, 15000);
  peer.on("open", () => {
    const conn = peer.connect(PREFIX + code.toUpperCase(), { reliable: true });
    conn.on("open", () => {
      clearTimeout(timer);
      session.attach(conn);
      ev.onConnected(session);
    });
    conn.on("error", () => ev.onError("error"));
  });
  peer.on("error", (err: { type?: string }) => {
    clearTimeout(timer);
    if (!session.closed) ev.onError(err.type === "peer-unavailable" ? "not-found" : (err.type ?? "error"));
  });
  return session;
}
