-- =============================================================================
-- Produtos de exemplo (ValorRural)
--
-- Cria 22 produtos da época (novembro) na quinta de UM agricultor, para ver o
-- catálogo, as páginas de categoria e os cartões de produto com dados.
--
-- Como usar:
--   1. No Supabase: SQL Editor > New query > colar este ficheiro.
--   2. Substituir COLOCA_AQUI_O_TEU_EMAIL pelo email da conta de agricultor.
--   3. Run. Se o email não tiver ficha de agricultor, nada é criado.
--
-- Para apagar tudo: supabase/exemplos/remover-produtos-exemplo.sql
--
-- Notas:
-- - Todos os ids começam por 00000000-e5e0-4000-8000-, para a remoção apagar
--   só estes produtos e nunca os reais.
-- - O preço ao cliente segue a fórmula do NewProduct: preço do agricultor
--   x (1 + 10% de comissão) x (1 + IVA), arredondado ao cêntimo.
-- - O stock inicial cria o lote automaticamente (trg_initial_stock_batch), com
--   validade em availability_end; o histórico regista "Produto criado".
-- - As notificações "novo produto" a quem tem a quinta nos favoritos ficam
--   desligadas durante a inserção, para não enviar 22 notificações falsas.
-- - Sem fotografias: o site mostra a imagem da categoria.
-- - Os produtos são reais para o site: podem ser encomendados. Apagar antes de
--   abrir a plataforma a clientes.
-- =============================================================================

BEGIN;

ALTER TABLE public.products DISABLE TRIGGER trg_notify_favorites_product_insert;

DO $$
DECLARE
  v_farmer uuid;
BEGIN
  SELECT fd.id INTO v_farmer
    FROM public.farmer_details fd
    JOIN auth.users u ON u.id = fd.user_id
   WHERE lower(u.email) = lower('COLOCA_AQUI_O_TEU_EMAIL');

  IF v_farmer IS NULL THEN
    RAISE EXCEPTION 'Não há ficha de agricultor para este email. Confirma o email na linha "WHERE lower(u.email)".';
  END IF;

  IF EXISTS (SELECT 1 FROM public.products WHERE id::text LIKE '00000000-e5e0-4000-8000-%') THEN
    RAISE EXCEPTION 'Os produtos de exemplo já existem. Corre primeiro remover-produtos-exemplo.sql.';
  END IF;

  INSERT INTO public.products (
    id, farmer_id, name, description, category, unit,
    farmer_price, client_price, vat_rate, discount_percent,
    stock_quantity, low_stock_threshold,
    is_organic, is_lactose_free,
    delivery_mode, shipping_days,
    availability_start, availability_end,
    media_urls, active
  )
  SELECT
    p.id::uuid, v_farmer, p.name, p.description, p.category, p.unit,
    p.farmer_price,
    round(p.farmer_price * 1.10 * (1 + p.vat_rate / 100.0), 2),
    p.vat_rate, p.discount_percent,
    p.stock, p.low_stock,
    p.organic, p.lactose_free,
    p.delivery_mode::public.delivery_mode, p.shipping_days,
    current_date, current_date + p.days_available,
    '{}', true
  FROM (VALUES
    -- id, nome, descrição, categoria, unidade, preço agricultor, IVA, desconto %, stock, stock baixo, bio, sem lactose, entrega, dias de envio, dias disponível
    ('00000000-e5e0-4000-8000-000000000001', 'Laranja do Algarve', 'Laranja de mesa, doce e sumarenta, apanhada na véspera.', 'Fruta', '1 Kg', 1.30, 6, 0, 120, 10, true, false, 'both', 2, 45),
    ('00000000-e5e0-4000-8000-000000000002', 'Tangerina', 'Fácil de descascar, ótima para lanches.', 'Fruta', '1 Kg', 1.50, 6, 0, 80, 10, false, false, 'pickup', NULL, 30),
    ('00000000-e5e0-4000-8000-000000000003', 'Dióspiro', 'Bem maduro, para comer à colher.', 'Fruta', '1 Kg', 1.90, 6, 0, 4, 5, false, false, 'pickup', NULL, 14),
    ('00000000-e5e0-4000-8000-000000000004', 'Couve-galega', 'Folhas tenras para caldo verde.', 'Hortícolas', '500 g', 1.00, 6, 0, 40, 5, true, false, 'pickup', NULL, 10),
    ('00000000-e5e0-4000-8000-000000000005', 'Abóbora-menina', 'Polpa laranja e doce, para sopa ou doce.', 'Hortícolas', '1 Kg', 0.85, 6, 15, 60, 8, false, false, 'both', 3, 40),
    ('00000000-e5e0-4000-8000-000000000006', 'Batata-doce', 'Batata-doce de areia, assada fica caramelizada.', 'Hortícolas', '1 Kg', 1.60, 6, 0, 90, 10, true, false, 'both', 2, 60),
    ('00000000-e5e0-4000-8000-000000000007', 'Castanha', 'Castanha da época, calibre grande.', 'Frutos Secos', '1 Kg', 4.10, 6, 0, 35, 5, false, false, 'both', 3, 30),
    ('00000000-e5e0-4000-8000-000000000008', 'Noz', 'Noz seca ao sol, com casca.', 'Frutos Secos', '500 g', 3.80, 6, 0, 25, 5, false, false, 'shipping', 4, 90),
    ('00000000-e5e0-4000-8000-000000000009', 'Mel de urze', 'Mel escuro e intenso, de apiário em altitude.', 'Mel', '500 g', 5.90, 6, 0, 18, 4, false, false, 'shipping', 3, 180),
    ('00000000-e5e0-4000-8000-000000000010', 'Azeite virgem extra', 'Colheita deste ano, prensado a frio.', 'Gorduras', '750 mL', 8.90, 6, 0, 30, 5, false, false, 'both', 3, 180),
    ('00000000-e5e0-4000-8000-000000000011', 'Queijo de ovelha curado', 'Curado 60 dias, pasta firme.', 'Laticínios', '500 g', 8.10, 6, 0, 12, 3, false, false, 'pickup', NULL, 30),
    ('00000000-e5e0-4000-8000-000000000012', 'Iogurte natural sem lactose', 'Feito com leite da quinta.', 'Laticínios', '500 g', 2.10, 6, 0, 20, 5, false, true, 'pickup', NULL, 7),
    ('00000000-e5e0-4000-8000-000000000013', 'Pão de centeio', 'Massa-mãe, cozido em forno a lenha.', 'Pão artesanal', '1 Kg', 2.90, 6, 0, 10, 3, false, false, 'pickup', NULL, 3),
    ('00000000-e5e0-4000-8000-000000000014', 'Chouriço caseiro', 'Fumado em lareira, receita da família.', 'Charcutaria', '250 g', 4.40, 6, 0, 15, 4, false, false, 'both', 3, 60),
    ('00000000-e5e0-4000-8000-000000000015', 'Grão-de-bico', 'Grão seco, coze depressa.', 'Leguminosas', '1 Kg', 2.80, 6, 0, 40, 5, true, false, 'shipping', 4, 180),
    ('00000000-e5e0-4000-8000-000000000016', 'Feijão-frade', 'Para saladas e cozidos.', 'Leguminosas', '500 g', 2.20, 6, 0, 30, 5, false, false, 'both', 4, 180),
    ('00000000-e5e0-4000-8000-000000000017', 'Cogumelos shiitake', 'Cultivados em tronco de carvalho.', 'Cogumelos', '250 g', 3.50, 6, 0, 3, 4, true, false, 'pickup', NULL, 7),
    ('00000000-e5e0-4000-8000-000000000018', 'Alecrim fresco', 'Molho cortado no dia.', 'Ervas aromáticas', '50 g', 1.10, 6, 0, 25, 5, true, false, 'pickup', NULL, 10),
    ('00000000-e5e0-4000-8000-000000000019', 'Salicórnia', 'Planta das salinas, sabor a mar.', 'Halófitas', '200 g', 2.50, 6, 0, 14, 4, false, false, 'pickup', NULL, 10),
    ('00000000-e5e0-4000-8000-000000000020', 'Vinho tinto do Douro', 'Tinto jovem, colheita 2025.', 'Bebidas', '750 mL', 6.80, 23, 0, 48, 6, false, false, 'shipping', 3, 365),
    ('00000000-e5e0-4000-8000-000000000021', 'Doce de abóbora com noz', 'Feito em tacho de cobre.', 'Conservas', '250 g', 3.30, 6, 10, 22, 4, false, false, 'both', 3, 365),
    ('00000000-e5e0-4000-8000-000000000022', 'Farinha de milho', 'Moída em moinho de pedra.', 'Cereais', '1 Kg', 2.00, 6, 0, 26, 5, true, false, 'both', 4, 180)
  ) AS p(id, name, description, category, unit, farmer_price, vat_rate, discount_percent, stock, low_stock, organic, lactose_free, delivery_mode, shipping_days, days_available);

  RAISE NOTICE 'Criados 22 produtos de exemplo para o agricultor %.', v_farmer;
END $$;

ALTER TABLE public.products ENABLE TRIGGER trg_notify_favorites_product_insert;

COMMIT;
