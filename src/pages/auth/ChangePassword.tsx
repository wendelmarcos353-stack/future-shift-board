import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ChangePassword() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("A senha precisa ter no mínimo 8 caracteres");
    if (password !== confirm) return toast.error("As senhas não conferem");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    if (user) {
      await supabase.from("profiles").update({ must_change_password: false }).eq("id", user.id);
    }
    await refresh();
    toast.success("Senha alterada com sucesso");
    navigate("/admin", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 p-6">
      <form onSubmit={submit} className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl p-8 space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Defina uma nova senha</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Por segurança, você precisa trocar sua senha antes de continuar.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="pw">Nova senha</Label>
          <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cp">Confirmar senha</Label>
          <Input id="cp" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Salvando..." : "Salvar nova senha"}
        </Button>
      </form>
    </div>
  );
}
