import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { toastSupaError } from "@/lib/supaError";

type Cls = { id: string; name: string; grade: number; active: boolean; order_position: number };

export default function AdminClasses() {
  const [items, setItems] = useState<Cls[]>([]);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState(1);

  const load = async () => {
    const { data } = await supabase.from("classes").select("*").order("order_position");
    setItems((data as any) || []);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name) return;
    const order = items.length + 1;
    const { error } = await supabase.from("classes").insert({ name, grade, order_position: order });
    if (error) return toastSupaError(error, { table: "classes", op: "INSERT", action: "criar turma" });
    setName("");
    toast.success("Turma criada");
    load();
  };

  const toggle = async (id: string, active: boolean) => {
    const { error } = await supabase.from("classes").update({ active }).eq("id", id);
    if (error) return toastSupaError(error, { table: "classes", op: "UPDATE", action: "atualizar turma" });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir turma?")) return;
    const { error } = await supabase.from("classes").delete().eq("id", id);
    if (error) return toastSupaError(error, { table: "classes", op: "DELETE", action: "excluir turma" });
    load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Turmas</h1>

      <Card className="p-4 bg-zinc-900 border-zinc-800 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[160px]">
          <Label>Nome</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: 4A" />
        </div>
        <div className="w-28">
          <Label>Ano</Label>
          <Input type="number" min={1} max={12} value={grade} onChange={(e) => setGrade(Number(e.target.value))} />
        </div>
        <Button onClick={add}><Plus className="w-4 h-4 mr-1" />Adicionar</Button>
      </Card>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((c) => (
          <Card key={c.id} className="p-4 bg-zinc-900 border-zinc-800 flex items-center justify-between">
            <div>
              <p className="text-xl font-bold">{c.name}</p>
              <p className="text-xs text-zinc-400">{c.grade}º ano</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={c.active} onCheckedChange={(v) => toggle(c.id, v)} />
              <Button size="icon" variant="ghost" onClick={() => remove(c.id)}>
                <Trash2 className="w-4 h-4 text-red-400" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
