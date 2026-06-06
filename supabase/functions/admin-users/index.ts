import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

type Action =
  | { type: "list" }
  | { type: "create"; email: string; password: string; display_name?: string; role: string }
  | { type: "update"; user_id: string; display_name?: string; phone?: string; active?: boolean }
  | { type: "set_password"; user_id: string; password: string }
  | { type: "set_roles"; user_id: string; roles: string[] }
  | { type: "block"; user_id: string; until: string | null }
  | { type: "delete"; user_id: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(SUPABASE_URL, SERVICE);

    const { data: { user }, error: uErr } = await userClient.auth.getUser();
    if (uErr || !user) return json({ error: "Unauthorized" }, 401);

    const { data: isMaster } = await admin.rpc("has_role", { _user_id: user.id, _role: "master" });
    if (!isMaster) return json({ error: "Forbidden — master only" }, 403);

    const body = (await req.json()) as Action;

    switch (body.type) {
      case "list": {
        const { data: users, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
        if (error) throw error;
        const ids = users.users.map((u) => u.id);
        const [{ data: profiles }, { data: roles }] = await Promise.all([
          admin.from("profiles").select("*").in("id", ids),
          admin.from("user_roles").select("user_id, role").in("user_id", ids),
        ]);
        const out = users.users.map((u) => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          profile: profiles?.find((p: any) => p.id === u.id) ?? null,
          roles: (roles ?? []).filter((r: any) => r.user_id === u.id).map((r: any) => r.role),
        }));
        return json({ users: out });
      }
      case "create": {
        const { data, error } = await admin.auth.admin.createUser({
          email: body.email,
          password: body.password,
          email_confirm: true,
          user_metadata: { display_name: body.display_name ?? body.email },
        });
        if (error) throw error;
        const uid = data.user!.id;
        await admin.from("user_roles").delete().eq("user_id", uid);
        await admin.from("user_roles").insert({ user_id: uid, role: body.role as any });
        await admin.from("profiles").update({ must_change_password: true }).eq("id", uid);
        return json({ ok: true, user_id: uid });
      }
      case "update": {
        const patch: any = {};
        if (body.display_name !== undefined) patch.display_name = body.display_name;
        if (body.phone !== undefined) patch.phone = body.phone;
        if (body.active !== undefined) patch.active = body.active;
        const { error } = await admin.from("profiles").update(patch).eq("id", body.user_id);
        if (error) throw error;
        return json({ ok: true });
      }
      case "set_password": {
        const { error } = await admin.auth.admin.updateUserById(body.user_id, { password: body.password });
        if (error) throw error;
        await admin.from("profiles").update({ must_change_password: true }).eq("id", body.user_id);
        return json({ ok: true });
      }
      case "set_roles": {
        await admin.from("user_roles").delete().eq("user_id", body.user_id);
        if (body.roles.length) {
          const rows = body.roles.map((r) => ({ user_id: body.user_id, role: r as any }));
          const { error } = await admin.from("user_roles").insert(rows);
          if (error) throw error;
        }
        return json({ ok: true });
      }
      case "block": {
        await admin.from("profiles").update({
          blocked_until: body.until,
          active: body.until ? false : true,
        }).eq("id", body.user_id);
        // Optional: also ban via auth admin
        await admin.auth.admin.updateUserById(body.user_id, {
          ban_duration: body.until ? "876000h" : "none",
        } as any);
        return json({ ok: true });
      }
      case "delete": {
        const { error } = await admin.auth.admin.deleteUser(body.user_id);
        if (error) throw error;
        return json({ ok: true });
      }
      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (e: any) {
    console.error(e);
    return json({ error: e?.message ?? String(e) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
