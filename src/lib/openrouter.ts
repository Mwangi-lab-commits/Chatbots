/**
 * OpenRouter chat client.
 *
 * OpenRouter uses an OpenAI-compatible chat completions API.
 * This file runs on the server only. Do not import it in a client component.
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-4o-mini";
const MAX_HISTORY_MESSAGES = 10;
const MAX_REPLY_LENGTH = 2000;
const REQUEST_TIMEOUT_MS = 10_000;

type ChatRole = "system" | "user" | "assistant";

export interface ChatHistoryItem {
  sender: string;
  content: string;
}

interface OpenRouterMessage {
  role: ChatRole;
  content: string;
}

interface OpenRouterResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
}

/**
 * Ask OpenRouter for a reply.
 * Returns null when the key is missing or the request fails.
 * The caller must use the rule-based reply as the fallback.
 */
export async function generateOpenRouterReply(
  systemPrompt: string,
  customerMessage: string,
  history: ChatHistoryItem[],
): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return null;

  const model = process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL;
  const historyMessages: OpenRouterMessage[] = history
    .slice(-MAX_HISTORY_MESSAGES)
    .map((item) => ({
      role: item.sender === "Bot" ? "assistant" : "user",
      content: item.content,
    }));

  const messages: OpenRouterMessage[] = [
    { role: "system", content: systemPrompt },
    ...historyMessages,
    { role: "user", content: customerMessage },
  ];

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "Chatbot Monitor",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.3,
        max_tokens: 300,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error(
        `OpenRouter returned ${response.status}: ${detail.slice(0, 300)}`,
      );
      return null;
    }

    const data = (await response.json()) as OpenRouterResponse;
    if (data.error?.message) {
      console.error(`OpenRouter error: ${data.error.message}`);
      return null;
    }

    const text = data.choices?.[0]?.message?.content;
    if (typeof text !== "string" || text.trim().length === 0) {
      console.error("OpenRouter returned an empty reply.");
      return null;
    }

    return text.trim().slice(0, MAX_REPLY_LENGTH);
  } catch (error) {
    console.error("OpenRouter request failed:", error);
    return null;
  }
}
