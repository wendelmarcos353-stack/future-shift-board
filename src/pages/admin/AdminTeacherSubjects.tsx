import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Pencil } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toastSupaError } from "@/lib/supaError";

type ClassRow = { id: string; name: string; grade: number; order_position: number };
type Teacher = { id: string; display_name: string | null; avatar_url: string | null };
type Row = {
  id: string;
  class_id: string | null;
  subject: string;
  teacher_id: string;
};

const ALL_CLASSES = "__all__";

export default function AdminTeacherSubjects() {
  const { hasRole, isAdmin } = useAuth();
  const canEdit = isAdmin || hasRole("secretary");
  const [rows, setRows] = useState<Row[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Row | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const [r, c, t, s] = await Promise.all([
      supabase.from("teacher_subjects").select("*").order("subject"),
      supabase.from("classes").select("id,name,grade,order_position").eq("active", true).order("order_position"),
      supabase.from("teacher_directory").select("id,display_name,avatar_url").order("display_name"),
      supabase.from("schedules").select("subject"),
    ]);
    if (r.data) setRows(r.data as any);
    if (c.data) setClasses(c.data as any);
    if (t.data) setTeachers(t.data as any);
    if (s.data) {
      const set = new Set<string>();
      (s.data as { subject: string }[]).forEach((x) => x.subject && set.add(x.subject));
      setSubjects(Array.from(set).sort());
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const classMap = useMemo(() => Object.fromEntries(classes.map((c) => [c.id, c.name])), [classes]);
  const teacherMap = useMemo(() => Object.fromEntries(teachers.map((t) => [t.id, t])), [teachers]);

  const startNew = () => { setEditing({ id: "", class_id: null, subject: "", teacher_id: "" }); setOpen(true); };
  const startEdit = (row: Row) => { setEditing({ ...row }); setOpen(true); };

  const save = async () => {
    if (!editing) return;
    if (!editing.subject.trim() || !editing.teacher_id) {
      toast.error("Preencha disciplina e professor");
      return;
    }
    const payload = {
      class_id: editing.class_id,
      subject: editing.subject.trim(),
      teacher_id: editing.teacher_id,
    };
    const res = editing.id
      ? await supabase.from("teacher_subjects").update(payload).eq("id", editing.id)
      : await supabase.from("teacher_subjects").insert(payload);
    if (res.error) return toastSupaError(res.error, { table: "teacher_subjects", op: editing.id ? "UPDATE" : "INSERT" });
    toast.success("Vínculo salvo");
    setOpen(false);
    setEditing(null);
    load();
  };

  const remove = async (row: Row) => {
    if (!confirm(`Remover vínculo de ${row.subject}?`)) return;
    const { error } = await supabase.from("teacher_subjects").delete().eq("id", row.id);
    if (error) return toastSupaError(error, { table: "teacher_subjects", op: "DELETE" });
    toast.success("Removido");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Professores por Disciplina</h1>
          <p className="text-zinc-400 text-sm">Vincule manualmente quem leciona cada disciplina em cada turma.</p>
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button onClick={startNew} className="bg-blue-600 hover:bg-blue-500">
                <Plus className="h-4 w-4 mr-1" />Novo vínculo
              </Button>
            </DialogTrigger>
            {editing && (
              <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                <DialogHeader><DialogTitle>{editing.id ? "Editar vínculo" : "Novo vínculo"}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Turma</Label>
                    <Select
                      value={editing.class_id ?? ALL_CLASSES}
                      onValueChange={(v) => setEditing({ ...editing, class_id: v === ALL_CLASSES ? null : v })}
                    >
                      <SelectTrigger className="bg-zinc-950 border-zinc-800"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-h-72">
                        <SelectItem value={ALL_CLASSES}>Todas as turmas</SelectItem>
                        {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Disciplina</Label>
                    <Input
                      list="subject-suggestions"
                      value={editing.subject}
                      onChange={(e) => setEditing({ ...editing, subject: e.target.value })}
                      className="bg-zinc-950 border-zinc-800"
                      placeholder="Ex.: MAT, LING PORT..."
                    />
                    <datalist id="subject-suggestions">
                      {subjects.map((s) => <option key={s} value={s} />)}
                    </datalist>
                  </div>
                  <div>
                    <Label>Professor</Label>
                    <Select value={editing.teacher_id} onValueChange={(v) => setEditing({ ...editing, teacher_id: v })}>
                      <SelectTrigger className="bg-zinc-950 border-zinc-800"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-h-72">
                        {teachers.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.display_name || t.id.slice(0, 8)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button onClick={save} className="bg-blue-600 hover:bg-blue-500">Salvar</Button>
                </DialogFooter>
              </DialogContent>
            )}
          </Dialog>
        )}
      </div>

      <div className="rounded-lg border border-zinc-800 overflow-hidden bg-zinc-900/40">
        {loading ? (
          <div className="p-10 text-center text-zinc-400"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Carregando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 text-zinc-400">
              <tr>
                <th className="text-left p-3">Turma</th>
                <th className="text-left p-3">Disciplina</th>
                <th className="text-left p-3">Professor</th>
                {canEdit && <th className="text-right p-3">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const t = teacherMap[r.teacher_id];
                return (
                  <tr key={r.id} className="border-t border-zinc-800 hover:bg-zinc-900/60">
                    <td className="p-3">{r.class_id ? classMap[r.class_id] ?? "—" : <span className="text-zinc-500">Todas</span>}</td>
                    <td className="p-3 font-medium">{r.subject}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {t?.avatar_url ? (
                          <img src={t.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs">👤</div>
                        )}
                        <span>{t?.display_name ?? "—"}</span>
                      </div>
                    </td>
                    {canEdit && (
                      <td className="p-3 text-right space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => startEdit(r)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(r)}><Trash2 className="h-4 w-4 text-red-400" /></Button>
                      </td>
                    )}
                  </tr>
                );
              })}
              {!rows.length && (
                <tr><td colSpan={canEdit ? 4 : 3} className="text-center p-8 text-zinc-500">Nenhum vínculo cadastrado.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
