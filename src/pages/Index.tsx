import DigitalClock from "@/components/DigitalClock";
import ScheduleBoard from "@/components/ScheduleBoard";
import Announcements from "@/components/Announcements";
import ExamCountdown from "@/components/ExamCountdown";
import NewsTicker from "@/components/NewsTicker";

const Index = () => {


  return (
    <div className="min-h-screen p-3 md:p-6 relative">
      {/* Scan lines overlay */}
      <div className="scan-line" />

      {/* Header */}
      <header className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold neon-text-cyan tracking-[0.2em]">
              PAINEL ESCOLAR
            </h1>
            <div className="hud-line mt-1" />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <DigitalClock />
          <button
            onClick={() => setTvMode(true)}
            className="font-display text-xs px-4 py-2 rounded glass-panel neon-text-purple hover:bg-secondary/10 transition-all duration-300 hover:scale-105"
          >
            📺 MODO TV
          </button>
          <a
            href="/admin"
            className="font-display text-xs px-4 py-2 rounded glass-panel neon-text-cyan hover:bg-secondary/10 transition-all duration-300 hover:scale-105"
          >
            ⚙ ADMIN
          </a>
        </div>
      </header>

      {/* News ticker */}
      <div className="mb-6">
        <NewsTicker />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Schedule - takes 2 cols on desktop */}
        <div className="lg:col-span-2">
          <ScheduleBoard />
        </div>

        {/* Right column */}
        <div className="space-y-4 md:space-y-6">
          <Announcements />
          <ExamCountdown />
        </div>
      </div>

      {/* Footer HUD line */}
      <div className="mt-8">
        <div className="hud-line" />
        <p className="text-center font-mono text-xs text-muted-foreground/40 mt-2 tracking-widest">
          SYSTEM ONLINE · v2.0.26
        </p>
      </div>
    </div>
  );
};

export default Index;
