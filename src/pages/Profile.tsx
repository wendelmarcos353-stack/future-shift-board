import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";
import { describeSupaError } from "@/lib/supaError";

const profileSchema = z.object({
  display_name: z.string().trim().min(1, "Nome obrigatório").max(120),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  bio: z.string().trim().max(500).optional().or(z.literal("")),
  birth_date: z.string().optional().or(z.literal("")),
});

const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];

export default function Profile() {
  const { user, loading, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    display_name: "",
    email: "",
    phone: "",
    bio: "",
    birth_date: "",
    avatar_url: "" as string | null | "",
  });
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setForm({
          display_name: data.display_name ?? "",
          email: data.email ?? user.email ?? "",
          phone: data.phone ?? "",
          bio: (data as any).bio ?? "",
          birth_date: (data as any).birth_date ?? "",
          avatar_url: data.avatar_url ?? "",
        });
      }
    });
  }, [user]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando…</div>;
  if (!user) return <Navigate to="/auth" replace />;

  const uploadAvatar = async (file: File) => {
    if (!ACCEPTED.includes(file.type)) {
      toast({ title: "Formato inválido", description: "Envie PNG, JPG ou WEBP.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 5MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const hadPrevious = !!form.avatar_url;
      const path = `avatars/${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("media").upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
      if (error) {
        if (/row-level security|not authorized|Unauthorized/i.test(error.message)) {
          throw new Error("Você não tem permissão para alterar a foto de outro usuário.");
        }
        throw error;
      }
      const { data } = supabase.storage.from("media").getPublicUrl(path);
      const url = data.publicUrl;
      const { error: uErr } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
      if (uErr) throw uErr;
      setForm((f) => ({ ...f, avatar_url: url }));
      toast({ title: hadPrevious ? "Foto atualizada com sucesso." : "Foto de perfil enviada com sucesso." });
    } catch (e: any) {
      toast({ title: "Falha ao enviar", description: describeSupaError(e, { table: "storage", op: "UPLOAD", action: "enviar foto de perfil" }), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
    if (error) return toast({ title: "Erro", description: describeSupaError(error, { table: "profiles", op: "UPDATE", action: "remover foto do perfil" }), variant: "destructive" });
    setForm((f) => ({ ...f, avatar_url: "" }));
    toast({ title: "Foto removida com sucesso." });
  };

  const save = async () => {
    const parsed = profileSchema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Dados inválidos", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: form.display_name.trim(),
      phone: form.phone?.trim() || null,
      bio: form.bio?.trim() || null,
      birth_date: form.birth_date || null,
    } as any).eq("id", user.id);
    setSaving(false);
    if (error) return toast({ title: "Erro ao salvar", description: describeSupaError(error, { table: "profiles", op: "UPDATE", action: "salvar perfil" }), variant: "destructive" });
    toast({ title: "Perfil atualizado" });
  };

  const changePassword = async () => {
    if (pwd.next.length < 8) return toast({ title: "Senha fraca", description: "Mínimo 8 caracteres.", variant: "destructive" });
    if (pwd.next !== pwd.confirm) return toast({ title: "Senhas diferentes", variant: "destructive" });
    const { error } = await supabase.auth.updateUser({ password: pwd.next });
    if (error) return toast({ title: "Erro ao alterar senha", description: error.message, variant: "destructive" });
    setPwd({ current: "", next: "", confirm: "" });
    toast({ title: "Senha alterada" });
  };

  return (
    <div className="min-h-screen p-4 md:p-8 relative">
      <div className="scan-line" />
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl md:text-3xl font-bold neon-text-cyan tracking-widest">MEU PERFIL</h1>
          <button onClick={() => navigate("/")} className="font-display text-xs px-3 py-2 rounded glass-panel neon-text-cyan hover:bg-primary/10">← VOLTAR</button>
        </div>

        <section className="glass-panel p-6 space-y-5">
          <h2 className="font-display text-lg neon-text-purple tracking-wider">FOTO</h2>
          <div className="flex items-center gap-5 flex-wrap">
            {form.avatar_url ? (
              <img src={form.avatar_url} alt="" className="h-28 w-28 rounded-full object-cover border-2 border-primary/50" />
            ) : (
              <div className="h-28 w-28 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center text-4xl">👤</div>
            )}
            <div className="flex flex-col gap-2">
              <label className="font-display text-xs px-4 py-2 rounded glass-panel neon-text-cyan hover:bg-primary/10 cursor-pointer w-fit">
                {uploading ? "ENVIANDO…" : "ENVIAR FOTO"}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
              </label>
              {form.avatar_url && (
                <button onClick={removeAvatar} className="font-display text-xs px-4 py-2 rounded glass-panel neon-text-pink hover:bg-secondary/10 w-fit">REMOVER FOTO</button>
              )}
              <p className="text-xs text-muted-foreground">PNG, JPG ou WEBP · até 5MB</p>
            </div>
          </div>
        </section>

        <section className="glass-panel p-6 space-y-4">
          <h2 className="font-display text-lg neon-text-purple tracking-wider">INFORMAÇÕES</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs text-muted-foreground">Nome</span>
              <input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} className="w-full mt-1 px-3 py-2 rounded bg-background/50 border border-border/40 focus:border-primary/60 outline-none" />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Email</span>
              <input value={form.email} disabled className="w-full mt-1 px-3 py-2 rounded bg-background/30 border border-border/40 text-muted-foreground" />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Telefone</span>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full mt-1 px-3 py-2 rounded bg-background/50 border border-border/40 focus:border-primary/60 outline-none" />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Data de nascimento</span>
              <input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} className="w-full mt-1 px-3 py-2 rounded bg-background/50 border border-border/40 focus:border-primary/60 outline-none" />
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs text-muted-foreground">Biografia</span>
              <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} maxLength={500} className="w-full mt-1 px-3 py-2 rounded bg-background/50 border border-border/40 focus:border-primary/60 outline-none resize-none" />
            </label>
          </div>
          <div className="text-xs text-muted-foreground">Cargo: {roles.join(", ") || "—"} · ID e permissões não são editáveis.</div>
          <div className="flex justify-end">
            <button onClick={save} disabled={saving} className="font-display text-xs px-5 py-2 rounded glass-panel neon-text-cyan hover:bg-primary/10 disabled:opacity-50">
              {saving ? "SALVANDO…" : "SALVAR"}
            </button>
          </div>
        </section>

        <section className="glass-panel p-6 space-y-4">
          <h2 className="font-display text-lg neon-text-purple tracking-wider">SEGURANÇA</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs text-muted-foreground">Nova senha</span>
              <input type="password" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} className="w-full mt-1 px-3 py-2 rounded bg-background/50 border border-border/40 focus:border-primary/60 outline-none" />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Confirmar senha</span>
              <input type="password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} className="w-full mt-1 px-3 py-2 rounded bg-background/50 border border-border/40 focus:border-primary/60 outline-none" />
            </label>
          </div>
          <div className="flex justify-between items-center">
            <button onClick={signOut} className="font-display text-xs px-4 py-2 rounded glass-panel neon-text-pink hover:bg-secondary/10">SAIR</button>
            <button onClick={changePassword} className="font-display text-xs px-5 py-2 rounded glass-panel neon-text-cyan hover:bg-primary/10">ALTERAR SENHA</button>
          </div>
        </section>
      </div>
    </div>
  );
}
