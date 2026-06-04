import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "master" | "admin" | "secretary" | "teacher" | "student" | "user" | "visitor";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  isAdmin: boolean; // master OR admin
  isMaster: boolean;
  mustChangePassword: boolean;
  loading: boolean;
  hasRole: (...r: AppRole[]) => boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  roles: [],
  isAdmin: false,
  isMaster: false,
  mustChangePassword: false,
  loading: true,
  hasRole: () => false,
  refresh: async () => {},
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadUserMeta = async (userId: string) => {
    const [{ data: rolesData }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("profiles").select("must_change_password").eq("id", userId).maybeSingle(),
    ]);
    setRoles((rolesData?.map((r: any) => r.role as AppRole)) ?? []);
    setMustChangePassword(!!(profile as any)?.must_change_password);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(() => loadUserMeta(sess.user.id), 0);
      } else {
        setRoles([]);
        setMustChangePassword(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) loadUserMeta(sess.user.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const hasRole = (...r: AppRole[]) => r.some((role) => roles.includes(role));
  const isAdmin = hasRole("master", "admin");
  const isMaster = hasRole("master");

  const refresh = async () => {
    if (user) await loadUserMeta(user.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ user, session, roles, isAdmin, isMaster, mustChangePassword, loading, hasRole, refresh, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
