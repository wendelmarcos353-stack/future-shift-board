/**
 * Camada única de IA do projeto — Google Gemini API (SDK oficial @google/genai).
 * Nenhuma outra IA (OpenAI, DeepSeek, etc.) é utilizada.
 */
import { GoogleGenAI } from "@google/genai";

export const GEMINI_MODEL = "gemini-2.5-flash";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

let client: GoogleGenAI | null = null;

/** Retorna o client, criando-o sob demanda. Lança erro amigável se a chave faltar. */
function getClient(): GoogleGenAI {
  if (!API_KEY) {
    throw new Error(
      "VITE_GEMINI_API_KEY não configurada. Adicione a chave no arquivo .env e reinicie o servidor.",
    );
  }
  if (!client) client = new GoogleGenAI({ apiKey: API_KEY });
  return client;
}

export function geminiConfigurado(): boolean {
  return Boolean(API_KEY);
}

/** Converte qualquer falha do SDK/rede numa mensagem clara em português. */
function traduzirErro(e: unknown): Error {
  const msg = e instanceof Error ? e.message : String(e);

  if (/API key not valid|API_KEY_INVALID|invalid api key|permission denied|401|403/i.test(msg)) {
    return new Error("Chave da API do Gemini inválida ou sem permissão. Verifique VITE_GEMINI_API_KEY.");
  }
  if (/Failed to fetch|NetworkError|ENOTFOUND|ECONNREFUSED|network/i.test(msg)) {
    return new Error("Sem conexão com a API do Gemini. Verifique sua internet e tente novamente.");
  }
  if (/quota|RESOURCE_EXHAUSTED|rate limit|429/i.test(msg)) {
    return new Error("Limite de uso do Gemini excedido. Aguarde alguns instantes e tente novamente.");
  }
  if (/500|503|INTERNAL|UNAVAILABLE/i.test(msg)) {
    return new Error("Erro interno na API do Gemini. Tente novamente em instantes.");
  }
  return new Error(msg || "Erro desconhecido ao consultar a IA.");
}

export type PerguntarOpcoes = {
  /** Instrução de sistema opcional. */
  systemInstruction?: string;
  /** Força resposta em JSON puro. */
  json?: boolean;
  /** Imagem opcional (base64 sem prefixo data:) para perguntas multimodais. */
  imagem?: { base64: string; mimeType: string };
};

/**
 * Função central de IA do sistema.
 * @param pergunta Texto da pergunta/instrução.
 * @returns Resposta textual do Gemini.
 */
export async function perguntarIA(pergunta: string, opcoes: PerguntarOpcoes = {}): Promise<string> {
  if (!pergunta?.trim() && !opcoes.imagem) {
    throw new Error("A pergunta não pode estar vazia.");
  }

  try {
    const ai = getClient();

    const parts: Array<Record<string, unknown>> = [{ text: pergunta }];
    if (opcoes.imagem) {
      parts.push({
        inlineData: { mimeType: opcoes.imagem.mimeType, data: opcoes.imagem.base64 },
      });
    }

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts }],
      config: {
        ...(opcoes.systemInstruction ? { systemInstruction: opcoes.systemInstruction } : {}),
        ...(opcoes.json ? { responseMimeType: "application/json" } : {}),
      },
    });

    const texto = response.text ?? "";
    if (!texto.trim()) throw new Error("A IA retornou uma resposta vazia.");
    return texto;
  } catch (e) {
    throw traduzirErro(e);
  }
}

export default perguntarIA;
