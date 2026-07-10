import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

type ClassRow = { id: string; name: string; grade: number; order_position: number; active: boolean };
type Schedule = { id: string; class_id: string; teacher_id: string | null; subject: string; room: string | null; day_of_week: number; start_time: string; end_time: string };
type Lesson = { id: string; class_id: string; teacher_id: string | null; subject: string; room: string | null; lesson_date: string | null; day_of_week: number | null; start_time: string; end_time: string };
type Announcement = { id: string; title: string; description: string | null; priority: string; target_scope: any; start_date: string | null; end_date: string | null; active: boolean };
type Exam = { id: string; class_id: string; teacher_id: string | null; subject: string; room: string | null; exam_date: string; start_time: string | null; end_time: string | null; active: boolean };
type Teacher = { id: string; display_name: string | null; avatar_url: string | null };
type TeacherInfo = { name: string; avatar: string | null };

const isAnnActive = (a: Announcement) => {
  if (!a.active) return false;
  const now = Date.now();
  if (a.start_date && new Date(a.start_date).getTime() > now) return false;
  if (a.end_date && new Date(a.end_date).getTime() < now) return false;
  return true;
};
const annMatches = (a: Announcement, cls: ClassRow) => {
  const t = a.target_scope || {};
  if (!t.type || t.type === "all") return true;
  if (t.type === "grade") return Number(t.grade) === cls.grade;
  if (t.type === "classes") return Array.isArray(t.class_ids) && t.class_ids.includes(cls.id);
  return true;
};

export default function ClassTabs() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [teachers, setTeachers] = useState<Record<string, TeacherInfo>>({});
  const [grade, setGrade] = useState<string>("1");
  const [classId, setClassId] = useState<string>("");
  const todayIdx = new Date().getDay();
  const defaultDay = todayIdx >= 1 && todayIdx <= 5 ? todayIdx : 1;
  const [selectedDay, setSelectedDay] = useState<number>(defaultDay);

  useEffect(() => {
    const load = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [c, s, l, a, e, t] = await Promise.all([
        supabase.from("classes").select("*").eq("active", true).order("order_position"),
        supabase.from("schedules").select("*"),
        supabase.from("lessons").select("*").gte("lesson_date", today),
        supabase.from("announcements").select("*").eq("active", true),
        supabase.from("exams").select("*").eq("active", true).gte("exam_date", today).order("exam_date"),
        supabase.from("teacher_directory").select("*"),
      ]);
      if (c.data) setClasses(c.data as any);
      if (s.data) setSchedules(s.data as any);
      if (l.data) setLessons(l.data as any);
      if (a.data) setAnnouncements(a.data as any);
      if (e.data) setExams(e.data as any);
      if (t.data) {
        const m: Record<string, TeacherInfo> = {};
        (t.data as Teacher[]).forEach((x) => { m[x.id] = { name: x.display_name || "", avatar: x.avatar_url }; });
        setTeachers(m);
      }
    };
    load();
    const ch = supabase
      .channel("home-classtabs")
      .on("postgres_changes", { event: "*", schema: "public", table: "classes" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "schedules" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "lessons" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "exams" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const grouped = useMemo(() => {
    const g: Record<string, ClassRow[]> = { "1": [], "2": [], "3": [] };
    classes.forEach((c) => {
      const key = String(c.grade);
      if (g[key]) g[key].push(c);
    });
    return g;
  }, [classes]);

  // Default class selection when grade changes
  useEffect(() => {
    const list = grouped[grade] || [];
    if (list.length && !list.find((c) => c.id === classId)) setClassId(list[0].id);
  }, [grade, grouped, classId]);

  const current = classes.find((c) => c.id === classId);
  const today = new Date().getDay();

  const classSchedules = useMemo(
    () =>
      schedules
        .filter((s) => s.class_id === classId)
        .sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)),
    [schedules, classId]
  );

  const todaySchedules = classSchedules.filter((s) => s.day_of_week === today);
  const upcomingLessons = useMemo(
    () => lessons.filter((l) => l.class_id === classId).sort((a, b) => (a.lesson_date || "").localeCompare(b.lesson_date || "")).slice(0, 5),
    [lessons, classId]
  );
  const classAnnouncements = useMemo(
    () => announcements.filter(isAnnActive).filter((a) => current && annMatches(a, current)),
    [announcements, current]
  );
  const classExams = useMemo(() => exams.filter((e) => e.class_id === classId), [exams, classId]);

  const teacherList = useMemo(() => {
    const ids = new Set<string>();
    classSchedules.forEach((s) => s.teacher_id && ids.add(s.teacher_id));
    return Array.from(ids).map((id) => teachers[id]).filter((t): t is TeacherInfo => !!t && !!t.name);
  }, [classSchedules, teachers]);

  const teacherLabel = (id: string | null) => {
    if (!id) return "Professor não informado";
    const t = teachers[id];
    return t?.name ? `Prof. ${t.name}` : "Professor não informado";
  };
  const teacherAvatar = (id: string | null) => (id ? teachers[id]?.avatar ?? null : null);

  if (classes.length === 0) {
    return <div className="glass-panel p-6 text-center text-muted-foreground">Carregando turmas…</div>;
  }

  return (
    <div className="glass-panel p-4 md:p-6">
      <Tabs value={grade} onValueChange={setGrade} className="w-full">
        <TabsList className="grid grid-cols-3 mb-4 bg-background/30">
          <TabsTrigger value="1" className="font-display tracking-wider">1º ANO</TabsTrigger>
          <TabsTrigger value="2" className="font-display tracking-wider">2º ANO</TabsTrigger>
          <TabsTrigger value="3" className="font-display tracking-wider">3º ANO</TabsTrigger>
        </TabsList>

        {["1", "2", "3"].map((g) => (
          <TabsContent key={g} value={g}>
            <Tabs value={classId} onValueChange={setClassId}>
              <TabsList className="flex flex-wrap gap-1 mb-4 bg-transparent h-auto p-0">
                {(grouped[g] || []).map((c) => (
                  <TabsTrigger
                    key={c.id}
                    value={c.id}
                    className="font-display data-[state=active]:neon-text-cyan data-[state=active]:neon-border data-[state=active]:bg-primary/10 px-4 py-2"
                  >
                    {c.name}
                  </TabsTrigger>
                ))}
              </TabsList>

              {(grouped[g] || []).map((c) => (
                <TabsContent key={c.id} value={c.id} className="space-y-4">
                  {/* Aulas de hoje */}
                  <section>
                    <h3 className="font-display text-sm neon-text-purple tracking-wider mb-2">
                      📅 AULAS DE HOJE · {DAYS[today]}
                    </h3>
                    {todaySchedules.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sem aulas hoje.</p>
                    ) : (
                      <div className="grid gap-2">
                        {todaySchedules.map((s) => {
                          const avatar = teacherAvatar(s.teacher_id);
                          return (
                          <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-card/30">
                            <div className="font-mono text-sm font-bold neon-text-cyan w-28">
                              {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                            </div>
                            {avatar ? (
                              <img src={avatar} alt="" loading="lazy" className="h-8 w-8 rounded-full object-cover border border-primary/40" />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-xs">👤</div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-display text-base">{s.subject}</p>
                              <p className="text-xs text-muted-foreground">
                                {teacherLabel(s.teacher_id)}
                                {s.room ? ` · Sala ${s.room}` : ""}
                              </p>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    )}
                  </section>

                  {/* Horário por dia da semana */}
                  <section>
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                      <h3 className="font-display text-sm neon-text-purple tracking-wider">
                        🗓️ HORÁRIO DA SEMANA
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3 p-1 rounded-lg bg-background/30 border border-border/40">
                      {[1, 2, 3, 4, 5].map((d) => {
                        const isActive = selectedDay === d;
                        const isToday = todayIdx === d;
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setSelectedDay(d)}
                            className={`flex-1 min-w-[70px] px-3 py-2 rounded-md font-display text-xs md:text-sm tracking-wider transition-all duration-300 ${
                              isActive
                                ? "bg-primary/20 neon-text-cyan neon-border shadow-[0_0_12px_hsl(var(--primary)/0.4)]"
                                : "text-muted-foreground hover:text-foreground hover:bg-primary/5"
                            }`}
                            aria-pressed={isActive}
                          >
                            <span className="hidden md:inline">{DAYS[d]}</span>
                            <span className="md:hidden">{DAYS[d].slice(0, 3)}</span>
                            {isToday && <span className="ml-1 text-[10px] neon-text-pink">•</span>}
                          </button>
                        );
                      })}
                    </div>
                    {(() => {
                      const daySchedules = classSchedules.filter((s) => s.day_of_week === selectedDay);
                      if (daySchedules.length === 0) {
                        return (
                          <p className="text-sm text-muted-foreground py-4 text-center">
                            Nenhuma aula cadastrada para este dia.
                          </p>
                        );
                      }
                      return (
                        <div className="grid gap-2 animate-float-up">
                          {daySchedules.map((s) => (
                            <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-card/30">
                              <div className="font-mono text-sm font-bold neon-text-cyan w-28">
                                {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-display text-base">{s.subject}</p>
                                <p className="text-xs text-muted-foreground">
                                  {s.teacher_id ? (teachers[s.teacher_id] || "Professor") : "—"}
                                  {s.room ? ` · Sala ${s.room}` : ""}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </section>


                  {/* Próximas aulas pontuais */}
                  {upcomingLessons.length > 0 && (
                    <section>
                      <h3 className="font-display text-sm neon-text-purple tracking-wider mb-2">
                        🔔 PRÓXIMAS AULAS
                      </h3>
                      <div className="grid gap-2">
                        {upcomingLessons.map((l) => (
                          <div key={l.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-card/30">
                            <div className="font-mono text-xs neon-text-cyan w-28">
                              {l.lesson_date && new Date(l.lesson_date + "T00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}
                            </div>
                            <div className="flex-1">
                              <p className="font-display text-sm">{l.subject}</p>
                              <p className="text-xs text-muted-foreground">
                                {l.start_time.slice(0, 5)}–{l.end_time.slice(0, 5)}
                                {l.teacher_id ? ` · ${teachers[l.teacher_id] || "Professor"}` : ""}
                                {l.room ? ` · Sala ${l.room}` : ""}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Professores */}
                  {teacherList.length > 0 && (
                    <section>
                      <h3 className="font-display text-sm neon-text-purple tracking-wider mb-2">👩‍🏫 PROFESSORES</h3>
                      <div className="flex flex-wrap gap-2">
                        {teacherList.map((name, i) => (
                          <span key={i} className="px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-sm">{name}</span>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Avisos da turma */}
                  {classAnnouncements.length > 0 && (
                    <section>
                      <h3 className="font-display text-sm neon-text-pink tracking-wider mb-2">📢 AVISOS</h3>
                      <div className="grid gap-2">
                        {classAnnouncements.map((a) => (
                          <div key={a.id} className={`p-3 rounded-lg border ${a.priority === "high" ? "border-pink-500/40 bg-pink-500/5" : "border-border/40 bg-card/30"}`}>
                            <p className="font-display text-sm neon-text-cyan">{a.title}</p>
                            {a.description && <p className="text-xs text-foreground/80 mt-1 whitespace-pre-line">{a.description}</p>}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Provas da turma */}
                  {classExams.length > 0 && (
                    <section>
                      <h3 className="font-display text-sm neon-text-pink tracking-wider mb-2">📝 PROVAS</h3>
                      <div className="grid gap-2">
                        {classExams.map((e) => (
                          <div key={e.id} className="p-3 rounded-lg border border-border/40 bg-card/30 flex items-center gap-3">
                            <div className="font-mono text-xs neon-text-pink w-28">
                              {new Date(e.exam_date + "T00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}
                            </div>
                            <div className="flex-1">
                              <p className="font-display text-sm">{e.subject}</p>
                              <p className="text-xs text-muted-foreground">
                                {e.start_time ? `${e.start_time.slice(0, 5)}${e.end_time ? `–${e.end_time.slice(0, 5)}` : ""}` : ""}
                                {e.room ? ` · Sala ${e.room}` : ""}
                                {e.teacher_id && teachers[e.teacher_id] ? ` · ${teachers[e.teacher_id]}` : ""}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
