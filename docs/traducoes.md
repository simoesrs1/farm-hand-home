# Idiomas e traduções

O site está disponível em português, inglês, alemão, espanhol e francês. O português é a origem de todos os textos.

## 1. Texto da interface (botões, menus, páginas)

- Biblioteca `react-i18next`; configuração em `src/i18n/` (os ficheiros de `src/locales/*/*.json` carregam-se sozinhos).
- Áreas (namespaces): `common`, `home`, `catalog`, `cart`, `orders`, `account`, `farmer`, `offerings`, `legal`, `server`.
- Área nova: criar `src/locales/<idioma>/<área>.json` nos cinco idiomas e acrescentar o import português a `ptResources` em `src/i18n/index.ts` (é daí que vêm os tipos das chaves).
- O teste `src/test/locales.test.ts` falha se faltar uma chave, se houver um texto vazio ou se as variáveis (`{{nome}}`) forem diferentes entre idiomas.
- Plurais: chaves `_one` e `_other` (e `_zero` quando faz sentido), usadas com `t("chave", { count })`.
- O idioma escolhido fica em `localStorage` (`valorrural_lang`) e, com sessão iniciada, em `profiles.preferred_language`. Na primeira sessão, o idioma em uso é guardado no perfil.
- Textos que vivem em `src/lib` (dias da semana, categorias, formas de entrega, níveis de atividade, validações) usam `i18n.t`.
- Categorias: a base de dados guarda o nome português; mostra-se com `categoryLabel()` (`src/data/categories.ts`). Certificados: `certificateLabel()` (`src/lib/certificates.ts`).
- Datas, horas, preços e números: `@/lib/format` (`formatDate`, `formatDateTime`, `formatTime`, `formatEuro`, `formatNumber`).
- O Google Maps carrega no idioma do site (parâmetro `language`). Como o script só carrega uma vez, mudar de idioma depois de abrir um mapa só tem efeito ao recarregar a página.

## 2. Texto escrito por pessoas (tradução automática)

Descrições, títulos, notas, avaliações, notificações, mensagens do chat e nomes nas linhas das encomendas são traduzidos pela IA (Anthropic, modelo `claude-haiku-5-5`) quando alguém os vê noutro idioma.

| Tipo | Tabela | Campos | Quem pode pedir |
|---|---|---|---|
| `product` | `products` | name, description | todos (só produtos ativos) |
| `experience` | `farm_experiences` | title, description | todos (só ativas) |
| `stay` | `farm_stays` | title, description | todos (só ativos) |
| `farm` | `public_farmer_profiles` | description, pickup_hours_note, delivery_note, pause_note | todos |
| `review` | `farmer_reviews` | comment | todos (exceto avaliações removidas) |
| `notification` | `notifications` | title, message | o destinatário |
| `chat` | `order_chat_messages` | content | o cliente e o agricultor da encomenda |
| `order_item` | `order_items` | product_name | o cliente e o agricultor da encomenda |

Como funciona:

1. O componente `TranslatedText` (com o hook `useTranslatedContent`) mostra logo o original e pede a tradução.
2. `src/lib/content-translation.ts` junta os pedidos (até 50 por chamada) e chama a Edge Function `translate-content`.
3. O browser só envia referências (`tipo`, `id`, `campo`). A função lê o texto na base de dados e verifica se quem pede o pode ver.
4. As traduções ficam em `content_translations`, com o hash do texto original. Se o texto mudar, volta a ser traduzido. Esta tabela só é acessível ao `service_role`.
5. Textos longos têm o botão "Ver original" / "Ver tradução".

Notas:

- As notificações são geradas em português: em português não se pede tradução.
- O resto pode ter sido escrito noutra língua (um agricultor estrangeiro, por exemplo), por isso também se traduz para português. Se o texto já estiver em português, a IA devolve-o igual, fica em cache e não aparece o botão "Ver original".
- No chat, só as mensagens da outra parte são traduzidas.
- Sem `ANTHROPIC_API_KEY` nos segredos do Supabase, a função devolve apenas o que já estiver em cache, e o site mostra os originais.

## 3. Mensagens de erro do servidor

As Edge Functions e as funções SQL respondem em português. `src/lib/server-messages.ts` reconhece cada mensagem conhecida (incluindo partes variáveis, como números e nomes) e troca-a pela tradução de `src/locales/<idioma>/server.json`. Está ligado ao `toast` (`src/hooks/use-toast.ts`) e aos avisos do chat, por isso não é preciso chamar nada em cada página. Mensagens desconhecidas aparecem como vieram.

Mensagem nova no servidor: acrescentar a linha em `server-messages.ts` e a tradução nos cinco `server.json`.

## 4. Emails

- Lembretes ao agricultor (`farmer-activity`): o email segue `profiles.preferred_language`, com os textos de `supabase/functions/_shared/email-i18n.ts`. A notificação na app continua em português e é traduzida no ecrã.
- Emails do Supabase Auth (confirmação de conta, recuperação de palavra-passe): o registo envia `preferred_language` nos dados do utilizador. Os modelos de email são configurados no painel do Supabase (Authentication → Email Templates) e podem escolher o texto com `{{ if eq .Data.preferred_language "en" }}…{{ end }}`.

## 5. Textos legais

- Termos (`src/pages/Terms.tsx`) e Política de Privacidade (`src/pages/Privacy.tsx`) têm a versão portuguesa, que prevalece, e traduções de cortesia em `src/pages/legal/*.{en,de,es,fr}.tsx`, com a mesma estrutura e os mesmos `id` das secções (as âncoras, como `/termos#ordenacao`, funcionam em todos os idiomas).
- Nas traduções aparece o aviso "Tradução de cortesia. Em caso de divergência, prevalece a versão portuguesa." e um botão para ver o original.
- A secção de cookies (`CookieSection`) e o aviso de cookies (`CookieConsent`) usam os textos de `legal.json`.
- Ao alterar um texto legal em português, atualizar as quatro traduções. Convém uma revisão jurídica das traduções antes de publicar.

## Ativar

1. Definir `ANTHROPIC_API_KEY` nos segredos das Edge Functions do Supabase (a mesma chave das descrições com IA; ver `docs/ia-descricoes.md`).
2. Fazer push para `main`: o workflow aplica as migrações `20261120120000_preferred_language.sql` e `20261121120000_content_translations.sql` e publica as funções `translate-content` e `farmer-activity`.
