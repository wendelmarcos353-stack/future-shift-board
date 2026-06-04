import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Senha mínima de 8 caracteres");
    if (password !== confirm) return toast.error("Senhas não conferem");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Senha redefinida");
    navigate("/auth", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 p-6">
      <form onSubmit={submit} className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl p-8 space-y-5">
        <h1 className="text-2xl font-bold">Definir nova senha</h1>
        <div className="space-y-2">
          <Label htmlFor="pw">Nova senha</Label>
          <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cp">Confirmar senha</Label>
          <Input id="cp" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Salvando..." : "Redefinir senha"}
        </Button>
      </form>
    </div>
  );
}
