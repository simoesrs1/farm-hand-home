-- Memória das traduções automáticas do conteúdo escrito por pessoas (produtos,
-- experiências, alojamento, descrição das quintas, avaliações, notificações e chat).
--
-- A Edge Function translate-content traduz com IA na primeira vez que um texto é
-- pedido num idioma e guarda aqui o resultado; depois responde a partir desta
-- tabela. source_hash é o hash do texto original: se o texto for editado, a
-- tradução guardada deixa de valer e é refeita. Só a Edge Function (service_role)
-- lê e escreve. Ver docs/traducoes.md.

CREATE TABLE public.content_translations (
  source_type text NOT NULL
    CHECK (source_type IN ('product', 'experience', 'stay', 'farm', 'review', 'notification', 'chat', 'order_item')),
  source_id uuid NOT NULL,
  field text NOT NULL,
  lang text NOT NULL CHECK (lang IN ('pt', 'en', 'de', 'es', 'fr')),
  source_hash text NOT NULL,
  translated text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source_type, source_id, field, lang)
);

ALTER TABLE public.content_translations ENABLE ROW LEVEL SECURITY;

-- Sem políticas para utilizadores: só a Edge Function, com service_role.
REVOKE ALL ON public.content_translations FROM anon, authenticated;
GRANT ALL ON public.content_translations TO service_role;
