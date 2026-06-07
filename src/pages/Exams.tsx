import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

type Exam = {
  id: string;
  class_id: string;
  subject: string;
  room: string | null;
  exam_date: string;
  start_time: string | null;
  end_time: string | null;
  description: string | null;
};
type Cls = { id: string; name: string };

export default function Exams() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<Cls[]>([]);

  const load = async () => {
    const today = new Date().toISOString().slice(0,10);
    const [e, c] = await Promise.all([
      supabase.from("exams").select("*").eq("active", true).gte("exam_date", today).order("exam_date"),
      supabase.from("classes").select("id,name").order("order_position"),
    ]);
    setExams((e.data as any) || []);
    setClasses((c.data as any) || []);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("public-exams")
      .on("postgres_changes", { event: "*", schema: "public", table: "exams" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const classMap = Object.fromEntries(classes.map(c => [c.id, c.name]));

  return (
    <div className="min-h-screen p-6 md:p-10">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold neon-text-cyan tracking-widest">📝 PROVAS</h1>
          <div className="hud-line mt-1" />
        </div>
        <Link to="/" className="font-display text-xs px-4 py-2 rounded glass-panel neon-text-cyan hover:bg-secondary/10">
          ← VOLTAR
        </Link>
      </header>

      {exams.length === 0 ? (
        <div className="glass-panel p-10 text-center text-muted-foreground font-display">
          Nenhuma prova programada.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {exams.map(e => (
            <div key={e.id} className="glass-panel p-5">
              <p className="font-display text-xs neon-text-purple tracking-widest">
                {new Date(e.exam_date + "T00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
              </p>
              <p className="font-display text-2xl neon-text-cyan mt-1">{e.subject}</p>
              <p className="font-body text-sm text-foreground/80 mt-1">Turma: {classMap[e.class_id] ?? "—"}</p>
              {(e.start_time || e.room) && (
                <p className="font-body text-sm text-muted-foreground mt-1">
                  {e.start_time ? `🕒 ${e.start_time.slice(0,5)}${e.end_time ? `–${e.end_time.slice(0,5)}` : ""}` : ""}
                  {e.room ? `  ·  🚪 Sala ${e.room}` : ""}
                </p>
              )}
              {e.description && <p className="font-body text-sm mt-3 whitespace-pre-line">{e.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
