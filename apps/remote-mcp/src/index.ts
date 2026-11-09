import { createClerkClient } from "@clerk/express";
import { generateClerkProtectedResourceMetadata } from "@clerk/mcp-tools/server";
import { McpServer, WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/server";
import {
  getErrorMessage,
  sendTelegramMessage,
  telegramMessageInputSchema,
} from "@samueldenzil-org/sendkit-core";
import { Context, Hono } from "hono";
import { cors } from "hono/cors";
import process from "node:process";

const clerkPublishableKey = process.env.CLERK_PUBLISHABLE_KEY;
const clerkSecretKey = process.env.CLERK_SECRET_KEY;

if (!clerkPublishableKey) {
  throw new Error("CLERK_PUBLISHABLE_KEY environment variable is required");
}

if (!clerkSecretKey) {
  throw new Error("CLERK_SECRET_KEY environment variable is required");
}

const clerkClient = createClerkClient({
  publishableKey: clerkPublishableKey,
  secretKey: clerkSecretKey,
});

function createServer(botToken: string) {
  const server = new McpServer({
    name: "sendkit-mcp",
    version: "0.0.0",
  });

  server.registerTool(
    "send_telegram_message",
    {
      title: "Send Telegram Message",
      description:
        "Send a message to a Telegram chat, group, or channel using the Telegram Bot API.",
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

const app = new Hono();

app.use("*", cors());

function protectedResourceMetadataUrl(c: Context, botToken?: string) {
  const path = botToken ? `/${botToken}/mcp` : "/mcp";
  return new URL(`/.well-known/oauth-protected-resource${path}`, c.req.url).toString();
}

function unauthorizedMcpResponse(c: Context, botToken?: string) {
  c.header(
    "WWW-Authenticate",
    `Bearer resource_metadata="${protectedResourceMetadataUrl(c, botToken)}"`,
  );

  return c.json({ error: "Unauthorized" }, 401);
}

// Clerk OAuth Protected Resource Metadata (RFC 9728)
app.get("/.well-known/oauth-protected-resource/mcp", (c) => {
  const resourceUrl = new URL("/mcp", c.req.url).toString();

  return c.json(
    generateClerkProtectedResourceMetadata({
      publishableKey: clerkPublishableKey,
      resourceUrl,
    }),
  );
});

app.get("/.well-known/oauth-protected-resource/:botToken/mcp", (c) => {
  const botToken = c.req.param("botToken");
  const resourceUrl = new URL(`/${botToken}/mcp`, c.req.url).toString();

  return c.json(
    generateClerkProtectedResourceMetadata({
      publishableKey: clerkPublishableKey,
      resourceUrl,
    }),
  );
});

function extractBotToken(c: Context): string | undefined {
  const headerToken = c.req.header("X-Telegram-Bot-Token");
  if (headerToken?.trim()) {
    return headerToken.trim();
  }

  const paramToken = c.req.param("botToken");
  if (paramToken?.trim()) {
    return paramToken.trim();
  }

  const envToken = process.env.TELEGRAM_BOT_TOKEN;
  if (envToken?.trim()) {
    return envToken.trim();
  }

  return undefined;
}

async function handleMcpRequest(c: Context) {
  const botToken = extractBotToken(c);

  if (!botToken) {
    return c.json(
      {
        error: "Bad Request",
        message:
          "Telegram bot token is required. Provide it via 'X-Telegram-Bot-Token' header, '/:botToken/mcp' path parameter, or configure TELEGRAM_BOT_TOKEN on the server.",
      },
      400,
    );
  }

  const authHeader = c.req.header("Authorization");
  if (!authHeader) {
    return unauthorizedMcpResponse(c, botToken);
  }

  try {
    const requestState = await clerkClient.authenticateRequest(c.req.raw, {
      acceptsToken: "oauth_token",
    });

    if (!requestState.isAuthenticated) {
      return unauthorizedMcpResponse(c, botToken);
    }
  } catch (error) {
    console.error("Clerk authentication error:", error);
    return unauthorizedMcpResponse(c, botToken);
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
app.all("/:botToken/mcp", handleMcpRequest);

app.notFound((c) => c.json({ error: "Not found" }, 404));

const port = Number(process.env.PORT ?? 3000);

export default {
  port,
  fetch: (req: Request) => {
    const url = new URL(req.url);

    const protoHeader = req.headers.get("x-forwarded-proto");
    if (protoHeader) {
      const proto = protoHeader.split(",")[0].trim();
      url.protocol = proto.endsWith(":") ? proto : `${proto}:`;
    }

    const hostHeader = req.headers.get("x-forwarded-host");
    if (hostHeader) {
      const host = hostHeader.split(",")[0].trim();
      url.host = host;
    }

    return app.fetch(new Request(url, req));
  },
};
