import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, Trash2, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { toastSupaError } from "@/lib/supaError";
import { useAuth } from "@/hooks/useAuth";

const DAY_MAP: Record<string, number> = {
  "domingo": 0, "segunda": 1, "segunda-feira": 1, "terca": 2, "terça": 2, "terca-feira": 2, "terça-feira": 2,
  "quarta": 3, "quarta-feira": 3, "quinta": 4, "quinta-feira": 4, "sexta": 5, "sexta-feira": 5, "sabado": 6, "sábado": 6,
};
const DAY_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

type ExtractedRow = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  class_name: string;
  teacher_name: string;
  subject: string;
  room: string;
};

const ACCEPT = ".png,.jpg,.jpeg,.txt,image/png,image/jpeg,text/plain";
const MAX_MB = 15;

function normalizeDay(input: any): number {
  if (typeof input === "number") return input;
  const s = String(input || "").trim().toLowerCase();
  if (s in DAY_MAP) return DAY_MAP[s];
  const key = Object.keys(DAY_MAP).find((k) => s.includes(k));
  return key ? DAY_MAP[key] : 1;
}
function normalizeTime(t: any): string {
  const s = String(t || "").trim();
  const m = s.match(/(\d{1,2})[:hH.](\d{2})/);
  if (m) return `${m[1].padStart(2, "0")}:${m[2]}`;
  return s.slice(0, 5);
}
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const result = r.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function ScheduleImporter() {
  const { user, isAdmin, hasRole } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>("");
  const [rows, setRows] = useState<ExtractedRow[]>([]);
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadClasses = async () => {
    const { data } = await supabase.from("classes").select("id,name").order("order_position");
    setClasses((data as any) ?? []);
  };

  const pick = (f: File | null) => {
    if (!f) return;
    if (f.size > MAX_MB * 1024 * 1024) return toast.error(`Arquivo maior que ${MAX_MB}MB`);
    const okExt = /\.(pdf|png|jpe?g|txt)$/i.test(f.name);
    if (!okExt) return toast.error("Formato não suportado. Use PDF, PNG, JPG ou TXT.");
    setFile(f);
    setRows([]);
    setProgress(0);
    setStatus("");
  };

  const process = async () => {
    if (!file) return;
    try {
      setStatus("Validando arquivo...");
      setProgress(15);
      await loadClasses();

      let payload: any;
      if (file.type === "text/plain" || /\.txt$/i.test(file.name)) {
        const txt = await file.text();
        payload = { textContent: txt, fileName: file.name };
      } else {
        const b64 = await fileToBase64(file);
        const mime = file.type || (file.name.endsWith(".pdf") ? "application/pdf" : "image/png");
        payload = { fileBase64: b64, mimeType: mime, fileName: file.name };
      }

      setStatus("Analisando grade com Inteligência Artificial...");
      setProgress(45);

      const { data, error } = await supabase.functions.invoke("parse-schedule", { body: payload });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setStatus("Montando tabela de revisão...");
      setProgress(80);

      const parsed: ExtractedRow[] = (data?.rows ?? []).map((r: any) => ({
        day_of_week: normalizeDay(r.day_of_week),
        start_time: normalizeTime(r.start_time),
        end_time: normalizeTime(r.end_time),
        class_name: String(r.class_name || "").trim(),
        teacher_name: String(r.teacher_name || "").trim(),
        subject: String(r.subject || "").trim(),
        room: String(r.room || "").trim(),
      }));

      setRows(parsed);
      setProgress(100);
      setStatus(`Pronto para confirmação — ${parsed.length} aula(s) encontradas`);
      if (parsed.length === 0) toast.warning("A IA não encontrou aulas no documento.");
    } catch (e: any) {
      setStatus("");
      setProgress(0);
      toast.error(e?.message ?? "Erro ao processar");
    }
  };

  const updateRow = (i: number, patch: Partial<ExtractedRow>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const removeRow = (i: number) => setRows((rs) => rs.filter((_, idx) => idx !== i));

  const resolveClassId = (name: string): string | null => {
    const norm = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const m = classes.find((c) => c.name.toLowerCase().replace(/[^a-z0-9]/g, "") === norm);
    return m?.id ?? null;
  };

  const confirmSave = async () => {
    if (rows.length === 0) return;
    if (!user) return toast.error("Você precisa estar autenticado");
    // Validate
    const invalid: number[] = [];
    rows.forEach((r, i) => {
      if (!r.subject || !r.class_name || !r.start_time || !r.end_time) invalid.push(i + 1);
    });
    if (invalid.length) return toast.error(`Linhas inválidas: ${invalid.join(", ")}`);

    const unresolved = rows.filter((r) => !resolveClassId(r.class_name));
    if (unresolved.length) {
      const names = [...new Set(unresolved.map((r) => r.class_name))].join(", ");
      return toast.error(`Turmas não encontradas no sistema: ${names}. Crie em "Turmas" ou ajuste o nome.`);
    }

    setSaving(true);
    try {
      const teacherScoped = hasRole("teacher") && !isAdmin && !hasRole("secretary");
      const payload = rows.map((r) => ({
        class_id: resolveClassId(r.class_name)!,
        subject: r.subject,
        room: r.room || null,
        day_of_week: r.day_of_week,
        start_time: r.start_time.length === 5 ? `${r.start_time}:00` : r.start_time,
        end_time: r.end_time.length === 5 ? `${r.end_time}:00` : r.end_time,
        teacher_id: teacherScoped ? user.id : null,
      }));
      const { error } = await supabase.from("schedules").insert(payload);
      if (error) throw error;
      toast.success(`${payload.length} aula(s) importada(s) com sucesso!`);
      setRows([]);
      setFile(null);
      setProgress(0);
      setStatus("");
    } catch (e: any) {
      toastSupaError(e, { table: "schedules", op: "INSERT", action: "importar horários" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Leitura de Horários com IA</h2>
        <p className="text-sm text-zinc-400">Importe grades escolares em PDF, PNG, JPG ou TXT. A IA extrai e você confirma antes de salvar.</p>
      </div>

      {/* Dropzone */}
      <Card
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); pick(e.dataTransfer.files?.[0] ?? null); }}
        className={`p-6 border-2 border-dashed bg-zinc-900 ${dragOver ? "border-blue-500 bg-blue-950/20" : "border-zinc-700"}`}
      >
        <div className="flex flex-col items-center text-center gap-3">
          <Upload className="h-8 w-8 text-zinc-400" />
          <p className="text-sm text-zinc-300">Arraste o arquivo aqui ou clique para selecionar</p>
          <p className="text-xs text-zinc-500">PDF, PNG, JPG ou TXT (até {MAX_MB}MB)</p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
          />
          <Button variant="outline" onClick={() => inputRef.current?.click()}>Selecionar arquivo</Button>

          {file && (
            <div className="mt-3 flex items-center gap-2 bg-zinc-800 px-3 py-2 rounded text-sm">
              <FileText className="h-4 w-4" />
              <span className="truncate max-w-xs">{file.name}</span>
              <button onClick={() => { setFile(null); setRows([]); setProgress(0); setStatus(""); }} className="text-zinc-400 hover:text-red-400">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </Card>

      {file && (
        <div className="flex gap-2">
          <Button onClick={process} disabled={progress > 0 && progress < 100}>
            {progress > 0 && progress < 100 ? "Processando..." : "Processar com IA"}
          </Button>
        </div>
      )}

      {(progress > 0 || status) && (
        <Card className="p-4 bg-zinc-900 border-zinc-800 space-y-2">
          <div className="flex justify-between text-sm">
            <span>{status}</span>
            <span className="text-zinc-400">{progress}%</span>
          </div>
          <Progress value={progress} />
        </Card>
      )}

      {rows.length > 0 && (
        <Card className="p-4 bg-zinc-900 border-zinc-800 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-semibold">Revisão ({rows.length} aula(s))</h3>
            <Button onClick={confirmSave} disabled={saving} className="bg-green-600 hover:bg-green-500">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              {saving ? "Salvando..." : "Confirmar e Salvar no Banco"}
            </Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dia</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Fim</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Disciplina</TableHead>
                  <TableHead>Professor</TableHead>
                  <TableHead>Sala</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => {
                  const resolved = resolveClassId(r.class_name);
                  return (
                    <TableRow key={i} className={!resolved ? "bg-red-950/30" : ""}>
                      <TableCell className="p-1">
                        <Select value={String(r.day_of_week)} onValueChange={(v) => updateRow(i, { day_of_week: Number(v) })}>
                          <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {DAY_LABELS.map((d, idx) => <SelectItem key={idx} value={String(idx)}>{d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-1"><Input className="h-8 w-24" type="time" value={r.start_time} onChange={(e) => updateRow(i, { start_time: e.target.value })} /></TableCell>
                      <TableCell className="p-1"><Input className="h-8 w-24" type="time" value={r.end_time} onChange={(e) => updateRow(i, { end_time: e.target.value })} /></TableCell>
                      <TableCell className="p-1">
                        <Input
                          className={`h-8 w-24 ${!resolved ? "border-red-500" : ""}`}
                          value={r.class_name}
                          onChange={(e) => updateRow(i, { class_name: e.target.value })}
                          list={`classes-list-${i}`}
                        />
                        <datalist id={`classes-list-${i}`}>
                          {classes.map((c) => <option key={c.id} value={c.name} />)}
                        </datalist>
                      </TableCell>
                      <TableCell className="p-1"><Input className="h-8 min-w-[140px]" value={r.subject} onChange={(e) => updateRow(i, { subject: e.target.value })} /></TableCell>
                      <TableCell className="p-1"><Input className="h-8 min-w-[140px]" value={r.teacher_name} onChange={(e) => updateRow(i, { teacher_name: e.target.value })} /></TableCell>
                      <TableCell className="p-1"><Input className="h-8 w-20" value={r.room} onChange={(e) => updateRow(i, { room: e.target.value })} /></TableCell>
                      <TableCell className="p-1">
                        <Button size="icon" variant="ghost" onClick={() => removeRow(i)}>
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-zinc-500">
            Linhas em vermelho têm turma não cadastrada. Ajuste o nome para coincidir com uma turma existente ou cadastre em "Turmas".
            O campo Professor é informativo (não é persistido em `schedules` — vinculação por professor é feita em outra etapa).
          </p>
        </Card>
      )}
    </div>
  );
}
