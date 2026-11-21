# Eliminar conta

Qualquer utilizador (cliente ou agricultor) pode eliminar a conta em **Definições → Eliminar conta** (`src/components/DeleteAccountSection.tsx`). Depois pode criar uma conta nova com o mesmo email ou a mesma conta Google, começando do zero.

## Quando não deixa

A função `my_account_deletion_blockers()` lista o que impede a eliminação:

- encomendas ou reservas do próprio por concluir. As entregas de subscrição a mais de 48 horas não contam, porque são devolvidas;
- encomendas ou reservas de clientes da quinta por entregar;
- clientes com subscrição ativa na quinta, que o agricultor tem de cancelar primeiro em Subscrições.

## O que acontece

Tudo é feito pela Edge Function `delete-account`, depois de o utilizador escrever o email da conta:

1. `anonymize_account(user_id, email)` (`supabase/migrations/20261121180000_eliminar_conta.sql`):
   - cancela as subscrições do próprio como cliente e devolve as entregas futuras;
   - guarda no **arquivo interno** `deleted_accounts` o email e os dados oficiais do agricultor (nome da empresa, NIF, nº de exploração, CAE). Este arquivo só é acessível à `service_role` e serve a conservação legal;
   - na quinta: produtos, experiências, alojamento e planos ficam inativos, e a quinta deixa de aparecer (`verification_status = 'pending_review'`). Saem o NIF, o nº de exploração, o telefone, a morada, o site e a descrição; o nome da empresa fica, porque aparece no histórico das encomendas;
   - apaga o nome e a fotografia do perfil, os favoritos e as notificações;
   - anonimiza as avaliações escritas, que passam a ter o autor "Cliente" e não mostram foto.
2. Apaga a fotografia de perfil do armazenamento (`avatars/<user_id>/`).
3. Troca o email da conta antiga por `eliminada-<id>@deleted.invalid`, limpa os metadados e bloqueia-a.
4. Remove as ligações de início de sessão da conta antiga (`delete_auth_identities`), para o email e a conta Google ficarem livres.
5. Termina as sessões abertas.

**Conservado:** encomendas, reservas, faturação e mensagens do chat das encomendas, durante 10 anos (lei fiscal), ligadas à conta anónima.

## Voltar a entrar depois de eliminar

A conta antiga não volta a abrir: fica bloqueada, com um email interno e sem ligações de início de sessão.

- **Registar** (email ou Google): cria uma conta nova, vazia.
- **Entrar com email**: dá "Email ou palavra-passe incorretos. Se ainda não tem conta, use Registar." Por segurança, não se diz se o email existe.
- **Entrar com a Google**: o Supabase não distingue entrar de registar e cria sempre uma conta quando a conta Google não está associada a nenhuma. Para isso não acontecer no "Entrar":
  1. o botão guarda `farmconnect:oauth_login_intent` no `sessionStorage` antes de sair para a Google;
  2. no regresso, o `AuthContext` vê a marca e, se a conta foi criada há menos de 10 minutos, chama a Edge Function `cancel-oauth-signup`;
  3. a função só apaga a conta se for de facto nova e vazia: criada há menos de 10 minutos, só com a Google, sem tipo de perfil escolhido (`profile_type_claimed = false`) e sem encomendas nem subscrições;
  4. o site termina a sessão e abre `/auth?tab=signup&no_account=1`, com o aviso "Conta não encontrada".

Isto aplica-se a qualquer pessoa sem conta, e não só a contas eliminadas.

## Por confirmar

- Se o papel `postgres` pode apagar de `auth.identities` no projeto (passo 4). Se não puder, a eliminação funciona na mesma, mas o login com a Google com o mesmo email abriria a conta bloqueada; o erro fica nos registos da função.
- O prazo de conservação do arquivo, a validar com o contabilista.
