-- Apaga as encomendas de teste da "Quinta dos Testes, S.A." e, com elas
-- (ON DELETE CASCADE), as avaliações, os artigos e as notificações.
--   * códigos TST...: criadas por scripts/teste-avaliacoes-quinta-dos-testes.sql;
--   * ids abaixo: criadas a 2026-11-09 pelo percurso normal da aplicação
--     (encomenda → aceitar → validar QR → avaliar), com as contas de teste.
-- O stock gasto por essas encomendas (6 un. do produto "teste") não é reposto.
--
-- Correr à mão no Supabase → SQL Editor.

DELETE FROM public.orders o
 USING public.farmer_details fd
 WHERE o.farmer_id = fd.id
   AND lower(btrim(fd.company_name)) LIKE 'quinta dos testes%'
   AND (
     o.pickup_code LIKE 'TST%'
     OR o.id IN (
       '7d6b1405-156e-4acf-aea8-458e7f3b2960',
       '6eb50e9c-0a2b-45af-b016-d702945528da',
       'faedc14a-60a3-4aa2-b742-5f196947b7a3',
       '59ceec11-e2a9-4962-907d-c320bbcf4f38',
       'c003c499-3be5-4781-ae52-36c70f57e502',
       'e5b7b842-f413-49d1-bc0b-eb6459508b93'
     )
   );
