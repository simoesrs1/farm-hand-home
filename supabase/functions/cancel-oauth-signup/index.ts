// "Entrar com a Google" sem conta registada.
//
// O Supabase não distingue entrar de registar com a Google: se a conta Google
// não estiver associada a nenhuma conta, cria uma nova. No separador "Entrar"
// isso não deve acontecer. No regresso, se o perfil nunca passou pelo
// "Registar" (profile_type_claimed = false), o site chama esta função:
//
//  - { registered: true }: a conta conta como registada (conta de teste ou com
//    dados de agricultor) e o utilizador entra normalmente;
//  - { registered: false, deleted: true }: conta vazia, apagada;
//  - { registered: false, deleted: false }: conta com encomendas ou
//    subscrições, que não se apaga; o utilizador tem de usar o "Registar".
//
// Nos dois últimos casos o site termina a sessão e mostra "conta não
// encontrada". Aplica-se a todas as contas, qualquer que seja a data de criação.
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

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // 1) Registada: passou pelo "Registar", é de teste ou tem dados de agricultor.
    const [{ data: profile }, { data: farmer }] = await Promise.all([
      admin.from("profiles").select("profile_type_claimed, is_test_account").eq("id", user.id).maybeSingle(),
      admin.from("farmer_details").select("id").eq("user_id", user.id).maybeSingle(),
    ]);
    if (!profile || profile.profile_type_claimed || profile.is_test_account || farmer) {
      return json(200, { registered: true, deleted: false });
    }

    // 2) Só se apaga uma conta vazia: só com a Google, sem encomendas nem subscrições.
    const identities = user.identities ?? [];
    const onlyOAuth = identities.length > 0 && identities.every((i) => i.provider !== "email");
    const [{ count: orders }, { count: subs }] = await Promise.all([
      admin.from("orders").select("id", { count: "exact", head: true }).eq("client_id", user.id),
      admin.from("subscriptions").select("id", { count: "exact", head: true }).eq("client_id", user.id),
    ]);
    if (!onlyOAuth || (orders ?? 0) > 0 || (subs ?? 0) > 0) {
      return json(200, { registered: false, deleted: false });
    }

    // 3) Apaga a conta (o perfil e o resto vão em cascata).
    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) {
      console.error("cancel-oauth-signup: deleteUser", delErr);
      return json(200, { registered: false, deleted: false });
    }

    return json(200, { registered: false, deleted: true });
  } catch (e) {
    console.error("cancel-oauth-signup error", e);
    return json(500, { error: "Erro interno. Tenta novamente." });
  }
});
