-- Avaliações de teste para a "Quinta dos Testes, S.A.".
--
-- Correr à mão no Supabase → SQL Editor (não é uma migração).
-- Cada avaliação precisa de uma encomenda, por isso o script cria 6 encomendas
-- de teste, com códigos começados por TST, da conta de cliente de teste abaixo.
-- Para apagar tudo: scripts/apagar-teste-avaliacoes.sql.

DO $$
DECLARE
  -- Conta de cliente de teste a quem pertencem as encomendas.
  v_client_email constant text := 'rubensimoes2001.rse@gmail.com';
  v_farmer uuid;
  v_client uuid;
  v_found integer;
  v_order uuid;
  v_created timestamptz;
  r record;
BEGIN
  SELECT count(*) INTO v_found
    FROM public.farmer_details WHERE lower(btrim(company_name)) LIKE 'quinta dos testes%';
  IF v_found <> 1 THEN
    RAISE EXCEPTION 'Esperava 1 exploração "Quinta dos testes" e encontrei %.', v_found;
  END IF;
  SELECT id INTO v_farmer
    FROM public.farmer_details WHERE lower(btrim(company_name)) LIKE 'quinta dos testes%';

  SELECT u.id INTO v_client
    FROM auth.users u JOIN public.profiles p ON p.id = u.id
   WHERE lower(u.email) = lower(v_client_email);
  IF v_client IS NULL THEN
    RAISE EXCEPTION 'Não encontrei a conta % (ou não tem perfil).', v_client_email;
  END IF;

  IF EXISTS (SELECT 1 FROM public.orders WHERE farmer_id = v_farmer AND pickup_code LIKE 'TST%') THEN
    RAISE EXCEPTION 'Já existem encomendas de teste. Corre primeiro scripts/apagar-teste-avaliacoes.sql.';
  END IF;

  FOR r IN
    SELECT * FROM (VALUES
      (1, 5, 'Legumes fresquíssimos e muito bem embalados. O agricultor foi super simpático no levantamento. Voltarei de certeza!', 'Ana S.', 'delivered', 2, 18.50),
      (2, 4, 'Boa qualidade e preço justo. Só faltou um pouco mais de variedade na fruta.', 'João M.', 'delivered', 5, 12.00),
      (3, 5, 'Os ovos e o queijo são excelentes, nota-se a diferença para o supermercado.', 'Marta R.', 'delivered', 9, 24.30),
      (4, 3, 'A encomenda chegou com um dia de atraso, mas os produtos estavam em bom estado e o agricultor pediu desculpa pelo chat.', 'Pedro A.', 'late', 14, 15.75),
      (5, 4, NULL, 'Inês C.', 'delivered', 21, 9.90),
      (6, 3, 'O agricultor cancelou por falta de stock, mas avisou logo e o reembolso foi imediato. Fico à espera de nova oportunidade para provar os produtos, porque as fotografias da quinta são muito convidativas e as avaliações de outros clientes são boas.', 'Rui F.', 'cancelled', 30, 31.20)
    ) AS t(n, rating, comment, reviewer_name, context, days_ago, total)
  LOOP
    v_created := now() - make_interval(days => r.days_ago);

    INSERT INTO public.orders (
      client_id, farmer_id, total, commission_amount, farmer_amount, status,
      pickup_code, pickup_deadline, paid_at, accepted_at, delivered_at, expired_at, created_at
    )
    VALUES (
      v_client, v_farmer, r.total,
      round(r.total * 0.1, 2), r.total - round(r.total * 0.1, 2),
      CASE WHEN r.context = 'cancelled' THEN 'refunded' ELSE 'delivered' END::public.order_status,
      'TSTREV' || chr(64 + r.n) || 'A',
      v_created + interval '7 days',
      v_created,
      CASE WHEN r.context = 'cancelled' THEN NULL ELSE v_created + interval '2 hours' END,
      CASE WHEN r.context = 'cancelled' THEN NULL
           WHEN r.context = 'late' THEN v_created + interval '3 days'
           ELSE v_created + interval '1 day' END,
      CASE WHEN r.context = 'cancelled' THEN v_created + interval '3 hours' END,
      v_created
    )
    RETURNING id INTO v_order;

    INSERT INTO public.order_items (order_id, product_name, quantity, unit, unit_price, subtotal)
    VALUES (v_order, 'Cabaz de teste', 1, 'un', r.total, r.total);

    INSERT INTO public.farmer_reviews (
      order_id, farmer_id, client_id, rating, comment, reviewer_name, context, created_at
    )
    VALUES (
      v_order, v_farmer, v_client, r.rating, r.comment, r.reviewer_name, r.context,
      CASE WHEN r.context = 'cancelled' THEN v_created + interval '4 hours'
           WHEN r.context = 'late' THEN v_created + interval '3 days 2 hours'
           ELSE v_created + interval '1 day 3 hours' END
    );
  END LOOP;

  RAISE NOTICE 'Criadas 6 encomendas e 6 avaliações de teste para a Quinta dos testes.';
END;
$$;
