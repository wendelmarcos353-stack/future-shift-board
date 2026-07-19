import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DigitalClock from "@/components/DigitalClock";

type ClassRow = { id: string; name: string; grade: number; order_position: number; active: boolean };
type Schedule = {
  id: string;
  class_id: string;
  subject: string;
  room: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  teacher_id: string | null;
};
type Announcement = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  target_scope: any;
  start_date: string | null;
  end_date: string | null;
  active: boolean;
};
type TvSettings = {
  rotation_seconds: number;
  logo_url: string | null;
  background_url: string | null;
  show_clock: boolean;
  show_announcements: boolean;
};

const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const isAnnouncementActive = (a: Announcement) => {
  if (!a.active) return false;
  const now = Date.now();
  if (a.start_date && new Date(a.start_date).getTime() > now) return false;
  if (a.end_date && new Date(a.end_date).getTime() < now) return false;
  return true;
};

const announcementMatchesClass = (a: Announcement, cls: ClassRow) => {
  const t = a.target_scope || {};
  if (!t.type || t.type === "all") return true;
  if (t.type === "grade") return Number(t.grade) === cls.grade;
  if (t.type === "classes") return Array.isArray(t.class_ids) && t.class_ids.includes(cls.id);
  return true;
};

type Exam = {
  id: string; class_id: string; subject: string; room: string | null;
  exam_date: string; start_time: string | null; end_time: string | null;
};
type Teacher = { id: string; display_name: string | null; avatar_url: string | null };

export default function TVMode() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [settings, setSettings] = useState<TvSettings | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [teachers, setTeachers] = useState<Record<string, { name: string; avatar: string | null }>>({});
  const [subjectMap, setSubjectMap] = useState<Record<string, string>>({});
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const load = async () => {
      const today = new Date().toISOString().slice(0,10);
      const [c, s, a, t, e, tt, ts] = await Promise.all([
        supabase.from("classes").select("*").eq("active", true).order("order_position"),
        supabase.from("schedules").select("*"),
        supabase.from("announcements").select("*"),
        supabase.from("tv_settings").select("*").limit(1).maybeSingle(),
        supabase.from("exams").select("*").eq("active", true).gte("exam_date", today).order("exam_date"),
        supabase.from("teacher_directory").select("*"),
        supabase.from("teacher_subjects").select("class_id,subject,teacher_id"),
      ]);
      if (c.data) setClasses(c.data as any);
      if (s.data) setSchedules(s.data as any);
      if (a.data) setAnnouncements(a.data as any);
      if (t.data) setSettings(t.data as any);
      if (e.data) setExams(e.data as any);
      if (tt.data) {
        const m: Record<string, { name: string; avatar: string | null }> = {};
        (tt.data as Teacher[]).forEach((x) => { m[x.id] = { name: x.display_name || "", avatar: x.avatar_url }; });
        setTeachers(m);
      }
      if (ts.data) {
        const m: Record<string, string> = {};
        (ts.data as { class_id: string | null; subject: string; teacher_id: string }[]).forEach((r) => {
          if (r.class_id) m[`${r.class_id}::${r.subject}`] = r.teacher_id;
          m[`*::${r.subject}`] = m[`*::${r.subject}`] || r.teacher_id;
        });
        setSubjectMap(m);
      }
    };
    load();

    const ch = supabase
      .channel("tv-mode")
      .on("postgres_changes", { event: "*", schema: "public", table: "classes" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "schedules" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "tv_settings" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "exams" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "teacher_subjects" }, load)
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Slots: classes followed by an optional "exams" slot
  const hasExamSlot = exams.length > 0;
  const totalSlots = classes.length + (hasExamSlot ? 1 : 0);

  const rotationMs = (settings?.rotation_seconds ?? 15) * 1000;
  useEffect(() => {
    if (totalSlots === 0) return;
    const t = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % totalSlots);
        setFade(true);
      }, 400);
    }, rotationMs);
    return () => clearInterval(t);
  }, [rotationMs, totalSlots]);

  const isExamSlot = hasExamSlot && idx === classes.length;
  const currentClass = isExamSlot ? undefined : classes[idx];
  const today = now.getDay();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const classSchedules = useMemo(
    () =>
      schedules
        .filter((s) => s.class_id === currentClass?.id && s.day_of_week === today)
        .filter((s) => {
          const [eh, em] = s.end_time.split(":").map(Number);
          return eh * 60 + em > nowMin;
        })
        .sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [schedules, currentClass, today, nowMin]
  );

  const activeAnnouncements = useMemo(
    () =>
      announcements
        .filter(isAnnouncementActive)
        .filter((a) => !currentClass || announcementMatchesClass(a, currentClass))
        .sort((a, b) => (a.priority === "high" ? -1 : 1)),
    [announcements, currentClass]
  );

  const showSidebar =
    !isExamSlot && (settings?.show_announcements ?? true) && activeAnnouncements.length > 0;

  const isCurrentClass = (s: Schedule) => {
    const [sh, sm] = s.start_time.split(":").map(Number);
    const [eh, em] = s.end_time.split(":").map(Number);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return nowMin >= sh * 60 + sm && nowMin < eh * 60 + em;
  };

  const classMap = Object.fromEntries(classes.map((c) => [c.id, c.name]));

  return (
    <div
      className="fixed inset-0 bg-background text-foreground overflow-hidden"
      style={
        settings?.background_url
          ? { backgroundImage: `url(${settings.background_url})`, backgroundSize: "cover", backgroundPosition: "center" }
          : undefined
      }
    >
      <div className="absolute inset-0 bg-background/85 backdrop-blur-sm" />

      <div className="relative z-10 h-full flex">
        <main
          className={`flex-1 flex flex-col p-8 transition-opacity duration-500 ${fade ? "opacity-100" : "opacity-0"}`}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              {settings?.logo_url && (
                <img src={settings.logo_url} alt="" className="h-14 w-14 object-contain" />
              )}
              <div>
                <p className="font-display text-sm text-muted-foreground tracking-widest">
                  {isExamSlot ? "PRÓXIMAS AVALIAÇÕES" : "TURMA EM EXIBIÇÃO"}
                </p>
                <h1 className="font-display text-7xl font-bold neon-text-cyan tracking-wider leading-none">
                  {isExamSlot ? "📝 PROVAS" : currentClass?.name ?? "—"}
                </h1>
              </div>
            </div>
            {settings?.show_clock !== false && (
              <div className="text-right">
                <DigitalClock large />
                <p className="font-display text-lg text-muted-foreground mt-1">
                  {DAY_NAMES[today]} · {now.toLocaleDateString("pt-BR")}
                </p>
              </div>
            )}
          </div>

          <div className="flex-1 glass-panel p-6 overflow-hidden flex flex-col">
            {isExamSlot ? (
              <>
                <h2 className="font-display text-2xl neon-text-purple mb-4 tracking-wider">
                  📝 CALENDÁRIO DE PROVAS
                </h2>
                <div className="grid gap-3 overflow-y-auto md:grid-cols-2">
                  {exams.map((e) => (
                    <div key={e.id} className="p-5 rounded-lg border border-border/40 bg-card/30">
                      <p className="font-display text-xs neon-text-purple tracking-widest">
                        {new Date(e.exam_date + "T00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "long" })}
                      </p>
                      <p className="font-display text-2xl neon-text-cyan mt-1">{e.subject}</p>
                      <p className="font-body text-sm text-foreground/80">Turma: {classMap[e.class_id] ?? "—"}</p>
                      {(e.start_time || e.room) && (
                        <p className="font-body text-sm text-muted-foreground mt-1">
                          {e.start_time ? `🕒 ${e.start_time.slice(0,5)}${e.end_time ? `–${e.end_time.slice(0,5)}` : ""}` : ""}
                          {e.room ? `  ·  🚪 Sala ${e.room}` : ""}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h2 className="font-display text-2xl neon-text-purple mb-4 tracking-wider">
                  📅 AULAS DE HOJE
                </h2>
                {classSchedules.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="font-display text-3xl text-muted-foreground">Não há mais aulas hoje.</p>
                  </div>
                ) : (
                  <div className="grid gap-3 overflow-y-auto">
                    {classSchedules.map((s) => {
                      const active = isCurrentClass(s);
                      const resolvedId =
                        subjectMap[`${s.class_id}::${s.subject}`] ||
                        subjectMap[`*::${s.subject}`] ||
                        s.teacher_id;
                      const t = resolvedId ? teachers[resolvedId] : null;
                      const teacherName = t?.name ? `Prof. ${t.name}` : "Professor não informado";
                      return (
                        <div
                          key={s.id}
                          className={`flex items-center gap-6 p-5 rounded-lg border transition-all ${
                            active
                              ? "border-primary bg-primary/15 neon-border scale-[1.02]"
                              : "border-border/40 bg-card/30"
                          }`}
                        >
                          <div className={`font-display text-3xl font-bold ${active ? "neon-text-cyan" : "text-foreground"}`}>
                            {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                          </div>
                          {t?.avatar ? (
                            <img src={t.avatar} alt="" loading="lazy" className="h-14 w-14 rounded-full object-cover border-2 border-primary/50" />
                          ) : (
                            <div className="h-14 w-14 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center text-2xl">👤</div>
                          )}
                          <div className="flex-1">
                            <p className={`font-display text-2xl ${active ? "neon-text-pink" : "text-foreground"}`}>
                              {s.subject}
                            </p>
                            <p className="font-body text-base text-muted-foreground">
                              {teacherName}{s.room ? `  ·  Sala ${s.room}` : ""}
                            </p>
                          </div>
                          {active && (
                            <span className="font-display text-sm neon-text-cyan animate-pulse tracking-wider">
                              ● EM AULA
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="mt-4 flex justify-center gap-2">
            {Array.from({ length: totalSlots }).map((_, i) => (
              <span
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i === idx ? "w-8 bg-primary" : "w-2 bg-muted"
                }`}
              />
            ))}
          </div>
        </main>

        {showSidebar && (
          <aside className="w-96 border-l border-border/50 bg-card/40 backdrop-blur p-6 flex flex-col gap-4 overflow-y-auto">
            <h2 className="font-display text-xl neon-text-pink tracking-wider">📢 AVISOS</h2>
            {activeAnnouncements.map((a) => (
              <div
                key={a.id}
                className={`glass-panel p-4 ${
                  a.priority === "high" ? "border-pink-500/40 neon-border" : ""
                }`}
              >
                <p className="font-display text-lg neon-text-cyan">{a.title}</p>
                {a.description && (
                  <p className="font-body text-sm text-foreground/90 mt-2 whitespace-pre-line">
                    {a.description}
                  </p>
                )}
                {a.end_date && (
                  <p className="font-body text-xs text-muted-foreground mt-2">
                    até {new Date(a.end_date).toLocaleDateString("pt-BR")}
                  </p>
                )}
              </div>
            ))}
          </aside>
        )}
      </div>

      <div className="scan-line pointer-events-none" />
    </div>
  );
}
