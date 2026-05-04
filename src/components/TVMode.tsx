import { useState, useEffect, useCallback } from "react";
import DigitalClock from "./DigitalClock";
import ScheduleBoard from "./ScheduleBoard";
import Announcements from "./Announcements";
import ExamCountdown from "./ExamCountdown";
import NewsTicker from "./NewsTicker";

const screens = ["schedule", "announcements", "exams", "news"] as const;
const screenLabels = { schedule: "HORÁRIOS", announcements: "AVISOS", exams: "PROVAS", news: "NOTÍCIAS" };

const TVMode = ({ onExit }: { onExit: () => void }) => {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [fade, setFade] = useState(true);

  const nextScreen = useCallback(() => {
    setFade(false);
    setTimeout(() => {
      setCurrentScreen((prev) => (prev + 1) % screens.length);
      setFade(true);
    }, 500);
  }, []);

  useEffect(() => {
    const timer = setInterval(nextScreen, 15000);
    return () => clearInterval(timer);
  }, [nextScreen]);

  const renderScreen = () => {
    switch (screens[currentScreen]) {
      case "schedule": return <ScheduleBoard />;
      case "announcements": return <Announcements />;
      case "exams": return <ExamCountdown />;
      case "news":
        return (
          <div className="glass-panel p-8 h-full flex flex-col gap-6">
            <h2 className="font-display text-3xl font-bold neon-text-cyan tracking-wider">📰 NOTÍCIAS</h2>
            <div className="flex-1 flex flex-col justify-center gap-6">
              {[...Array(3)].map((_, i) => {
                const item = (await_nothing => {
                  const { news } = require("@/data/scheduleData");
                  return news[i % news.length];
                })();
                return null;
              })}
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between p-4 md:p-6">
        <DigitalClock large />
        <button
          onClick={onExit}
          className="font-display text-xs px-4 py-2 rounded glass-panel neon-text-cyan hover:bg-primary/10 transition-all"
        >
          SAIR DO MODO TV
        </button>
      </div>

      {/* Screen indicators */}
      <div className="flex justify-center gap-2 mb-4">
        {screens.map((s, i) => (
          <button
            key={s}
            onClick={() => { setFade(false); setTimeout(() => { setCurrentScreen(i); setFade(true); }, 300); }}
            className={`font-display text-xs px-3 py-1 rounded transition-all duration-300
              ${currentScreen === i ? "neon-text-cyan bg-primary/15 neon-border" : "text-muted-foreground hover:text-foreground"}`}
          >
            {screenLabels[s]}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className={`flex-1 px-4 md:px-8 pb-6 transition-all duration-500 ${fade ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
        {screens[currentScreen] !== "news" ? renderScreen() : (
          <NewsFullScreen />
        )}
      </div>

      {/* Bottom ticker */}
      <div className="px-4 pb-4">
        <NewsTicker />
      </div>

      <div className="scan-line" />
    </div>
  );
};

const NewsFullScreen = () => {
  const { news } = require("@/data/scheduleData");
  return (
    <div className="glass-panel p-8 h-full flex flex-col gap-6">
      <h2 className="font-display text-3xl font-bold neon-text-cyan tracking-wider">📰 NOTÍCIAS</h2>
      <div className="flex-1 flex flex-col justify-center gap-5">
        {news.map((item: { id: number; text: string }, i: number) => (
          <div key={item.id} className="glass-panel p-5 animate-float-up" style={{ animationDelay: `${i * 150}ms` }}>
            <p className="font-body text-xl md:text-2xl text-foreground">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TVMode;
