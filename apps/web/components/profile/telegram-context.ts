const telegramContextKey = "duet-telegram-context";

export type PendingTelegramContext =
  | {
      kind: "telegram-webapp";
      initData: string;
    }
  | {
      kind: "bot-webapp";
      telegramId: string;
      chatId: string | null;
      timestamp: number;
      signature: string;
    };

export function detectTelegramContextFromWindow(): PendingTelegramContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  const initData = window.Telegram?.WebApp?.initData?.trim();
  if (initData) {
    return {
      kind: "telegram-webapp",
      initData
    };
  }

  const params = new URLSearchParams(window.location.search);
  const telegramId = params.get("telegramId");
  const timestamp = params.get("timestamp");
  const signature = params.get("signature");

  if (!telegramId || !timestamp || !signature) {
    return null;
  }

  return {
    kind: "bot-webapp",
    telegramId,
    chatId: params.get("chatId"),
    timestamp: Number(timestamp),
    signature
  };
}

export function readPendingTelegramContext(): PendingTelegramContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(telegramContextKey);
    return raw ? (JSON.parse(raw) as PendingTelegramContext) : null;
  } catch {
    return null;
  }
}

export function writePendingTelegramContext(value: PendingTelegramContext) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(telegramContextKey, JSON.stringify(value));
}

export function clearPendingTelegramContext() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(telegramContextKey);
}
