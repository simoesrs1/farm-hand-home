// Eliminar a conta do próprio utilizador (cliente ou agricultor).
//
// A conta não é apagada, porque as encomendas e a faturação têm de ser
// conservadas 10 anos: os dados pessoais são anonimizados (anonymize_account),
// a fotografia de perfil é apagada, e a conta antiga fica bloqueada com um
// email interno e sem ligações de início de sessão (email e Google). Assim o
// mesmo email pode criar uma conta nova do zero. Ver docs/eliminar-conta.md.
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

// Bloqueio "para sempre" (100 anos).
const BAN_FOREVER = "876000h";

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

    // Confirmação: o utilizador escreve o próprio email.
    const body = await req.json().catch(() => null);
    const typed = typeof body?.confirm_email === "string" ? body.confirm_email.trim().toLowerCase() : "";
    if (!user.email || typed !== user.email.toLowerCase()) {
      return json(400, { error: "O email escrito não corresponde ao da conta." });
    }

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // 1) Dados: verifica o que está pendente e anonimiza (falha sem alterar nada).
    const { error: anonErr } = await admin.rpc("anonymize_account", { p_user: user.id, p_email: user.email });
    if (anonErr) {
      const pending = anonErr.message.includes("por concluir");
      return json(pending ? 409 : 500, {
        error: pending ? "Ainda tem encomendas, reservas ou subscrições por concluir." : "Erro interno. Tenta novamente.",
      });
    }

    // 2) Fotografia de perfil (bucket público avatars, pasta <user_id>/).
    const { data: files } = await admin.storage.from("avatars").list(user.id);
    if (files && files.length > 0) {
      await admin.storage.from("avatars").remove(files.map((f) => `${user.id}/${f.name}`));
    }

    // 3) Conta antiga: email interno, sem metadados, bloqueada.
    const { error: updErr } = await admin.auth.admin.updateUserById(user.id, {
      email: `eliminada-${user.id}@deleted.invalid`,
      email_confirm: true,
      user_metadata: {},
      ban_duration: BAN_FOREVER,
    });
    if (updErr) {
      console.error("delete-account: updateUserById", updErr);
      return json(500, { error: "Erro interno. Tenta novamente." });
    }

    // 4) Sem ligações de início de sessão: o email e a conta Google ficam livres.
    const { error: idErr } = await admin.rpc("delete_auth_identities", { p_user: user.id });
    if (idErr) console.error("delete-account: delete_auth_identities", idErr);

    // 5) Termina as sessões abertas noutros dispositivos.
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    await admin.auth.admin.signOut(jwt, "global").catch((e) => console.error("delete-account: signOut", e));

    return json(200, { ok: true });
  } catch (e) {
    console.error("delete-account error", e);
    return json(500, { error: "Erro interno. Tenta novamente." });
  }
});
