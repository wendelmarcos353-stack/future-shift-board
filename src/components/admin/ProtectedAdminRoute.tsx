import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, hasRole, mustChangePassword, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-400">
        Carregando...
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (mustChangePassword) return <Navigate to="/auth/change-password" replace />;

  const allowed = isAdmin || hasRole("secretary", "teacher");

  if (!allowed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-100 p-6 text-center">
        <h1 className="text-3xl font-bold mb-2">Acesso restrito</h1>
        <p className="text-zinc-400 mb-6">Esta área é apenas para administradores.</p>
        <a href="/" className="text-blue-400 hover:underline">Voltar ao site</a>
      </div>
    );
  }

  return <>{children}</>;
}
