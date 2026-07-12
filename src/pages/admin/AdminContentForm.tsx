import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { toastSupaError } from "@/lib/supaError";

type Category = { id: string; name: string };

export default function AdminContentForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [content, setContent] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [gallery, setGallery] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState<string>("");
  const [tags, setTags] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedStatus, setSavedStatus] = useState("");
  const autosaveTimer = useRef<number | null>(null);

  useEffect(() => {
    supabase.from("categories").select("id,name").then(({ data }) => setCategories((data as Category[]) ?? []));
    if (isEdit) {
      supabase.from("contents").select("*").eq("id", id).maybeSingle().then(({ data }) => {
        if (data) {
          setTitle(data.title);
          setSubtitle(data.subtitle ?? "");
          setContent(data.content ?? "");
          setCoverImage(data.cover_image ?? "");
          setGallery(data.gallery ?? []);
          setCategoryId(data.category_id ?? "");
          setTags((data.tags ?? []).join(", "));
          setExternalLink(data.external_link ?? "");
          setStatus(data.status as any);
        }
      });
    }
  }, [id, isEdit]);

  const uploadFile = async (file: File): Promise<string | null> => {
    if (!user) {
      toast.error("Você precisa estar autenticado");
      return null;
    }
    const ext = file.name.split(".").pop();
    const path = `${user?.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, file);
    if (error) {
      toastSupaError(error, { table: "storage", op: "UPLOAD", action: "enviar arquivo" });
      return null;
    }
    const { data } = supabase.storage.from("media").getPublicUrl(path);
    const mediaResult = await supabase.from("media").insert({
      file_name: file.name,
      file_url: data.publicUrl,
      file_type: file.type,
      file_size: file.size,
      uploaded_by: user?.id,
    });
    if (mediaResult.error) {
      toastSupaError(mediaResult.error, { table: "media", op: "INSERT", action: "registrar arquivo" });
      return null;
    }
    return data.publicUrl;
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = await uploadFile(f);
    if (url) setCoverImage(url);
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const urls: string[] = [];
    for (const f of files) {
      const u = await uploadFile(f);
      if (u) urls.push(u);
    }
    setGallery((g) => [...g, ...urls]);
  };

  const save = async (silent = false) => {
    if (!title.trim()) {
      if (!silent) toast.error("Título obrigatório");
      return;
    }
    setSaving(true);
    const payload = {
      title: title.trim(),
      subtitle: subtitle.trim() || null,
      content,
      cover_image: coverImage || null,
      gallery,
      category_id: categoryId || null,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      external_link: externalLink || null,
      status,
      author_id: user?.id,
    };
    let result;
    if (isEdit) {
      result = await supabase.from("contents").update(payload).eq("id", id!).select().single();
    } else {
      result = await supabase.from("contents").insert(payload).select().single();
    }
    setSaving(false);
    if (result.error) {
      if (!silent) toastSupaError(result.error, { table: "contents", op: isEdit ? "UPDATE" : "INSERT", action: "salvar conteúdo" });
      return;
    }
    setSavedStatus(`Salvo às ${new Date().toLocaleTimeString("pt-BR")}`);
    if (!silent) {
      toast.success("Conteúdo salvo");
      if (!isEdit) navigate(`/admin/contents/${result.data.id}/edit`, { replace: true });
    }
  };

  // Auto-save (apenas em edição)
  useEffect(() => {
    if (!isEdit) return;
    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(() => save(true), 2000);
    return () => { if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, subtitle, content, coverImage, gallery, categoryId, tags, externalLink, status]);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/contents")} className="hover:bg-zinc-800">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{isEdit ? "Editar conteúdo" : "Novo conteúdo"}</h1>
        </div>
        <div className="flex items-center gap-3">
          {savedStatus && <span className="text-xs text-zinc-500">{savedStatus}</span>}
          <Button onClick={() => save(false)} disabled={saving} className="bg-blue-600 hover:bg-blue-500">
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
        <CardContent className="p-6 space-y-4">
          <div>
            <Label>Título *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-zinc-800 border-zinc-700" />
          </div>
          <div>
            <Label>Subtítulo</Label>
            <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="bg-zinc-800 border-zinc-700" />
          </div>
          <div>
            <Label>Texto completo (Markdown suportado)</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={12} className="bg-zinc-800 border-zinc-700 font-mono text-sm" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="published">Publicado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Tags (separadas por vírgula)</Label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} className="bg-zinc-800 border-zinc-700" />
          </div>

          <div>
            <Label>Link externo</Label>
            <Input value={externalLink} onChange={(e) => setExternalLink(e.target.value)} className="bg-zinc-800 border-zinc-700" placeholder="https://..." />
          </div>

          <div>
            <Label>Imagem de capa</Label>
            <div className="flex items-center gap-3 mt-2">
              <label className="flex items-center gap-2 px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 cursor-pointer text-sm">
                <Upload className="h-4 w-4" /> Enviar
                <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
              </label>
              {coverImage && (
                <div className="relative">
                  <img src={coverImage} alt="capa" className="h-16 w-24 object-cover rounded" />
                  <button onClick={() => setCoverImage("")} className="absolute -top-2 -right-2 bg-red-600 rounded-full p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <Label>Galeria</Label>
            <div className="mt-2">
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 cursor-pointer text-sm">
                <Upload className="h-4 w-4" /> Adicionar imagens
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} />
              </label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-3">
                {gallery.map((url, i) => (
                  <div key={i} className="relative">
                    <img src={url} alt="" className="aspect-square object-cover rounded" />
                    <button onClick={() => setGallery((g) => g.filter((_, idx) => idx !== i))} className="absolute -top-2 -right-2 bg-red-600 rounded-full p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
