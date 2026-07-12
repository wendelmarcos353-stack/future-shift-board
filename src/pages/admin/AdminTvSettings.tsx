import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { toastSupaError } from "@/lib/supaError";

export default function AdminTvSettings() {
  const [settings, setSettings] = useState<any>(null);

  const load = async () => {
    const { data } = await supabase.from("tv_settings").select("*").limit(1).maybeSingle();
    setSettings(data);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!settings) return;
    const { error } = await supabase.from("tv_settings").update({
      rotation_seconds: settings.rotation_seconds,
      logo_url: settings.logo_url,
      background_url: settings.background_url,
      show_clock: settings.show_clock,
      show_announcements: settings.show_announcements,
      show_news: settings.show_news,
      theme: settings.theme,
    }).eq("id", settings.id);
    if (error) return toastSupaError(error, { table: "tv_settings", op: "UPDATE", action: "salvar configurações do Modo TV" });
    toast.success("Configurações salvas");
  };

  if (!settings) return <p>Carregando...</p>;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Configurações do Modo TV</h1>
      <Card className="p-6 bg-zinc-900 border-zinc-800 space-y-5">
        <div>
          <Label>Tempo de rotação (segundos)</Label>
          <Input
            type="number"
            min={5}
            value={settings.rotation_seconds}
            onChange={(e) => setSettings({ ...settings, rotation_seconds: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label>URL do logotipo</Label>
          <Input value={settings.logo_url || ""} onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })} />
        </div>
        <div>
          <Label>URL do plano de fundo</Label>
          <Input value={settings.background_url || ""} onChange={(e) => setSettings({ ...settings, background_url: e.target.value })} />
        </div>
        <div className="flex items-center justify-between">
          <Label>Exibir relógio</Label>
          <Switch checked={settings.show_clock} onCheckedChange={(v) => setSettings({ ...settings, show_clock: v })} />
        </div>
        <div className="flex items-center justify-between">
          <Label>Exibir painel de avisos</Label>
          <Switch checked={settings.show_announcements} onCheckedChange={(v) => setSettings({ ...settings, show_announcements: v })} />
        </div>
        <Button onClick={save}>Salvar</Button>
      </Card>
    </div>
  );
}
