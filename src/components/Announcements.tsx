import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Announcement = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  start_date: string | null;
  end_date: string | null;
  active: boolean;
  created_at: string;
};

const priorityStyles: Record<string, { icon: string; accent: string; text: string }> = {
  high: { icon: "🚨", accent: "border-neon-pink/40 bg-neon-pink/5", text: "text-neon-pink" },
  urgent: { icon: "🚨", accent: "border-neon-pink/40 bg-neon-pink/5", text: "text-neon-pink" },
  warning: { icon: "⚠️", accent: "border-neon-orange/40 bg-neon-orange/5", text: "text-neon-orange" },
  normal: { icon: "ℹ️", accent: "border-neon-cyan/40 bg-neon-cyan/5", text: "text-neon-cyan" },
  low: { icon: "ℹ️", accent: "border-neon-cyan/40 bg-neon-cyan/5", text: "text-neon-cyan" },
};

const isActive = (a: Announcement) => {
  if (!a.active) return false;
  const now = Date.now();
  if (a.start_date && new Date(a.start_date).getTime() > now) return false;
  if (a.end_date && new Date(a.end_date).getTime() < now) return false;
  return true;
};

const Announcements = () => {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase
        .from("announcements")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false });
      if (!mounted) return;
      setItems(((data || []) as Announcement[]).filter(isActive));
      setLoading(false);
    };
    load();
    const ch = supabase
      .channel("announcements-public")
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, load)
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, []);

  return (
    <div className="glass-panel p-4 md:p-6 h-full">
      <h2 className="font-display text-lg md:text-xl font-bold neon-text-purple mb-4 tracking-wider flex items-center gap-2">
        <span className="text-2xl">📢</span> AVISOS IMPORTANTES
      </h2>
      <div className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando avisos…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum aviso ativo no momento.</p>
        ) : (
          items.map((item, i) => {
            const style = priorityStyles[item.priority] || priorityStyles.normal;
            const date = new Date(item.created_at).toLocaleDateString("pt-BR");
            return (
              <div
                key={item.id}
                className={`p-3 rounded-lg border ${style.accent} transition-all duration-300 animate-float-up hover:scale-[1.01]`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg">{style.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-display text-sm font-bold tracking-wide ${style.text}`}>
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-line">
                        {item.description}
                      </p>
                    )}
                    <p className="text-xs font-mono text-muted-foreground/60 mt-1">{date}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Announcements;
