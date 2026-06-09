import { useEffect, useState } from "react";
import DigitalClock from "@/components/DigitalClock";
import ClassTabs from "@/components/ClassTabs";
import NewsTicker from "@/components/NewsTicker";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [hasExams, setHasExams] = useState(false);

  useEffect(() => {
    const check = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { count } = await supabase
        .from("exams")
        .select("id", { count: "exact", head: true })
        .eq("active", true)
        .gte("exam_date", today);
      setHasExams((count ?? 0) > 0);
    };
    check();
    const ch = supabase
      .channel("index-exams")
      .on("postgres_changes", { event: "*", schema: "public", table: "exams" }, check)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return (
    <div className="min-h-screen p-3 md:p-6 relative">
      <div className="scan-line" />

      <header className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold neon-text-cyan tracking-[0.2em]">
            PAINEL ESCOLAR
          </h1>
          <div className="hud-line mt-1" />
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-center">
          <DigitalClock />
          {hasExams && (
            <a href="/exams" className="font-display text-xs px-4 py-2 rounded glass-panel neon-text-pink hover:bg-secondary/10 transition-all duration-300 hover:scale-105">
              📝 PROVAS
            </a>
          )}
          <a href="/tv" className="font-display text-xs px-4 py-2 rounded glass-panel neon-text-purple hover:bg-secondary/10 transition-all duration-300 hover:scale-105">
            📺 MODO TV
          </a>
          <a href="/admin" className="font-display text-xs px-4 py-2 rounded glass-panel neon-text-cyan hover:bg-secondary/10 transition-all duration-300 hover:scale-105">
            ⚙ ADMIN
          </a>
        </div>
      </header>

      <div className="mb-6">
        <NewsTicker />
      </div>

      <ClassTabs />

      <div className="mt-8">
        <div className="hud-line" />
        <p className="text-center font-mono text-xs text-muted-foreground/40 mt-2 tracking-widest">
          SYSTEM ONLINE · v2.1.0
        </p>
      </div>
    </div>
  );
};

export default Index;
