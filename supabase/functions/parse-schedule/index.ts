// Edge Function: parse-schedule
// Uses the official OpenAI API (via shared openaiService) to extract structured
// schedule rows from an image or text description of a school timetable.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { chatCompletion } from "../_shared/openaiService.ts";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { fileBase64, mimeType, textContent } = await req.json();

    const userContent: any[] = [
      { type: "text", text: "Extraia as aulas deste documento escolar e retorne apenas o JSON no formato solicitado." },
    ];

    if (textContent && typeof textContent === "string" && textContent.trim()) {
      userContent.push({ type: "text", text: `Conteúdo do arquivo:\n${textContent}` });
    } else if (fileBase64 && mimeType) {
      if (mimeType.startsWith("image/")) {
        userContent.push({
          type: "image_url",
          image_url: { url: `data:${mimeType};base64,${fileBase64}` },
        });
      } else {
        return new Response(
          JSON.stringify({ error: "Tipo não suportado pela API da OpenAI neste endpoint. Envie uma imagem ou texto (textContent)." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    } else {
      return new Response(JSON.stringify({ error: "Envie textContent ou fileBase64+mimeType (imagem)." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { content } = await chatCompletion(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      { response_format: { type: "json_object" } },
    );

    const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    let rows: any[] = [];
    try {
      const parsed = JSON.parse(cleaned);
      rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.rows) ? parsed.rows : [];
    } catch {
      const m = cleaned.match(/\[[\s\S]*\]/);
      if (m) rows = JSON.parse(m[0]);
    }

    return new Response(JSON.stringify({ rows }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    const status = e?.status ?? 500;
    return new Response(JSON.stringify({ error: e?.message ?? "Erro desconhecido" }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
