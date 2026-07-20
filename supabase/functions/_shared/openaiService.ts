// Shared OpenAI service — official OpenAI API.
// All AI features in this project route through this module.

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o";
const OPENAI_BASE_URL = "https://api.openai.com/v1";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | any[];
};

export type ChatOptions = {
  model?: string;
  temperature?: number;
  response_format?: { type: "json_object" | "text" };
  stream?: boolean;
};

export function assertOpenAIKey() {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY não configurada no backend.");
  }
}

/** Non-streaming chat completion via official OpenAI API. */
export async function chatCompletion(messages: ChatMessage[], opts: ChatOptions = {}) {
  assertOpenAIKey();
  const resp = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: opts.model ?? OPENAI_MODEL,
      messages,
      temperature: opts.temperature ?? 0.2,
      ...(opts.response_format ? { response_format: opts.response_format } : {}),
    }),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    const status = resp.status === 429 || resp.status === 402 ? resp.status : 500;
    throw Object.assign(new Error(`OpenAI falhou (${resp.status}): ${errText}`), { status });
  }
  const data = await resp.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";
  return { content, raw: data };
}

/** Streaming chat completion — returns the raw Response (SSE) to pipe to the client. */
export async function chatCompletionStream(messages: ChatMessage[], opts: ChatOptions = {}) {
  assertOpenAIKey();
  return await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: opts.model ?? OPENAI_MODEL,
      messages,
      temperature: opts.temperature ?? 0.2,
      stream: true,
    }),
  });
}

export { OPENAI_MODEL };
