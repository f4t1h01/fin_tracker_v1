const telegramContextKey = "duet-telegram-context";

export type PendingTelegramContext =
  | {
      kind: "telegram-webapp";
      initData: string;
      linkToken: string | null;
    }
  | {
      kind: "bot-webapp";
      telegramId: string;
      chatId: string | null;
      timestamp: number;
      signature: string;
      linkToken: string | null;
    };

export function detectTelegramContextFromWindow(): PendingTelegramContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  const initData = window.Telegram?.WebApp?.initData?.trim();
  const params = new URLSearchParams(window.location.search);
  const linkToken = params.get("linkToken") ?? params.get("tgWebAppStartParam");

  if (initData) {
    return {
      kind: "telegram-webapp",
      initData,
      linkToken
    };
  }

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
      signature,
      linkToken
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
