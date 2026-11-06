import {
  McpServer,
  WebStandardStreamableHTTPServerTransport,
} from "@modelcontextprotocol/server";
import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import process from "node:process";
import {
  getErrorMessage,
  sendTelegramMessage,
  telegramMessageInputSchema,
} from "sendkit-core";

function createServer(botToken: string) {
  const server = new McpServer({
    name: "sendkit-mcp",
    version: "0.0.0",
  });

  server.registerTool(
    "send_telegram_message",
    {
      title: "Telegram",
      description: "Send a Telegram message to a specified chat.",
      inputSchema: telegramMessageInputSchema,
    },
    async (input) => {
      try {
        const result = await sendTelegramMessage({
          ...input,
          botToken,
        });

        return {
          content: [
            {
              type: "text",
              text: `Sent Telegram message ${result.messageId} to chat ${result.chatId}`,
            },
          ],
          structuredContent: result,
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: getErrorMessage(error, botToken),
            },
          ],
        };
      }
    },
  );

  return server;
}

function extractBotToken(c: Context): string | undefined {
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }

  const customHeader = c.req.header("X-Telegram-Bot-Token");
  if (customHeader?.trim()) {
    return customHeader.trim();
  }

  const paramToken = c.req.param("botToken");
  if (paramToken?.trim()) {
    return paramToken.trim();
  }

  return undefined;
}

const app = new Hono();

app.use("*", cors());

async function handleMcpRequest(c: Context) {
  const botToken = extractBotToken(c);

  if (!botToken) {
    return c.json(
      {
        error: "Unauthorized",
        message:
          "Telegram bot token is required. Provide it via 'Authorization: Bearer <token>', 'X-Telegram-Bot-Token' header.",
      },
      401,
    );
  }

  const server = createServer(botToken);

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await server.connect(transport);

  try {
    return await transport.handleRequest(c.req.raw);
  } catch (error) {
    await server.close();
    return c.json(
      {
        error: "Internal MCP server error",
        detail: getErrorMessage(error, botToken),
      },
      500,
    );
  }
}

app.all("/mcp", handleMcpRequest);

app.notFound((c) => c.json({ error: "Not found" }, 404));

const port = Number(process.env.PORT ?? 3000);

export default {
  port,
  fetch: app.fetch,
};
