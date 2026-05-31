import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

type Settings = {
  id?: string;
  site_name: string;
  logo: string;
  favicon: string;
  description: string;
  social_links: Record<string, string>;
  contact_email: string;
  contact_phone: string;
  footer_text: string;
};

export default function AdminSettings() {
  const [s, setS] = useState<Settings>({
    site_name: "", logo: "", favicon: "", description: "",
    social_links: { instagram: "", facebook: "", twitter: "", youtube: "" },
    contact_email: "", contact_phone: "", footer_text: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("site_settings").select("*").limit(1).maybeSingle().then(({ data }) => {
      if (data) {
        setS({
          id: data.id,
          site_name: data.site_name ?? "",
          logo: data.logo ?? "",
          favicon: data.favicon ?? "",
          description: data.description ?? "",
          social_links: { instagram: "", facebook: "", twitter: "", youtube: "", ...(data.social_links as any || {}) },
          contact_email: data.contact_email ?? "",
          contact_phone: data.contact_phone ?? "",
          footer_text: data.footer_text ?? "",
        });
      }
    });
  }, []);

  const save = async () => {
    setLoading(true);
    const payload = {
      site_name: s.site_name, logo: s.logo, favicon: s.favicon, description: s.description,
      social_links: s.social_links, contact_email: s.contact_email, contact_phone: s.contact_phone,
      footer_text: s.footer_text,
    };
    const res = s.id
      ? await supabase.from("site_settings").update(payload).eq("id", s.id)
      : await supabase.from("site_settings").insert(payload);
    setLoading(false);
    if (res.error) toast.error(res.error.message);
    else toast.success("Configurações salvas");
  };

  const field = (label: string, key: keyof Settings, type = "text") => (
    <div>
      <Label>{label}</Label>
      <Input
        type={type}
        value={(s as any)[key]}
        onChange={(e) => setS({ ...s, [key]: e.target.value })}
        className="bg-zinc-800 border-zinc-700"
      />
    </div>
  );

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Configurações do site</h1>
        <Button onClick={save} disabled={loading} className="bg-blue-600 hover:bg-blue-500">
          {loading ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
        <CardContent className="p-6 space-y-4">
          {field("Nome do projeto", "site_name")}
          {field("Logo (URL)", "logo")}
          {field("Favicon (URL)", "favicon")}
          <div>
            <Label>Descrição</Label>
            <Textarea value={s.description} onChange={(e) => setS({ ...s, description: e.target.value })} className="bg-zinc-800 border-zinc-700" />
          </div>
          {field("E-mail de contato", "contact_email", "email")}
          {field("Telefone", "contact_phone")}
          <div>
            <Label>Rodapé</Label>
            <Textarea value={s.footer_text} onChange={(e) => setS({ ...s, footer_text: e.target.value })} className="bg-zinc-800 border-zinc-700" />
          </div>

          <div>
            <Label className="text-base">Redes sociais</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              {(["instagram", "facebook", "twitter", "youtube"] as const).map((k) => (
                <div key={k}>
                  <Label className="capitalize text-sm">{k}</Label>
                  <Input
                    value={s.social_links[k] ?? ""}
                    onChange={(e) => setS({ ...s, social_links: { ...s.social_links, [k]: e.target.value } })}
                    placeholder="https://..."
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
