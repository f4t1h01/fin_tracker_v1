export const webEnv = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
  botName: process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME ?? ""
};
