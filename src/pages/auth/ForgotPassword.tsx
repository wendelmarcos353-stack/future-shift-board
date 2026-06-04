import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 p-6">
      <form onSubmit={submit} className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl p-8 space-y-5">
        <h1 className="text-2xl font-bold">Recuperar senha</h1>
        {sent ? (
          <p className="text-sm text-zinc-300">
            Se a conta existir, enviamos um link para <strong>{email}</strong>. Verifique sua caixa de entrada.
          </p>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Enviando..." : "Enviar link de recuperação"}
            </Button>
          </>
        )}
        <Link to="/auth" className="block text-center text-sm text-blue-400 hover:underline">
          Voltar ao login
        </Link>
      </form>
    </div>
  );
}
