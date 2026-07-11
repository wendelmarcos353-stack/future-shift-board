import { toast } from "sonner";

type SupaOp = "INSERT" | "UPDATE" | "DELETE" | "SELECT" | "UPLOAD" | "RPC";

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
      "Sem permissão para esta operação neste registro. Verifique se você está autenticado e se seu cargo tem acesso.";
  } else if (isNotNull) reason = `Campo obrigatório vazio. ${details || message}`;
  else if (isFk) reason = `Referência inválida. ${details || message}`;
  else if (isUnique) reason = `Registro duplicado. ${details || message}`;
  else if (isCheck) reason = `Valor inválido. ${details || message}`;

  const parts = [
    head,
    ctx.table ? `Tabela: ${ctx.table}` : null,
    ctx.op ? `Operação: ${ctx.op}` : null,
    `Motivo: ${reason}`,
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
