// /ws/conversations/<id>/ adresindeki Channels WebSocket endpoint'i için ince
// bir istemci (bkz. backend/apps/messaging/consumers.py). JWT handshake'ini
// (access token bir `?token=` sorgu parametresi olarak — tarayıcılar WS
// upgrade sırasında özel header ayarlayamaz), bağlantı her düştüğünde
// (ağ kesintisi, oturum ortasında access token'ın süresinin dolması, sunucu
// yeniden başlatma) backoff ile otomatik yeniden bağlanmayı ve UI katmanı
// için küçük, tiplenmiş bir olay yüzeyini yönetir.
import { getAccessToken } from "@/lib/token-store";

export type ConversationSocketEvent =
  | { type: "message"; message: Record<string, unknown> }
  | { type: "typing"; user_id: number; is_typing: boolean }
  | { type: "read"; user_id: number }
  | { type: "presence"; user_id: number; status: "online" | "offline" };

const MAX_RECONNECT_DELAY_MS = 10_000;
const BASE_RECONNECT_DELAY_MS = 1_000;

function wsUrl(conversationId: string, token: string): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws/conversations/${conversationId}/?token=${encodeURIComponent(token)}`;
}

export class ConversationSocket {
  private ws: WebSocket | null = null;
  private closedByCaller = false;
  private reconnectAttempt = 0;
  private reconnectTimer: number | null = null;

  constructor(
    private conversationId: string,
    private onEvent: (event: ConversationSocketEvent) => void,
    private onStatusChange?: (status: "connecting" | "open" | "closed") => void,
  ) {
    this.connect();
  }

  private connect() {
    const token = getAccessToken();
    if (!token) {
      // Bellekte henüz bir access token yok (ör. restoreSession() bitmeden
      // önceki taze bir sayfa yüklemesi) — sessizce başarısız olmak yerine
      // kısa süre sonra tekrar dene.
      this.scheduleReconnect();
      return;
    }

    this.onStatusChange?.("connecting");
    const socket = new WebSocket(wsUrl(this.conversationId, token));
    this.ws = socket;

    socket.onopen = () => {
      this.reconnectAttempt = 0;
      this.onStatusChange?.("open");
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as ConversationSocketEvent;
        this.onEvent(data);
      } catch {
        // Hatalı biçimlendirilmiş frame'leri yoksay.
      }
    };

    socket.onclose = () => {
      this.onStatusChange?.("closed");
      if (!this.closedByCaller) this.scheduleReconnect();
    };

    socket.onerror = () => {
      socket.close();
    };
  }

  private scheduleReconnect() {
    if (this.closedByCaller) return;
    const delay = Math.min(BASE_RECONNECT_DELAY_MS * 2 ** this.reconnectAttempt, MAX_RECONNECT_DELAY_MS);
    this.reconnectAttempt += 1;
    this.reconnectTimer = window.setTimeout(() => this.connect(), delay);
  }

  private send(payload: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  sendMessage(body: string) {
    this.send({ type: "message", body });
  }

  sendTyping(isTyping: boolean) {
    this.send({ type: "typing", is_typing: isTyping });
  }

  sendRead() {
    this.send({ type: "read" });
  }

  close() {
    this.closedByCaller = true;
    if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer);
    this.ws?.close();
  }
}
