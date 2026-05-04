export interface ScheduleItem {
  time: string;
  subject: string;
  teacher: string;
  room: string;
  color: string; // tailwind neon color key
}

export interface Announcement {
  id: number;
  type: "warning" | "info" | "urgent";
  title: string;
  message: string;
  date: string;
}

export interface Exam {
  id: number;
  subject: string;
  date: string; // ISO date
  room: string;
  color: string;
}

export interface NewsItem {
  id: number;
  text: string;
}

export const weekSchedule: Record<string, ScheduleItem[]> = {
  "Segunda": [
    { time: "07:30", subject: "Matemática", teacher: "Prof. Silva", room: "Sala 101", color: "cyan" },
    { time: "08:20", subject: "Português", teacher: "Prof. Santos", room: "Sala 102", color: "purple" },
    { time: "09:10", subject: "História", teacher: "Prof. Oliveira", room: "Sala 103", color: "pink" },
    { time: "10:20", subject: "Física", teacher: "Prof. Costa", room: "Lab 01", color: "green" },
    { time: "11:10", subject: "Inglês", teacher: "Prof. Lima", room: "Sala 201", color: "orange" },
  ],
  "Terça": [
    { time: "07:30", subject: "Química", teacher: "Prof. Pereira", room: "Lab 02", color: "green" },
    { time: "08:20", subject: "Biologia", teacher: "Prof. Almeida", room: "Lab 03", color: "cyan" },
    { time: "09:10", subject: "Geografia", teacher: "Prof. Souza", room: "Sala 104", color: "orange" },
    { time: "10:20", subject: "Matemática", teacher: "Prof. Silva", room: "Sala 101", color: "cyan" },
    { time: "11:10", subject: "Ed. Física", teacher: "Prof. Rocha", room: "Quadra", color: "pink" },
  ],
  "Quarta": [
    { time: "07:30", subject: "Português", teacher: "Prof. Santos", room: "Sala 102", color: "purple" },
    { time: "08:20", subject: "Matemática", teacher: "Prof. Silva", room: "Sala 101", color: "cyan" },
    { time: "09:10", subject: "Artes", teacher: "Prof. Dias", room: "Sala 301", color: "pink" },
    { time: "10:20", subject: "Filosofia", teacher: "Prof. Mendes", room: "Sala 105", color: "orange" },
    { time: "11:10", subject: "Inglês", teacher: "Prof. Lima", room: "Sala 201", color: "green" },
  ],
  "Quinta": [
    { time: "07:30", subject: "Física", teacher: "Prof. Costa", room: "Lab 01", color: "green" },
    { time: "08:20", subject: "Química", teacher: "Prof. Pereira", room: "Lab 02", color: "cyan" },
    { time: "09:10", subject: "Sociologia", teacher: "Prof. Ribeiro", room: "Sala 106", color: "purple" },
    { time: "10:20", subject: "História", teacher: "Prof. Oliveira", room: "Sala 103", color: "pink" },
    { time: "11:10", subject: "Matemática", teacher: "Prof. Silva", room: "Sala 101", color: "orange" },
  ],
  "Sexta": [
    { time: "07:30", subject: "Biologia", teacher: "Prof. Almeida", room: "Lab 03", color: "cyan" },
    { time: "08:20", subject: "Geografia", teacher: "Prof. Souza", room: "Sala 104", color: "orange" },
    { time: "09:10", subject: "Português", teacher: "Prof. Santos", room: "Sala 102", color: "purple" },
    { time: "10:20", subject: "Ed. Física", teacher: "Prof. Rocha", room: "Quadra", color: "pink" },
    { time: "11:10", subject: "Redação", teacher: "Prof. Santos", room: "Sala 102", color: "green" },
  ],
};

export const announcements: Announcement[] = [
  { id: 1, type: "urgent", title: "Prova de Matemática", message: "Amanhã, estudem capítulos 5 a 8", date: "2026-05-05" },
  { id: 2, type: "warning", title: "Trabalho de História", message: "Entrega até sexta-feira", date: "2026-05-08" },
  { id: 3, type: "info", title: "Semana Cultural", message: "Inscrições abertas para apresentações", date: "2026-05-12" },
  { id: 4, type: "urgent", title: "Reunião de Pais", message: "Dia 15/05 às 19h no auditório", date: "2026-05-15" },
];

export const exams: Exam[] = [
  { id: 1, subject: "Matemática", date: "2026-05-05", room: "Sala 101", color: "cyan" },
  { id: 2, subject: "Português", date: "2026-05-08", room: "Sala 102", color: "purple" },
  { id: 3, subject: "Física", date: "2026-05-12", room: "Lab 01", color: "green" },
  { id: 4, subject: "História", date: "2026-05-15", room: "Sala 103", color: "pink" },
  { id: 5, subject: "Química", date: "2026-05-20", room: "Lab 02", color: "orange" },
];

export const news: NewsItem[] = [
  { id: 1, text: "🏆 Equipe de robótica classificada para as finais estaduais" },
  { id: 2, text: "📚 Biblioteca com novos títulos disponíveis para empréstimo" },
  { id: 3, text: "🎭 Festival de teatro: inscrições abertas até dia 10" },
  { id: 4, text: "⚽ Campeonato interclasses começa na próxima semana" },
  { id: 5, text: "🔬 Feira de ciências marcada para junho — preparem seus projetos!" },
  { id: 6, text: "🎓 Palestra sobre carreiras: dia 18/05 no auditório principal" },
];

export const getDayName = (): string => {
  const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  return days[new Date().getDay()];
};

export const getColorClasses = (color: string) => {
  const map: Record<string, { bg: string; text: string; border: string; glow: string }> = {
    cyan: { bg: "bg-neon-cyan/10", text: "text-neon-cyan", border: "border-neon-cyan/30", glow: "shadow-[0_0_15px_-5px_hsl(195_100%_50%/0.4)]" },
    purple: { bg: "bg-neon-purple/10", text: "text-neon-purple", border: "border-neon-purple/30", glow: "shadow-[0_0_15px_-5px_hsl(270_80%_60%/0.4)]" },
    pink: { bg: "bg-neon-pink/10", text: "text-neon-pink", border: "border-neon-pink/30", glow: "shadow-[0_0_15px_-5px_hsl(330_90%_60%/0.4)]" },
    green: { bg: "bg-neon-green/10", text: "text-neon-green", border: "border-neon-green/30", glow: "shadow-[0_0_15px_-5px_hsl(150_100%_50%/0.4)]" },
    orange: { bg: "bg-neon-orange/10", text: "text-neon-orange", border: "border-neon-orange/30", glow: "shadow-[0_0_15px_-5px_hsl(30_100%_55%/0.4)]" },
  };
  return map[color] || map.cyan;
};
