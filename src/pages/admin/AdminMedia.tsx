import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Trash2, FileText, Film } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import ScheduleImporter from "@/components/admin/ScheduleImporter";

type Media = {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  uploaded_at: string;
};

export default function AdminMedia() {
  const { user } = useAuth();
  const [items, setItems] = useState<Media[]>([]);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("media").select("*").order("uploaded_at", { ascending: false });
    setItems((data as Media[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    for (const f of files) {
      const ext = f.name.split(".").pop();
      const path = `${user?.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const up = await supabase.storage.from("media").upload(path, f);
      if (up.error) { toast.error(up.error.message); continue; }
      const { data } = supabase.storage.from("media").getPublicUrl(path);
      await supabase.from("media").insert({
        file_name: f.name, file_url: data.publicUrl, file_type: f.type, file_size: f.size, uploaded_by: user?.id,
      });
    }
    setUploading(false);
    toast.success("Upload concluído");
    load();
  };

  const remove = async (m: Media) => {
    if (!confirm(`Excluir ${m.file_name}?`)) return;
    const idx = m.file_url.indexOf("/media/");
    if (idx !== -1) {
      const path = m.file_url.substring(idx + "/media/".length);
      await supabase.storage.from("media").remove([path]);
    }
    await supabase.from("media").delete().eq("id", m.id);
    toast.success("Removido");
    load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Mídia</h1>

      <Tabs defaultValue="files" className="w-full">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="files">Arquivos</TabsTrigger>
          <TabsTrigger value="schedule-ai">Leitura de Horários com IA</TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="space-y-4">
          <div className="flex justify-end">
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 cursor-pointer text-sm font-medium">
              <Upload className="h-4 w-4" /> {uploading ? "Enviando..." : "Enviar arquivos"}
              <input type="file" multiple className="hidden" onChange={onUpload} accept="image/*,video/*,application/pdf" />
            </label>
          </div>

          <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
            <CardContent className="p-4">
              {items.length === 0 ? (
                <p className="text-center text-zinc-500 py-8">Nenhum arquivo</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {items.map((m) => (
                    <div key={m.id} className="group relative bg-zinc-800 rounded overflow-hidden">
                      {m.file_type?.startsWith("image/") ? (
                        <img src={m.file_url} alt={m.file_name} className="aspect-square w-full object-cover" />
                      ) : m.file_type?.startsWith("video/") ? (
                        <div className="aspect-square flex items-center justify-center"><Film className="h-10 w-10 text-zinc-500" /></div>
                      ) : (
                        <div className="aspect-square flex items-center justify-center"><FileText className="h-10 w-10 text-zinc-500" /></div>
                      )}
                      <div className="p-2 text-xs truncate">{m.file_name}</div>
                      <button onClick={() => remove(m)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-red-600 rounded p-1">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule-ai">
          <ScheduleImporter />
        </TabsContent>
      </Tabs>
    </div>
  );
}
