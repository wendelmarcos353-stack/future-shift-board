import { news } from "@/data/scheduleData";

const NewsTicker = () => {
  const allNews = [...news, ...news]; // duplicate for seamless loop

  return (
    <div className="glass-panel p-3 overflow-hidden">
      <div className="flex items-center gap-3">
        <span className="font-display text-xs font-bold neon-text-cyan whitespace-nowrap px-2 py-1 bg-primary/10 rounded border border-primary/20">
          📰 NEWS
        </span>
        <div className="flex-1 overflow-hidden">
          <div className="ticker-scroll whitespace-nowrap font-mono text-sm text-muted-foreground">
            {allNews.map((item, i) => (
              <span key={i} className="mx-8">{item.text}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsTicker;
