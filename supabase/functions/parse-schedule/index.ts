// Edge Function: parse-schedule
// Uses the official OpenAI API (via shared openaiService) to extract structured
// schedule rows from an image or text description of a school timetable.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { chatCompletion, OPENAI_MODEL } from "../_shared/openaiService.ts";

const SYSTEM_PROMPT = `Você é um assistente especializado em extração de dados estruturados de documentos escolares.

Analise o documento escolar enviado (imagem ou texto).

IMPORTANTE:
- O documento pode conter uma grade semanal completa OU apenas um único dia.
- Identifique corretamente o dia da semana de cada aula.
- Nunca deixe o campo day_of_week vazio.
- O documento pode conter turmas em colunas/cabeçalhos. Os horários normalmente estarão nas linhas.

Regras:
- Ignore completamente linhas contendo: INTERVALO, ALMOÇO, PAUSA, RECREIO, INTERVALLO.
- Extraia somente aulas válidas.

Retorne SOMENTE JSON no formato: {"rows": [ ... ]}. Sem markdown, sem explicações.

Cada objeto em rows deve ter EXATAMENTE estes campos:
{
  "day_of_week": "Segunda-feira" | "Terça-feira" | "Quarta-feira" | "Quinta-feira" | "Sexta-feira" | "Sábado" | "Domingo",
  "start_time": "HH:MM",
  "end_time": "HH:MM",
  "class_name": "ex: 1A, 2B, 3º Ano C",
  "teacher_name": "Nome do professor ou string vazia",
  "subject": "Nome da disciplina",
  "room": "Sala ou string vazia"
}`;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const reqId = crypto.randomUUID().slice(0, 8);
  const log = (...args: unknown[]) => console.log(`[parse-schedule ${reqId}]`, ...args);

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return jsonResponse({ error: `Método ${req.method} não permitido. Use POST.` }, 405);
  }

  log("start", { method: req.method, url: req.url });

  // Key presence check (does NOT reveal the value)
  const hasKey = Boolean(Deno.env.get("OPENAI_API_KEY"));
  log("openai_key_present:", hasKey, "model:", OPENAI_MODEL);
  if (!hasKey) {
    return jsonResponse(
      { error: "OPENAI_API_KEY não está configurada no backend. Adicione o secret e refaça a chamada." },
      500,
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch (e) {
    log("invalid_json", (e as Error).message);
    return jsonResponse({ error: "Corpo inválido. Envie JSON com Content-Type: application/json." }, 400);
  }

  const { fileBase64, mimeType, textContent, fileName } = body ?? {};
  log("payload", {
    fileName,
    mimeType,
    hasText: Boolean(textContent),
    fileBase64Len: fileBase64 ? String(fileBase64).length : 0,
  });

  const userContent: any[] = [
    { type: "text", text: "Extraia as aulas deste documento escolar e retorne apenas o JSON no formato solicitado." },
  ];

  if (textContent && typeof textContent === "string" && textContent.trim()) {
    userContent.push({ type: "text", text: `Conteúdo do arquivo:\n${textContent}` });
  } else if (fileBase64 && mimeType) {
    if (typeof mimeType === "string" && mimeType.startsWith("image/")) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${mimeType};base64,${fileBase64}` },
      });
    } else {
      return jsonResponse(
        { error: `Tipo "${mimeType}" não suportado pela OpenAI Chat API. Envie uma imagem (PNG/JPG) ou texto (textContent).` },
        400,
      );
    }
  } else {
    return jsonResponse({ error: "Envie textContent (string) ou fileBase64 + mimeType (imagem)." }, 400);
  }

  try {
    log("calling_openai", { model: OPENAI_MODEL });
    const { content } = await chatCompletion(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      { response_format: { type: "json_object" } },
    );
    log("openai_ok", { contentPreview: String(content).slice(0, 200) });

    const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    let rows: any[] = [];
    try {
      const parsed = JSON.parse(cleaned);
      rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.rows) ? parsed.rows : [];
    } catch {
      const m = cleaned.match(/\[[\s\S]*\]/);
      if (m) rows = JSON.parse(m[0]);
    }

    log("done", { rowCount: rows.length });
    return jsonResponse({ rows });
  } catch (e: any) {
    const rawMsg: string = e?.message ?? "Erro desconhecido ao chamar OpenAI";
    const status: number = e?.status ?? 500;

    // Detect quota / billing problems from OpenAI and surface a clear message
    let friendly = rawMsg;
    if (/insufficient_quota|exceeded your current quota|billing/i.test(rawMsg)) {
      friendly =
        "A conta da OpenAI está sem créditos/quota. Verifique o plano e a cobrança em https://platform.openai.com/account/billing e adicione créditos ou atualize o plano. Depois tente novamente.";
    } else if (/invalid_api_key|Incorrect API key/i.test(rawMsg)) {
      friendly = "A OPENAI_API_KEY é inválida. Atualize o secret com uma chave válida.";
    } else if (/model.*(does not exist|not found)/i.test(rawMsg)) {
      friendly = `O modelo "${OPENAI_MODEL}" não existe ou não está disponível para esta chave. Ajuste o secret OPENAI_MODEL (ex.: gpt-4o, gpt-4o-mini).`;
    } else if (/rate limit/i.test(rawMsg)) {
      friendly = "Limite de requisições da OpenAI atingido. Aguarde alguns segundos e tente de novo.";
    }

    console.error(`[parse-schedule ${reqId}] openai_error`, { status, rawMsg, stack: e?.stack });
    return jsonResponse({ error: friendly, detail: rawMsg, status }, status);
  }
});
