// Lovable Cloud Edge Function: parse-schedule
// Accepts { fileBase64, mimeType, fileName } and uses Lovable AI (Gemini multimodal)
// to extract a normalized array of schedule rows.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const SYSTEM_PROMPT = `Você é um assistente especializado em extração de dados estruturados de documentos escolares.

Analise o documento escolar enviado (pode ser imagem, PDF ou texto).

IMPORTANTE:
- O documento pode conter uma grade semanal completa OU apenas um único dia.
- Identifique corretamente o dia da semana de cada aula.
- Nunca deixe o campo day_of_week vazio.
- O documento pode conter turmas em colunas/cabeçalhos. Os horários normalmente estarão nas linhas.

Regras:
- Ignore completamente linhas contendo: INTERVALO, ALMOÇO, PAUSA, RECREIO, INTERVALLO.
- Extraia somente aulas válidas.

Retorne SOMENTE um array JSON puro. Sem markdown, sem explicações.

Cada objeto deve ter EXATAMENTE estes campos:
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
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY ausente" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { fileBase64, mimeType, fileName, textContent } = await req.json();

    // Build multimodal user content
    const userContent: any[] = [
      { type: "text", text: "Extraia as aulas deste documento escolar e retorne apenas o array JSON." },
    ];

    if (textContent && typeof textContent === "string" && textContent.trim()) {
      userContent.push({ type: "text", text: `Conteúdo do arquivo:\n${textContent}` });
    } else if (fileBase64 && mimeType) {
      if (mimeType.startsWith("image/")) {
        userContent.push({
          type: "image_url",
          image_url: { url: `data:${mimeType};base64,${fileBase64}` },
        });
      } else if (mimeType === "application/pdf") {
        userContent.push({
          type: "file",
          file: {
            filename: fileName || "horario.pdf",
            file_data: `data:application/pdf;base64,${fileBase64}`,
          },
        });
      } else {
        return new Response(JSON.stringify({ error: "Tipo de arquivo não suportado: " + mimeType }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      return new Response(JSON.stringify({ error: "Envie textContent ou fileBase64+mimeType" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      const status = aiResp.status === 429 || aiResp.status === 402 ? aiResp.status : 500;
      return new Response(JSON.stringify({ error: `IA falhou (${aiResp.status}): ${errText}` }), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? "";
    // Strip markdown fences if present
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    let rows: any[] = [];
    try {
      rows = JSON.parse(cleaned);
    } catch {
      // Try to find array substring
      const m = cleaned.match(/\[[\s\S]*\]/);
      if (m) rows = JSON.parse(m[0]);
    }
    if (!Array.isArray(rows)) rows = [];

    return new Response(JSON.stringify({ rows }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
