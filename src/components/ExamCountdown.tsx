import { exams, getColorClasses } from "@/data/scheduleData";

const ExamCountdown = () => {
  const now = new Date();

  const upcomingExams = exams
    .map((exam) => {
      const examDate = new Date(exam.date + "T00:00:00");
      const diffMs = examDate.getTime() - now.getTime();
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return { ...exam, daysLeft };
    })
    .filter((e) => e.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  return (
    <div className="glass-panel p-4 md:p-6 h-full">
      <h2 className="font-display text-lg md:text-xl font-bold neon-text-pink mb-4 tracking-wider flex items-center gap-2">
        <span className="text-2xl">📝</span> PROVAS
      </h2>
      <div className="space-y-3">
        {upcomingExams.map((exam, i) => {
          const colors = getColorClasses(exam.color);
          const isUrgent = exam.daysLeft <= 2;
          return (
            <div
              key={exam.id}
              className={`p-3 rounded-lg border transition-all duration-300 animate-float-up
                ${isUrgent ? `${colors.bg} ${colors.border} ${colors.glow}` : "border-border/30 hover:bg-muted/20"}`}
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`font-display text-sm font-bold tracking-wide ${colors.text}`}>
                    {exam.subject}
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    {new Date(exam.date).toLocaleDateString("pt-BR")} · {exam.room}
                  </p>
                </div>
                <div className={`text-right ${isUrgent ? "animate-pulse-glow" : ""}`}>
                  <span className={`font-display text-2xl font-bold ${colors.text}`}>
                    {exam.daysLeft}
                  </span>
                  <p className="text-xs text-muted-foreground font-mono">
                    {exam.daysLeft === 0 ? "HOJE!" : exam.daysLeft === 1 ? "dia" : "dias"}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        {upcomingExams.length === 0 && (
          <p className="text-muted-foreground text-sm text-center py-4 font-mono">
            Nenhuma prova próxima 🎉
          </p>
        )}
      </div>
    </div>
  );
};

export default ExamCountdown;
