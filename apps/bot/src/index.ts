import { parseBotEnv } from "@repo/config";
import { Bot, InlineKeyboard } from "grammy";
import { createHmac } from "node:crypto";

const env = parseBotEnv(process.env);
const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

function buildSignedWebAppUrl(telegramId: number, chatId: number, linkToken?: string) {
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = `${telegramId}:${chatId}:${timestamp}`;
  const signature = createHmac("sha256", env.BOT_SHARED_SECRET).update(payload).digest("hex");
  const webAppUrl = new URL(env.WEB_APP_URL);

  webAppUrl.searchParams.set("telegramId", String(telegramId));
  webAppUrl.searchParams.set("chatId", String(chatId));
  webAppUrl.searchParams.set("timestamp", String(timestamp));
  webAppUrl.searchParams.set("signature", signature);

  if (linkToken) {
    webAppUrl.searchParams.set("linkToken", linkToken);
  }

  return webAppUrl.toString();
}

bot.command("start", async (ctx) => {
  if (!ctx.from) {
    await ctx.reply("Could not detect your Telegram profile. Please try again.");
    return;
  }

  const startPayload = typeof ctx.msg?.text === "string" ? ctx.msg.text.split(/\s+/).slice(1).join(" ").trim() : "";
  const signedUrl = buildSignedWebAppUrl(ctx.from.id, ctx.chat?.id ?? ctx.from.id, startPayload || undefined);
  const keyboard = new InlineKeyboard().webApp("Open app", signedUrl);

  await ctx.reply(
    [
      "Welcome to Couple Finance Tracker.",
      "",
      "Tap Open app to manage your profile, add income/expense, and connect with your partner using couple code."
    ].join("\n"),
    {
      reply_markup: keyboard
    }
  );
});

bot.catch((error) => {
  console.error("Bot runtime error", error.error);
});

bot.start({
  onStart: () => {
    console.log("Bot started");
  }
});
