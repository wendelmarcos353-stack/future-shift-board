import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

type Cls = { id: string; name: string; grade: number };
type Ann = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  target_scope: any;
  start_date: string | null;
  end_date: string | null;
  active: boolean;
};

export default function AdminAnnouncements() {
  const [classes, setClasses] = useState<Cls[]>([]);
  const [items, setItems] = useState<Ann[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "normal",
    target_type: "all",
    grade: 1,
    class_id: "",
    end_date: "",
  });

  const load = async () => {
    const [c, a] = await Promise.all([
      supabase.from("classes").select("id,name,grade").order("order_position"),
      supabase.from("announcements").select("*").order("created_at", { ascending: false }),
    ]);
    if (c.data) setClasses(c.data as any);
    if (a.data) setItems(a.data as any);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!form.title) return toast.error("Título obrigatório");
    const target_scope =
      form.target_type === "all"
        ? { type: "all" }
        : form.target_type === "grade"
        ? { type: "grade", grade: form.grade }
        : { type: "classes", class_ids: [form.class_id] };
    const { error } = await supabase.from("announcements").insert({
      title: form.title,
      description: form.description || null,
      priority: form.priority,
      target_scope,
      end_date: form.end_date || null,
    });
    if (error) return toast.error(error.message);
    setForm({ ...form, title: "", description: "", end_date: "" });
    toast.success("Aviso criado");
    load();
  };

  const toggle = async (id: string, active: boolean) => {
    await supabase.from("announcements").update({ active }).eq("id", id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir aviso?")) return;
    await supabase.from("announcements").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Avisos</h1>

      <Card className="p-4 bg-zinc-900 border-zinc-800 space-y-3">
        <div>
          <Label>Título</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <Label>Descrição</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <Label>Prioridade</Label>
            <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Público-alvo</Label>
            <Select value={form.target_type} onValueChange={(v) => setForm({ ...form, target_type: v })}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as turmas</SelectItem>
                <SelectItem value="grade">Um ano inteiro</SelectItem>
                <SelectItem value="class">Turma específica</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.target_type === "grade" && (
            <div>
              <Label>Ano</Label>
              <Input type="number" value={form.grade} onChange={(e) => setForm({ ...form, grade: Number(e.target.value) })} />
            </div>
          )}
          {form.target_type === "class" && (
            <div>
              <Label>Turma</Label>
              <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Encerra em</Label>
            <Input type="datetime-local" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </div>
        </div>
        <Button onClick={add}><Plus className="w-4 h-4 mr-1" />Criar aviso</Button>
      </Card>

      <div className="space-y-2">
        {items.map((a) => (
          <Card key={a.id} className="p-4 bg-zinc-900 border-zinc-800 flex items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold">{a.title}</p>
                {a.priority === "high" && (
                  <span className="text-xs px-2 py-0.5 rounded bg-pink-500/20 text-pink-400">URGENTE</span>
                )}
              </div>
              {a.description && <p className="text-sm text-zinc-400 mt-1 whitespace-pre-line">{a.description}</p>}
              <p className="text-xs text-zinc-500 mt-2">
                Alvo: {a.target_scope?.type === "all" ? "Todas" : a.target_scope?.type === "grade" ? `${a.target_scope?.grade}º ano` : "Turma"}
                {a.end_date && ` · até ${new Date(a.end_date).toLocaleDateString("pt-BR")}`}
              </p>
            </div>
            <Switch checked={a.active} onCheckedChange={(v) => toggle(a.id, v)} />
            <Button size="icon" variant="ghost" onClick={() => remove(a.id)}>
              <Trash2 className="w-4 h-4 text-red-400" />
            </Button>
          </Card>
        ))}
        {items.length === 0 && <p className="text-zinc-500 text-sm">Nenhum aviso.</p>}
      </div>
    </div>
  );
}
