import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FileText, FolderTree, CheckCircle2, FileEdit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";

type Stats = { contents: number; categories: number; published: number; drafts: number };
type Recent = { id: string; title: string; status: string; updated_at: string };

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ contents: 0, categories: 0, published: 0, drafts: 0 });
  const [recent, setRecent] = useState<Recent[]>([]);

  useEffect(() => {
    (async () => {
      const [c, cats, pub, draft, rec] = await Promise.all([
        supabase.from("contents").select("*", { count: "exact", head: true }),
        supabase.from("categories").select("*", { count: "exact", head: true }),
        supabase.from("contents").select("*", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("contents").select("*", { count: "exact", head: true }).eq("status", "draft"),
        supabase.from("contents").select("id,title,status,updated_at").order("updated_at", { ascending: false }).limit(8),
      ]);
      setStats({
        contents: c.count ?? 0,
        categories: cats.count ?? 0,
        published: pub.count ?? 0,
        drafts: draft.count ?? 0,
      });
      setRecent((rec.data as Recent[]) ?? []);
    })();
  }, []);

  const cards = [
    { label: "Conteúdos", value: stats.contents, icon: FileText, color: "text-blue-400" },
    { label: "Categorias", value: stats.categories, icon: FolderTree, color: "text-purple-400" },
    { label: "Publicados", value: stats.published, icon: CheckCircle2, color: "text-emerald-400" },
    { label: "Rascunhos", value: stats.drafts, icon: FileEdit, color: "text-amber-400" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-zinc-400 mt-1">Visão geral do conteúdo do site</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="bg-zinc-900 border-zinc-800 text-zinc-100">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">{c.label}</CardTitle>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
        <CardHeader>
          <CardTitle>Últimas atualizações</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-zinc-500 text-sm">Nenhum conteúdo ainda.</p>
          ) : (
            <ul className="divide-y divide-zinc-800">
              {recent.map((r) => (
                <li key={r.id} className="py-3 flex items-center justify-between">
                  <Link to={`/admin/contents/${r.id}/edit`} className="hover:text-blue-400">
                    {r.title}
                  </Link>
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span
                      className={
                        r.status === "published"
                          ? "px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400"
                          : "px-2 py-0.5 rounded bg-amber-500/15 text-amber-400"
                      }
                    >
                      {r.status}
                    </span>
                    <span>{new Date(r.updated_at).toLocaleString("pt-BR")}</span>
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
