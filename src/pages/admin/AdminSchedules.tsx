import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

type Cls = { id: string; name: string; order_position: number };
type Schedule = {
  id: string;
  class_id: string;
  subject: string;
  room: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

export default function AdminSchedules() {
  const [classes, setClasses] = useState<Cls[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [classId, setClassId] = useState<string>("");
  const [form, setForm] = useState({ subject: "", room: "", day_of_week: 1, start_time: "08:00", end_time: "08:50" });

  const load = async () => {
    const [c, s] = await Promise.all([
      supabase.from("classes").select("id,name,order_position").order("order_position"),
      supabase.from("schedules").select("*"),
    ]);
    if (c.data) {
      setClasses(c.data as any);
      if (!classId && c.data.length) setClassId(c.data[0].id);
    }
    if (s.data) setSchedules(s.data as any);
  };
  useEffect(() => { load(); }, []);

  const list = useMemo(
    () => schedules.filter((s) => s.class_id === classId).sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)),
    [schedules, classId]
  );

  const add = async () => {
    if (!classId || !form.subject) return toast.error("Preencha turma e disciplina");
    const { error } = await supabase.from("schedules").insert({ class_id: classId, ...form });
    if (error) return toast.error(error.message);
    setForm({ ...form, subject: "", room: "" });
    toast.success("Aula adicionada");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir aula?")) return;
    await supabase.from("schedules").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Horários</h1>

      <Card className="p-4 bg-zinc-900 border-zinc-800 space-y-4">
        <div>
          <Label>Turma</Label>
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700"><SelectValue /></SelectTrigger>
            <SelectContent>
              {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
          <div className="col-span-2">
            <Label>Disciplina</Label>
            <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </div>
          <div>
            <Label>Sala</Label>
            <Input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} />
          </div>
          <div>
            <Label>Dia</Label>
            <Select value={String(form.day_of_week)} onValueChange={(v) => setForm({ ...form, day_of_week: Number(v) })}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Início</Label>
            <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
          </div>
          <div>
            <Label>Fim</Label>
            <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
          </div>
        </div>
        <Button onClick={add}><Plus className="w-4 h-4 mr-1" />Adicionar aula</Button>
      </Card>

      <div className="space-y-2">
        {list.map((s) => (
          <Card key={s.id} className="p-3 bg-zinc-900 border-zinc-800 flex items-center justify-between">
            <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
              <span className="font-semibold">{DAYS[s.day_of_week]}</span>
              <span>{s.start_time.slice(0,5)} – {s.end_time.slice(0,5)}</span>
              <span className="md:col-span-2">{s.subject}</span>
              <span className="text-zinc-400">{s.room || "—"}</span>
            </div>
            <Button size="icon" variant="ghost" onClick={() => remove(s.id)}>
              <Trash2 className="w-4 h-4 text-red-400" />
            </Button>
          </Card>
        ))}
        {list.length === 0 && <p className="text-zinc-500 text-sm">Nenhuma aula cadastrada para esta turma.</p>}
      </div>
    </div>
  );
}
