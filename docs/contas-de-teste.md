# Contas de teste

Uma conta de teste pode ser **cliente e agricultor ao mesmo tempo**, para testar a compra e a venda com a mesma conta:

- vende sem esperar pela verificação, porque fica marcada como verificada no SQL abaixo;
- compra a outras quintas mesmo estando registada como agricultor, em modo cliente; nunca compra à própria quinta;
- a quinta só aparece a contas de teste (e ao próprio dono). Os clientes normais não a veem no catálogo, no mapa, nos destaques, na página pública, nas experiências, no alojamento nem nas subscrições.

A marca é a coluna `profiles.is_test_account`, criada em `supabase/migrations/20261121170000_contas_de_teste.sql`. Não se pode mudar pelo browser.

## Marcar uma conta como de teste

No Supabase → SQL Editor, trocando `<email>` pelo email da conta:

```sql
-- Conta de teste, com perfil de agricultor (pode passar a modo cliente)
update public.profiles
   set is_test_account = true, profile_type = 'vendedor', profile_type_claimed = true
 where id = (select id from auth.users where email = '<email>');

-- Linha de agricultor, se ainda não existir
insert into public.farmer_details (user_id, registration_step)
select id, 1 from auth.users where email = '<email>'
on conflict (user_id) do nothing;

-- Vende sem verificação da equipa
update public.farmer_details set verification_status = 'verified'
 where user_id = (select id from auth.users where email = '<email>');
```

Depois, com essa conta, complete o registo da exploração em `/onboarding/agricultor`. A quinta fica logo verificada e visível para as contas de teste.

## Desmarcar

```sql
update public.profiles set is_test_account = false
 where id = (select id from auth.users where email = '<email>');
```

A quinta passa a seguir as regras normais: fica visível para todos se estiver verificada e com o registo completo.
