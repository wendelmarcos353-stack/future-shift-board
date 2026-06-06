import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, AppRole } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, KeyRound, Ban, CheckCircle2, Shield, Search } from "lucide-react";

type AdminUser = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  profile: { display_name: string | null; active: boolean; blocked_until: string | null; phone: string | null } | null;
  roles: AppRole[];
};

const ROLES: AppRole[] = ["master", "admin", "secretary", "teacher", "student", "user", "visitor"];

const roleColor = (r: AppRole) =>
  r === "master" ? "bg-red-600/20 text-red-300 border-red-600/40"
  : r === "admin" ? "bg-blue-600/20 text-blue-300 border-blue-600/40"
  : r === "secretary" ? "bg-purple-600/20 text-purple-300 border-purple-600/40"
  : r === "teacher" ? "bg-emerald-600/20 text-emerald-300 border-emerald-600/40"
  : r === "student" ? "bg-amber-600/20 text-amber-300 border-amber-600/40"
  : "bg-zinc-700/40 text-zinc-300 border-zinc-600/40";

export default function AdminUsers() {
  const { isMaster, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState<AdminUser | null>(null);
  const [roleOpen, setRoleOpen] = useState<AdminUser | null>(null);

  const invoke = async (body: any) => {
    const { data, error } = await supabase.functions.invoke("admin-users", { body });
    if (error) throw new Error(error.message);
    if ((data as any)?.error) throw new Error((data as any).error);
    return data;
  };

  const load = async () => {
    setLoading(true);
    try {
      const data: any = await invoke({ type: "list" });
      setUsers(data.users ?? []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (!authLoading) load(); }, [authLoading]);

  if (!authLoading && !isMaster) {
    return (
      <div className="text-center py-16">
        <Shield className="mx-auto h-10 w-10 text-zinc-500 mb-3" />
        <h1 className="text-xl font-semibold mb-1">Apenas Administrador Geral</h1>
        <p className="text-zinc-400">Esta área é restrita ao Master.</p>
      </div>
    );
  }

  const filtered = users.filter((u) => {
    const t = q.toLowerCase();
    return !t
      || u.email?.toLowerCase().includes(t)
      || u.profile?.display_name?.toLowerCase().includes(t)
      || u.roles.some((r) => r.includes(t));
  });

  const toggleBlock = async (u: AdminUser) => {
    const isBlocked = !!u.profile?.blocked_until || u.profile?.active === false;
    try {
      await invoke({ type: "block", user_id: u.id, until: isBlocked ? null : "2099-01-01T00:00:00Z" });
      toast.success(isBlocked ? "Conta reativada" : "Conta bloqueada");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const remove = async (u: AdminUser) => {
    if (!confirm(`Excluir definitivamente ${u.email}?`)) return;
    try {
      await invoke({ type: "delete", user_id: u.id });
      toast.success("Conta excluída");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Usuários</h1>
          <p className="text-zinc-400 text-sm">Gerencie contas, senhas e permissões.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-zinc-500" />
            <Input placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-8 bg-zinc-900 border-zinc-800 w-64" />
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-500"><Plus className="h-4 w-4 mr-1" />Nova conta</Button>
            </DialogTrigger>
            <CreateUserDialog
              onClose={() => setCreateOpen(false)}
              onCreated={() => { setCreateOpen(false); load(); }}
              invoke={invoke}
            />
          </Dialog>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-800 overflow-hidden bg-zinc-900/40">
        {loading ? (
          <div className="p-10 text-center text-zinc-400"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Carregando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 text-zinc-400">
              <tr>
                <th className="text-left p-3">Nome / E-mail</th>
                <th className="text-left p-3">Papéis</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3 hidden md:table-cell">Último acesso</th>
                <th className="text-right p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const blocked = !!u.profile?.blocked_until || u.profile?.active === false;
                return (
                  <tr key={u.id} className="border-t border-zinc-800 hover:bg-zinc-900/60">
                    <td className="p-3">
                      <div className="font-medium">{u.profile?.display_name ?? "—"}</div>
                      <div className="text-zinc-500 text-xs">{u.email}</div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length ? u.roles.map((r) => (
                          <Badge key={r} variant="outline" className={roleColor(r)}>{r}</Badge>
                        )) : <span className="text-zinc-600 text-xs">sem papel</span>}
                      </div>
                    </td>
                    <td className="p-3">
                      {blocked
                        ? <Badge variant="outline" className="bg-red-600/20 text-red-300 border-red-600/40">Bloqueado</Badge>
                        : <Badge variant="outline" className="bg-emerald-600/20 text-emerald-300 border-emerald-600/40">Ativo</Badge>}
                    </td>
                    <td className="p-3 hidden md:table-cell text-zinc-400">
                      {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("pt-BR") : "—"}
                    </td>
                    <td className="p-3 text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => setRoleOpen(u)} title="Papéis"><Shield className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setPwOpen(u)} title="Senha"><KeyRound className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleBlock(u)} title={blocked ? "Reativar" : "Bloquear"}>
                        {blocked ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Ban className="h-4 w-4 text-amber-400" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(u)} title="Excluir"><Trash2 className="h-4 w-4 text-red-400" /></Button>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && (
                <tr><td colSpan={5} className="text-center p-8 text-zinc-500">Nenhum usuário encontrado.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {pwOpen && (
        <PasswordDialog user={pwOpen} onClose={() => setPwOpen(null)} invoke={invoke} />
      )}
      {roleOpen && (
        <RolesDialog user={roleOpen} onClose={() => setRoleOpen(null)} onSaved={() => { setRoleOpen(null); load(); }} invoke={invoke} />
      )}
    </div>
  );
}

function CreateUserDialog({ onClose, onCreated, invoke }: { onClose: () => void; onCreated: () => void; invoke: (b: any) => Promise<any> }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("student");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!email || !password) return toast.error("Preencha e-mail e senha");
    setSaving(true);
    try {
      await invoke({ type: "create", email, password, display_name: name, role });
      toast.success("Conta criada");
      onCreated();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
      <DialogHeader><DialogTitle>Nova conta</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="bg-zinc-950 border-zinc-800" /></div>
        <div><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-zinc-950 border-zinc-800" /></div>
        <div><Label>Senha inicial</Label><Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-zinc-950 border-zinc-800" /></div>
        <div>
          <Label>Papel</Label>
          <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
            <SelectTrigger className="bg-zinc-950 border-zinc-800"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
              {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-zinc-500">A conta será criada com "trocar senha no primeiro login".</p>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={submit} disabled={saving} className="bg-blue-600 hover:bg-blue-500">
          {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Criar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function PasswordDialog({ user, onClose, invoke }: { user: AdminUser; onClose: () => void; invoke: (b: any) => Promise<any> }) {
  const [pw, setPw] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (pw.length < 6) return toast.error("Senha mínima de 6 caracteres");
    setSaving(true);
    try {
      await invoke({ type: "set_password", user_id: user.id, password: pw });
      toast.success("Senha alterada");
      onClose();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
        <DialogHeader><DialogTitle>Alterar senha — {user.email}</DialogTitle></DialogHeader>
        <Input type="text" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Nova senha" className="bg-zinc-950 border-zinc-800" />
        <p className="text-xs text-zinc-500">O usuário será obrigado a trocar a senha no próximo login.</p>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={saving} className="bg-blue-600 hover:bg-blue-500">
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RolesDialog({ user, onClose, onSaved, invoke }: { user: AdminUser; onClose: () => void; onSaved: () => void; invoke: (b: any) => Promise<any> }) {
  const [selected, setSelected] = useState<AppRole[]>(user.roles);
  const [saving, setSaving] = useState(false);
  const toggle = (r: AppRole) =>
    setSelected((s) => s.includes(r) ? s.filter((x) => x !== r) : [...s, r]);
  const submit = async () => {
    setSaving(true);
    try {
      await invoke({ type: "set_roles", user_id: user.id, roles: selected });
      toast.success("Papéis atualizados");
      onSaved();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
        <DialogHeader><DialogTitle>Papéis — {user.email}</DialogTitle></DialogHeader>
        <div className="flex flex-wrap gap-2">
          {ROLES.map((r) => {
            const on = selected.includes(r);
            return (
              <button
                key={r}
                onClick={() => toggle(r)}
                className={`px-3 py-1.5 rounded-md text-sm border transition ${on ? roleColor(r) : "border-zinc-700 text-zinc-400 hover:text-zinc-200"}`}
              >
                {r}
              </button>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={saving} className="bg-blue-600 hover:bg-blue-500">
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
