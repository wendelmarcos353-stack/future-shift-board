import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { toastSupaError } from "@/lib/supaError";

type Category = { id: string; name: string; icon: string | null; color: string | null };

export default function AdminCategories() {
  const [list, setList] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [color, setColor] = useState("#3b82f6");

  const load = async () => {
    const { data } = await supabase.from("categories").select("*").order("name");
    setList((data as Category[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setName(""); setIcon(""); setColor("#3b82f6");
    setOpen(true);
  };
  const openEdit = (c: Category) => {
    setEditing(c);
    setName(c.name); setIcon(c.icon ?? ""); setColor(c.color ?? "#3b82f6");
    setOpen(true);
  };

  const save = async () => {
    if (!name.trim()) return toast.error("Nome obrigatório");
    const payload = { name: name.trim(), icon: icon || null, color };
    const res = editing
      ? await supabase.from("categories").update(payload).eq("id", editing.id)
      : await supabase.from("categories").insert(payload);
    if (res.error) toastSupaError(res.error, { table: "categories", op: editing ? "UPDATE" : "INSERT", action: "salvar categoria" });
    else {
      toast.success("Salvo");
      setOpen(false);
      load();
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir categoria?")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) toastSupaError(error, { table: "categories", op: "DELETE", action: "excluir categoria" });
    else { toast.success("Excluída"); load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Categorias</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="bg-blue-600 hover:bg-blue-500">
              <Plus className="h-4 w-4 mr-2" /> Nova
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar" : "Nova"} categoria</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="bg-zinc-800 border-zinc-700" /></div>
              <div><Label>Ícone (nome lucide, ex: Star)</Label><Input value={icon} onChange={(e) => setIcon(e.target.value)} className="bg-zinc-800 border-zinc-700" /></div>
              <div>
                <Label>Cor</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-14 rounded bg-zinc-800 border border-zinc-700" />
                  <Input value={color} onChange={(e) => setColor(e.target.value)} className="bg-zinc-800 border-zinc-700" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} className="bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700">Cancelar</Button>
              <Button onClick={save} className="bg-blue-600 hover:bg-blue-500">Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
        <CardContent className="p-0">
          {list.length === 0 ? (
            <p className="p-8 text-center text-zinc-500">Nenhuma categoria</p>
          ) : (
            <ul className="divide-y divide-zinc-800">
              {list.map((c) => (
                <li key={c.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="h-6 w-6 rounded" style={{ background: c.color ?? "#3b82f6" }} />
                    <div>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-zinc-500">{c.icon ?? "sem ícone"}</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-zinc-800" onClick={() => openEdit(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-zinc-800 text-red-400" onClick={() => remove(c.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
