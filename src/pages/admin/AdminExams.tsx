import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { toastSupaError } from "@/lib/supaError";

type Cls = { id: string; name: string; order_position: number };
type Exam = {
  id: string;
  class_id: string;
  subject: string;
  room: string | null;
  exam_date: string;
  start_time: string | null;
  end_time: string | null;
  description: string | null;
  active: boolean;
};

const empty = (): Partial<Exam> => ({
  class_id: "", subject: "", room: "", exam_date: new Date().toISOString().slice(0,10),
  start_time: "08:00", end_time: "09:30", description: "", active: true,
});

export default function AdminExams() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<Cls[]>([]);
  const [items, setItems] = useState<Exam[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Exam>>(empty());
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    const [c, e] = await Promise.all([
      supabase.from("classes").select("id,name,order_position").order("order_position"),
      supabase.from("exams").select("*").order("exam_date"),
    ]);
    setClasses((c.data as any) || []);
    setItems((e.data as any) || []);
  };
  useEffect(() => {
    load();
    const ch = supabase.channel("admin-exams")
      .on("postgres_changes", { event: "*", schema: "public", table: "exams" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const openNew = () => { setEditingId(null); setForm(empty()); setOpen(true); };
  const openEdit = (e: Exam) => { setEditingId(e.id); setForm(e); setOpen(true); };

  const save = async () => {
    if (!form.class_id || !form.subject || !form.exam_date) {
      return toast.error("Preencha turma, disciplina e data");
    }
    const payload: any = {
      class_id: form.class_id, subject: form.subject, room: form.room || null,
      exam_date: form.exam_date, start_time: form.start_time || null,
      end_time: form.end_time || null, description: form.description || null,
      active: form.active ?? true,
    };
    const res = editingId
      ? await supabase.from("exams").update(payload).eq("id", editingId)
      : await supabase.from("exams").insert({ ...payload, created_by: user?.id });
    if (res.error) return toastSupaError(res.error, { table: "exams", op: editingId ? "UPDATE" : "INSERT", action: "salvar prova" });
    toast.success("Salvo");
    setOpen(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir prova?")) return;
    const { error } = await supabase.from("exams").delete().eq("id", id);
    if (error) return toastSupaError(error, { table: "exams", op: "DELETE", action: "excluir prova" });
    toast.success("Excluída");
  };

  const classMap = Object.fromEntries(classes.map(c => [c.id, c.name]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Provas</h1>
        <Button onClick={openNew} className="bg-blue-600 hover:bg-blue-500">
          <Plus className="w-4 h-4 mr-2" /> Nova prova
        </Button>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        {items.length === 0 ? (
          <p className="p-8 text-center text-zinc-500">Nenhuma prova cadastrada</p>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {items.map(e => (
              <li key={e.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {e.subject} <span className="text-zinc-400">· {classMap[e.class_id] ?? "?"}</span>
                    {!e.active && <span className="ml-2 text-xs text-amber-400">inativa</span>}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {new Date(e.exam_date + "T00:00").toLocaleDateString("pt-BR")}
                    {e.start_time ? ` · ${e.start_time.slice(0,5)}` : ""}
                    {e.end_time ? `–${e.end_time.slice(0,5)}` : ""}
                    {e.room ? ` · Sala ${e.room}` : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(e)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(e.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-2xl">
          <DialogHeader><DialogTitle>{editingId ? "Editar" : "Nova"} prova</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Turma</Label>
              <Select value={form.class_id} onValueChange={(v) => setForm(f => ({ ...f, class_id: v }))}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Disciplina</Label>
              <Input className="bg-zinc-800 border-zinc-700" value={form.subject ?? ""} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
            </div>
            <div>
              <Label>Data</Label>
              <Input type="date" className="bg-zinc-800 border-zinc-700" value={form.exam_date ?? ""} onChange={e => setForm(f => ({ ...f, exam_date: e.target.value }))} />
            </div>
            <div>
              <Label>Sala</Label>
              <Input className="bg-zinc-800 border-zinc-700" value={form.room ?? ""} onChange={e => setForm(f => ({ ...f, room: e.target.value }))} />
            </div>
            <div>
              <Label>Início</Label>
              <Input type="time" className="bg-zinc-800 border-zinc-700" value={form.start_time ?? ""} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
            </div>
            <div>
              <Label>Término</Label>
              <Input type="time" className="bg-zinc-800 border-zinc-700" value={form.end_time ?? ""} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <Label>Observações</Label>
              <Textarea className="bg-zinc-800 border-zinc-700" value={form.description ?? ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="md:col-span-2 flex items-center gap-3">
              <Switch checked={form.active ?? true} onCheckedChange={(v) => setForm(f => ({ ...f, active: v }))} />
              <Label>Ativa (exibir publicamente e no Modo TV)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="bg-zinc-800 border-zinc-700">Cancelar</Button>
            <Button onClick={save} className="bg-blue-600 hover:bg-blue-500">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
