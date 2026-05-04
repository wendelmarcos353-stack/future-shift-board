import { useState, useEffect } from "react";
import { weekSchedule, getDayName, getColorClasses, type ScheduleItem } from "@/data/scheduleData";

const days = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];

const ScheduleBoard = () => {
  const [selectedDay, setSelectedDay] = useState(getDayName());
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const isCurrentSlot = (time: string) => {
    if (selectedDay !== getDayName()) return false;
    const [h, m] = time.split(":").map(Number);
    const now = currentTime.getHours() * 60 + currentTime.getMinutes();
    const slotStart = h * 60 + m;
    return now >= slotStart && now < slotStart + 50;
  };

  const schedule = weekSchedule[selectedDay] || [];

  return (
    <div className="glass-panel p-4 md:p-6 h-full">
      <h2 className="font-display text-lg md:text-xl font-bold neon-text-cyan mb-4 tracking-wider flex items-center gap-2">
        <span className="text-2xl">🕒</span> QUADRO DE HORÁRIOS
      </h2>

      {/* Day tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {days.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`font-display text-xs md:text-sm px-3 py-1.5 rounded-md transition-all duration-300 whitespace-nowrap
              ${selectedDay === day
                ? "bg-primary/20 neon-text-cyan neon-border"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Schedule items */}
      <div className="space-y-2">
        {schedule.map((item, i) => {
          const colors = getColorClasses(item.color);
          const isCurrent = isCurrentSlot(item.time);
          return (
            <div
              key={i}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-500 animate-float-up
                ${isCurrent
                  ? `${colors.bg} ${colors.border} ${colors.glow} scale-[1.02]`
                  : "border-border/30 hover:border-border/60 hover:bg-muted/20"
                }`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className={`font-mono text-sm font-bold ${isCurrent ? colors.text : "text-muted-foreground"}`}>
                {item.time}
              </div>
              <div className={`w-1 h-8 rounded-full ${isCurrent ? "animate-pulse-glow" : "opacity-40"}`}
                style={{ backgroundColor: `hsl(var(--neon-${item.color}))` }} />
              <div className="flex-1 min-w-0">
                <p className={`font-display text-sm font-semibold tracking-wide ${isCurrent ? colors.text : "text-foreground"}`}>
                  {item.subject}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {item.teacher} · {item.room}
                </p>
              </div>
              {isCurrent && (
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary/20 neon-text-cyan animate-pulse-glow">
                  AGORA
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ScheduleBoard;
