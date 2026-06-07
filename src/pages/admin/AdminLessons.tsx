import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

type Cls = { id: string; name: string; order_position: number };
type Lesson = {
  id: string;
  class_id: string;
  teacher_id: string | null;
  subject: string;
  room: string | null;
  day_of_week: number | null;
  lesson_date: string | null;
  start_time: string;
  end_time: string;
  content: string | null;
  notes: string | null;
};

const DAYS = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];

const empty = (): Partial<Lesson> => ({
  class_id: "", subject: "", room: "", day_of_week: 1,
  start_time: "07:00", end_time: "07:50", content: "", notes: "", lesson_date: null,
});

export default function AdminLessons() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<Cls[]>([]);
  const [items, setItems] = useState<Lesson[]>([]);
  const [filterClass, setFilterClass] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Lesson>>(empty());
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    const [c, l] = await Promise.all([
      supabase.from("classes").select("id,name,order_position").order("order_position"),
      supabase.from("lessons").select("*").order("day_of_week").order("start_time"),
    ]);
    setClasses((c.data as any) || []);
    setItems((l.data as any) || []);
  };
  useEffect(() => {
    load();
    const ch = supabase.channel("admin-lessons")
      .on("postgres_changes", { event: "*", schema: "public", table: "lessons" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const openNew = () => { setEditingId(null); setForm(empty()); setOpen(true); };
  const openEdit = (l: Lesson) => { setEditingId(l.id); setForm(l); setOpen(true); };

  const save = async () => {
    if (!form.class_id || !form.subject || !form.start_time || !form.end_time) {
      return toast.error("Preencha turma, disciplina e horários");
    }
    const payload: any = {
      class_id: form.class_id,
      subject: form.subject,
      room: form.room || null,
      day_of_week: form.day_of_week ?? null,
      lesson_date: form.lesson_date || null,
      start_time: form.start_time,
      end_time: form.end_time,
      content: form.content || null,
      notes: form.notes || null,
      teacher_id: form.teacher_id || user?.id || null,
    };
    const res = editingId
      ? await supabase.from("lessons").update(payload).eq("id", editingId)
      : await supabase.from("lessons").insert({ ...payload, created_by: user?.id });
    if (res.error) return toast.error(res.error.message);
    toast.success("Salvo");
    setOpen(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir aula?")) return;
    const { error } = await supabase.from("lessons").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Excluída");
  };

  const visible = filterClass === "all" ? items : items.filter(i => i.class_id === filterClass);
  const classMap = Object.fromEntries(classes.map(c => [c.id, c.name]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Gerenciamento de Aulas</h1>
        <div className="flex gap-2">
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger className="w-48 bg-zinc-900 border-zinc-700"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as turmas</SelectItem>
              {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={openNew} className="bg-blue-600 hover:bg-blue-500">
            <Plus className="w-4 h-4 mr-2" /> Nova aula
          </Button>
        </div>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        {visible.length === 0 ? (
          <p className="p-8 text-center text-zinc-500">Nenhuma aula</p>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {visible.map(l => (
              <li key={l.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{l.subject} <span className="text-zinc-400">· {classMap[l.class_id] ?? "?"}</span></p>
                  <p className="text-xs text-zinc-400">
                    {l.day_of_week !== null ? DAYS[l.day_of_week] : l.lesson_date} ·
                    {" "}{l.start_time?.slice(0,5)}–{l.end_time?.slice(0,5)}
                    {l.room ? ` · Sala ${l.room}` : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(l)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(l.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-2xl">
          <DialogHeader><DialogTitle>{editingId ? "Editar" : "Nova"} aula</DialogTitle></DialogHeader>
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
              <Label>Dia da semana</Label>
              <Select value={String(form.day_of_week ?? "")} onValueChange={(v) => setForm(f => ({ ...f, day_of_week: Number(v) }))}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS.map((d,i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
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
            <div>
              <Label>Data específica (opcional)</Label>
              <Input type="date" className="bg-zinc-800 border-zinc-700" value={form.lesson_date ?? ""} onChange={e => setForm(f => ({ ...f, lesson_date: e.target.value || null }))} />
            </div>
            <div className="md:col-span-2">
              <Label>Conteúdo</Label>
              <Textarea className="bg-zinc-800 border-zinc-700" value={form.content ?? ""} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <Label>Observações</Label>
              <Textarea className="bg-zinc-800 border-zinc-700" value={form.notes ?? ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
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
