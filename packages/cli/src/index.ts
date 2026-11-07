import { Command } from "commander";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { getErrorMessage, sendTelegramMessage } from "sendkit-core";
import { z } from "zod";

const program = new Command();
const configPath = join(homedir(), ".config", "sendkit", "config.json");
const cliConfigSchema = z.object({
  telegramBotToken: z.string().trim().min(1).optional(),
});

function writeTelegramBotToken(token: string) {
  const trimmedToken = token.trim();

  if (!trimmedToken) {
    throw new Error(
      "Telegram Bot token cannot be empty. Please provide a valid bot token obtained from @BotFather.",
    );
  }

  let existingConfig: Record<string, unknown> = {};
  if (existsSync(configPath)) {
    try {
      const raw = JSON.parse(readFileSync(configPath, "utf-8"));
      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        existingConfig = raw;
      }
    } catch {
      existingConfig = {};
    }
  }

  mkdirSync(dirname(configPath), { recursive: true, mode: 0o700 });
  writeFileSync(
    configPath,
    `${JSON.stringify({ ...existingConfig, telegramBotToken: trimmedToken }, null, 2)}\n`,
    { mode: 0o600 },
  );
}

function getTelegramBotToken() {
  if (!existsSync(configPath)) {
    throw new Error(
      "No Telegram Bot token configured. Run `sendkit init --telegram-bot-token <token>` to set up your credentials.",
    );
  }

  let parsed: unknown;
  try {
    const raw = readFileSync(configPath, "utf-8");
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `SendKit configuration file at ${configPath} is corrupted or contains invalid JSON. Run \`sendkit init --telegram-bot-token <token>\` to reconfigure your credentials.`,
      { cause: error },
    );
  }

  const result = cliConfigSchema.safeParse(parsed);
  if (!result.success || !result.data.telegramBotToken) {
    throw new Error(
      "No Telegram Bot token configured. Run `sendkit init --telegram-bot-token <token>` to set up your credentials.",
    );
  }

  return result.data.telegramBotToken;
}

program
  .name("sendkit")
  .description(
    "SendKit CLI - Developer toolkit for sending messages across communication channels.",
  );

program
  .command("init")
  .description("Initialize and securely store your SendKit credentials locally")
  .requiredOption(
    "--telegram-bot-token <botToken>",
    "Telegram Bot token obtained from @BotFather (e.g. '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11')",
  )
  .action(async (options: { telegramBotToken: string }) => {
    writeTelegramBotToken(options.telegramBotToken);
    console.log(`Configuration saved successfully to ${configPath}`);
  });

program
  .command("telegram")
  .description("Send a message to a Telegram chat, group, or channel")
  .argument(
    "<chatId>",
    "Destination Telegram chat ID (numeric user ID, group ID, or public @channelusername)",
  )
  .argument("<message>", "Message text to deliver (supports up to 4,096 characters)")
  .action(async (chatId: string, message: string) => {
    const result = await sendTelegramMessage({
      botToken: getTelegramBotToken(),
      chatId,
      message,
    });

    console.log(JSON.stringify(result));
  });

await program.parseAsync(process.argv).catch((error) => {
  console.error(getErrorMessage(error));
  process.exitCode = 1;
});
