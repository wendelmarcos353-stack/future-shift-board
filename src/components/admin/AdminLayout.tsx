import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  FolderTree,
  Image as ImageIcon,
  Settings,
  LogOut,
  Home,
  Menu,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

const items: Array<{ to: string; label: string; icon: any; end?: boolean; masterOnly?: boolean }> = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Usuários", icon: Users, masterOnly: true },
  { to: "/admin/classes", label: "Turmas", icon: FolderTree },
  { to: "/admin/schedules", label: "Horários", icon: FileText },
  { to: "/admin/announcements", label: "Avisos", icon: FileText },
  { to: "/admin/contents", label: "Conteúdos", icon: FileText },
  { to: "/admin/categories", label: "Categorias", icon: FolderTree },
  { to: "/admin/media", label: "Mídia", icon: ImageIcon },
  { to: "/admin/tv", label: "Modo TV", icon: Settings },
  { to: "/admin/settings", label: "Configurações", icon: Settings },
];

export default function AdminLayout() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen flex bg-zinc-950 text-zinc-100">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-64 flex-col fixed inset-y-0 left-0 bg-zinc-900 border-r border-zinc-800">
        <SidebarContent onNavigate={() => {}} onSignOut={handleSignOut} userEmail={user?.email} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col">
            <SidebarContent
              onNavigate={() => setMobileOpen(false)}
              onSignOut={handleSignOut}
              userEmail={user?.email}
            />
          </div>
          <div className="flex-1 bg-black/60" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      <div className="flex-1 md:ml-64 flex flex-col">
        <header className="md:hidden h-14 border-b border-zinc-800 bg-zinc-900 flex items-center px-4 gap-3">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} className="text-zinc-100">
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-semibold">Administração</span>
        </header>
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  onNavigate,
  onSignOut,
  userEmail,
}: {
  onNavigate: () => void;
  onSignOut: () => void;
  userEmail?: string;
}) {
  return (
    <>
      <div className="h-16 px-6 flex items-center border-b border-zinc-800">
        <span className="text-lg font-bold tracking-tight">
          <span className="text-blue-500">●</span> Admin Panel
        </span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-blue-600/15 text-blue-400 border border-blue-600/30"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              )
            }
          >
            <it.icon className="h-4 w-4" />
            {it.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-zinc-800 space-y-2">
        <p className="text-xs text-zinc-500 px-2 truncate">{userEmail}</p>
        <NavLink
          to="/"
          onClick={onNavigate}
          className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        >
          <Home className="h-4 w-4" /> Ver site
        </NavLink>
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-zinc-400 hover:bg-zinc-800 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>
    </>
  );
}
