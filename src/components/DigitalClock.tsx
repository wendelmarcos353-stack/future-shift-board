import { useState, useEffect } from "react";

const DigitalClock = ({ large = false }: { large?: boolean }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours().toString().padStart(2, "0");
  const minutes = time.getMinutes().toString().padStart(2, "0");
  const seconds = time.getSeconds().toString().padStart(2, "0");
  const date = time.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="text-center">
      <div className={`font-display font-bold neon-text-cyan tracking-widest ${large ? "text-7xl md:text-9xl" : "text-3xl md:text-5xl"}`}>
        {hours}
        <span className="animate-pulse-glow">:</span>
        {minutes}
        <span className="animate-pulse-glow opacity-60">:</span>
        <span className="opacity-60">{seconds}</span>
      </div>
      <p className="font-mono text-muted-foreground mt-2 uppercase tracking-wider text-sm">
        {date}
      </p>
    </div>
  );
};

export default DigitalClock;
