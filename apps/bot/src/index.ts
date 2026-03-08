import { parseBotEnv } from "@repo/config";
import { Bot, InlineKeyboard, Keyboard } from "grammy";
import { createHmac } from "node:crypto";

const env = parseBotEnv(process.env);
const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

function buildSignedWebAppUrl(
  telegramId: number,
  chatId: number,
  linkToken?: string,
) {
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = `${telegramId}:${chatId}:${timestamp}`;
  const signature = createHmac("sha256", env.BOT_SHARED_SECRET)
    .update(payload)
    .digest("hex");
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

async function postToApi(path: string, body: Record<string, unknown>) {
  const response = await fetch(`${env.API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-bot-secret": env.BOT_SHARED_SECRET,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(
      payload?.message || `API request failed with status ${response.status}`,
    );
  }

  return response.json();
}

bot.command("start", async (ctx) => {
  if (!ctx.from) {
    await ctx.reply(
      "Could not detect your Telegram profile. Please try again.",
    );
    return;
  }

  const startPayload =
    typeof ctx.msg?.text === "string"
      ? ctx.msg.text.split(/\s+/).slice(1).join(" ").trim()
      : "";
  const signedUrl = buildSignedWebAppUrl(
    ctx.from.id,
    ctx.chat?.id ?? ctx.from.id,
    startPayload || undefined,
  );
  const keyboard = new InlineKeyboard().webApp("Open app", signedUrl);

  if (startPayload) {
    try {
      const linked = (await postToApi("/bot/link-telegram-profile", {
        linkToken: startPayload,
        telegramId: String(ctx.from.id),
        chatId: ctx.chat?.id ? String(ctx.chat.id) : undefined,
        username: ctx.from.username,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name,
      })) as { telegramPhone?: string | null };

      await ctx.reply(
        [
          "Telegram account connected successfully.",
          "",
          "Tap Open app to continue in Duet.",
        ].join("\n"),
        {
          reply_markup: keyboard,
        },
      );

      if (!linked.telegramPhone) {
        await ctx.reply(
          "Optional: share your phone number so we can save it in your bound account.",
          {
            reply_markup: new Keyboard()
              .requestContact("Share phone number")
              .resized()
              .oneTime(),
          },
        );
      }

      return;
    } catch (error) {
      await ctx.reply(
        error instanceof Error
          ? error.message
          : "Could not connect this Telegram account right now.",
      );
      return;
    }
  }

  await ctx.reply(
    [
      "Welcome to Couple Finance Tracker.",
      "",
      "Tap Open app to manage your profile, add income/expense, and connect with your partner using couple code.",
    ].join("\n"),
    {
      reply_markup: keyboard,
    },
  );
});

bot.on("message:contact", async (ctx) => {
  if (!ctx.from || !ctx.message?.contact) {
    return;
  }

  const contact = ctx.message.contact;
  if (contact.user_id !== ctx.from.id) {
    await ctx.reply("Please share your own Telegram phone number.", {
      reply_markup: {
        remove_keyboard: true,
      },
    });
    return;
  }

  try {
    await postToApi("/bot/store-telegram-phone", {
      telegramId: String(ctx.from.id),
      phoneNumber: contact.phone_number,
    });

    await ctx.reply("Phone number saved. You can return to the app.", {
      reply_markup: {
        remove_keyboard: true,
      },
    });
  } catch (error) {
    await ctx.reply(
      error instanceof Error
        ? error.message
        : "Could not save your phone number.",
      {
        reply_markup: {
          remove_keyboard: true,
        },
      },
    );
  }
});

bot.catch((error) => {
  console.error("Bot runtime error", error.error);
});

bot.start({
  onStart: () => {
    console.log("Bot started");
  },
});
