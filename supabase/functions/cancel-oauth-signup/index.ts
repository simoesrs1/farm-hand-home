// Desfaz uma conta criada sem querer no "Entrar com a Google".
//
// O Supabase não distingue entrar de registar com a Google: se a conta Google
// não estiver associada a nenhuma conta, cria uma nova. No separador "Entrar"
// isso não deve acontecer, por isso, no regresso, o site chama esta função e a
// conta acabada de criar é apagada (o utilizador vê "conta não encontrada").
//
// Só apaga se a conta for de facto nova e vazia: criada há menos de 10 minutos,
// só com a ligação da Google, sem tipo de perfil escolhido no registo e sem
// encomendas nem subscrições. Caso contrário devolve { deleted: false } e o
// utilizador continua com a sessão normal.
import { createClient } from "npm:@supabase/supabase-js@2.110.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const NEW_ACCOUNT_WINDOW_MS = 10 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Não autenticado" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json(401, { error: "Sessão inválida" });
    const user = userData.user;

    // 1) Conta acabada de criar, só com a Google.
    const createdAt = Date.parse(user.created_at);
    const isNew = Number.isFinite(createdAt) && Date.now() - createdAt <= NEW_ACCOUNT_WINDOW_MS;
    const identities = user.identities ?? [];
    const onlyOAuth = identities.length > 0 && identities.every((i) => i.provider !== "email");
    if (!isNew || !onlyOAuth) return json(200, { deleted: false });

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // 2) Sem tipo de perfil escolhido (não veio do "Registar").
    const { data: profile } = await admin
      .from("profiles")
      .select("profile_type_claimed")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile || profile.profile_type_claimed) return json(200, { deleted: false });

    // 3) Sem encomendas nem subscrições.
    const [{ count: orders }, { count: subs }] = await Promise.all([
      admin.from("orders").select("id", { count: "exact", head: true }).eq("client_id", user.id),
      admin.from("subscriptions").select("id", { count: "exact", head: true }).eq("client_id", user.id),
    ]);
    if ((orders ?? 0) > 0 || (subs ?? 0) > 0) return json(200, { deleted: false });

    // 4) Apaga a conta (o perfil e o resto vão em cascata).
    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) {
      console.error("cancel-oauth-signup: deleteUser", delErr);
      return json(500, { error: "Erro interno. Tenta novamente." });
    }

    return json(200, { deleted: true });
  } catch (e) {
    console.error("cancel-oauth-signup error", e);
    return json(500, { error: "Erro interno. Tenta novamente." });
  }
});
