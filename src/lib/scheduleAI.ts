/**
 * Extração de grades escolares usando a camada de IA (Gemini).
 * Substitui a antiga Edge Function `parse-schedule` (OpenAI).
 */
import { perguntarIA } from "@/lib/gemini";

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

export type ScheduleAIInput =
  | { textContent: string }
  | { fileBase64: string; mimeType: string };

export async function extrairHorarios(input: ScheduleAIInput): Promise<any[]> {
  const base = "Extraia as aulas deste documento escolar e retorne apenas o JSON no formato solicitado.";

  const pergunta =
    "textContent" in input ? `${base}\n\nConteúdo do arquivo:\n${input.textContent}` : base;

  const resposta = await perguntarIA(pergunta, {
    systemInstruction: SYSTEM_PROMPT,
    json: true,
    ...("fileBase64" in input
      ? { imagem: { base64: input.fileBase64, mimeType: input.mimeType } }
      : {}),
  });

  const cleaned = resposta
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.rows)) return parsed.rows;
    return [];
  } catch {
    const m = cleaned.match(/\[[\s\S]*\]/);
    return m ? JSON.parse(m[0]) : [];
  }
}
