import { announcements } from "@/data/scheduleData";

const typeStyles = {
  urgent: { icon: "🚨", accent: "border-neon-pink/40 bg-neon-pink/5", text: "text-neon-pink" },
  warning: { icon: "⚠️", accent: "border-neon-orange/40 bg-neon-orange/5", text: "text-neon-orange" },
  info: { icon: "ℹ️", accent: "border-neon-cyan/40 bg-neon-cyan/5", text: "text-neon-cyan" },
};

const Announcements = () => {
  return (
    <div className="glass-panel p-4 md:p-6 h-full">
      <h2 className="font-display text-lg md:text-xl font-bold neon-text-purple mb-4 tracking-wider flex items-center gap-2">
        <span className="text-2xl">📢</span> AVISOS IMPORTANTES
      </h2>
      <div className="space-y-3">
        {announcements.map((item, i) => {
          const style = typeStyles[item.type];
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
                  <p className="text-xs text-muted-foreground mt-0.5">{item.message}</p>
                  <p className="text-xs font-mono text-muted-foreground/60 mt-1">{item.date}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Announcements;
