import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Eye, Search } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Content = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  category_id: string | null;
  author_id: string | null;
};
type Category = { id: string; name: string };

const PAGE_SIZE = 10;

export default function AdminContents() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Content[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortDesc, setSortDesc] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [toDelete, setToDelete] = useState<string | null>(null);

  const load = async () => {
    let q = supabase.from("contents").select("*", { count: "exact" });
    if (search) q = q.ilike("title", `%${search}%`);
    if (categoryFilter !== "all") q = q.eq("category_id", categoryFilter);
    q = q.order("created_at", { ascending: !sortDesc }).range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    const { data, count } = await q;
    setItems((data as Content[]) ?? []);
    setTotal(count ?? 0);
  };

  useEffect(() => {
    supabase.from("categories").select("id,name").then(({ data }) => setCategories((data as Category[]) ?? []));
  }, []);

  useEffect(() => {
    load();
  }, [search, categoryFilter, sortDesc, page]);

  const handleDelete = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from("contents").delete().eq("id", toDelete);
    if (error) toast.error(error.message);
    else {
      toast.success("Conteúdo excluído");
      load();
    }
    setToDelete(null);
  };

  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Conteúdos</h1>
          <p className="text-zinc-400 mt-1">{total} total</p>
        </div>
        <Button onClick={() => navigate("/admin/contents/new")} className="bg-blue-600 hover:bg-blue-500">
          <Plus className="h-4 w-4 mr-2" /> Novo conteúdo
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Pesquisar..."
            value={search}
            onChange={(e) => { setPage(0); setSearch(e.target.value); }}
            className="pl-9 bg-zinc-900 border-zinc-800 text-zinc-100"
          />
        </div>
        <Select value={categoryFilter} onValueChange={(v) => { setPage(0); setCategoryFilter(v); }}>
          <SelectTrigger className="w-48 bg-zinc-900 border-zinc-800 text-zinc-100">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setSortDesc((s) => !s)} className="border-zinc-800 bg-zinc-900 text-zinc-100 hover:bg-zinc-800">
          Data {sortDesc ? "↓" : "↑"}
        </Button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-950/50 text-zinc-400 text-left">
            <tr>
              <th className="px-4 py-3">Título</th>
              <th className="px-4 py-3 hidden md:table-cell">Categoria</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 hidden md:table-cell">Criado</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-500">Nenhum conteúdo</td></tr>
            )}
            {items.map((it) => (
              <tr key={it.id} className="border-t border-zinc-800 hover:bg-zinc-800/30">
                <td className="px-4 py-3 font-medium">{it.title}</td>
                <td className="px-4 py-3 hidden md:table-cell text-zinc-400">{catName(it.category_id)}</td>
                <td className="px-4 py-3">
                  <span className={it.status === "published"
                    ? "px-2 py-0.5 rounded text-xs bg-emerald-500/15 text-emerald-400"
                    : "px-2 py-0.5 rounded text-xs bg-amber-500/15 text-amber-400"}>
                    {it.status}
                  </span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-zinc-500 text-xs">
                  {new Date(it.created_at).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-zinc-800" onClick={() => navigate(`/admin/contents/${it.id}/edit`)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-zinc-800 text-red-400" onClick={() => setToDelete(it.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">Página {page + 1} de {Math.max(1, Math.ceil(total / PAGE_SIZE))}</span>
        <div className="flex gap-2">
          <Button variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="border-zinc-800 bg-zinc-900 text-zinc-100 hover:bg-zinc-800">Anterior</Button>
          <Button variant="outline" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)} className="border-zinc-800 bg-zinc-900 text-zinc-100 hover:bg-zinc-800">Próxima</Button>
        </div>
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conteúdo?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-500">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
