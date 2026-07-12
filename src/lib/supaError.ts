import { toast } from "sonner";

type SupaOp = "INSERT" | "UPDATE" | "DELETE" | "SELECT" | "UPLOAD" | "RPC";

const rlsPolicyHints: Record<string, string> = {
  profiles: "Visitantes e usuários autenticados só podem editar o próprio perfil; direção pode administrar perfis.",
  announcements: "Apenas secretaria e direção podem criar, editar ou excluir avisos.",
  schedules: "Secretaria e direção gerenciam horários; professores só alteram horários vinculados ao próprio usuário.",
  lessons: "Secretaria e direção gerenciam aulas; professores só alteram aulas criadas por eles ou vinculadas ao próprio usuário.",
  contents: "Secretaria e direção gerenciam conteúdos; professores só alteram conteúdos próprios.",
  exams: "Secretaria e direção gerenciam provas/eventos; professores só alteram registros próprios ou vinculados ao próprio usuário.",
  media: "Secretaria e direção gerenciam mídia; professores gerenciam arquivos próprios; usuários comuns só enviam avatar do próprio perfil.",
  categories: "Apenas secretaria e direção podem gerenciar categorias.",
  classes: "Apenas secretaria e direção podem gerenciar turmas.",
  site_settings: "Apenas direção pode alterar configurações do site.",
  tv_settings: "Apenas direção pode alterar configurações do Modo TV.",
  storage: "A política de arquivos permite avatar apenas na pasta do próprio usuário e mídia administrativa apenas para cargos autorizados.",
};

export function describeSupaError(
  err: any,
  ctx: { table?: string; op?: SupaOp; action?: string } = {}
): string {
  const code: string | undefined = err?.code;
  const message: string = err?.message ?? err?.error_description ?? String(err ?? "Erro");
  const details = err?.details ?? "";
  const hint = err?.hint ?? "";

  const isRls =
    code === "42501" ||
    /row-level security|row level security|violates row-level/i.test(message);
  const isFk = code === "23503";
  const isNotNull = code === "23502";
  const isUnique = code === "23505";
  const isCheck = code === "23514";

  const head = ctx.action
    ? `Erro ao ${ctx.action}`
    : ctx.table
    ? `Erro em ${ctx.table}`
    : `Erro`;

  let reason = message;
  if (isRls) {
    reason =
      "A política RLS bloqueou esta operação porque o usuário não possui permissão de escrita para este registro.";
  } else if (isNotNull) reason = `Campo obrigatório vazio. ${details || message}`;
  else if (isFk) reason = `Referência inválida. ${details || message}`;
  else if (isUnique) reason = `Registro duplicado. ${details || message}`;
  else if (isCheck) reason = `Valor inválido. ${details || message}`;

  const parts = [
    head,
    ctx.table ? `Tabela: ${ctx.table}` : null,
    ctx.op ? `Operação: ${ctx.op}` : null,
    `Motivo: ${reason}`,
    ctx.table && rlsPolicyHints[ctx.table] ? `Política: ${rlsPolicyHints[ctx.table]}` : null,
  ].filter(Boolean);

  const full = parts.join(" · ");
  // Full stack in console for debugging
  // eslint-disable-next-line no-console
  console.error("[supa]", { ...ctx, code, message, details, hint, err });
  return full;
}

export function toastSupaError(err: any, ctx: Parameters<typeof describeSupaError>[1] = {}) {
  toast.error(describeSupaError(err, ctx));
}
