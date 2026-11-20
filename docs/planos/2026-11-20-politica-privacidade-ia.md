# Plano: rever a Política de Privacidade (dados recolhidos e uso de IA)

- **Data:** 2026-11-20
- **Pedido original:** "Cria politicas de privacidade, dizer os dados que são recolhidos, diz que utilizamos AI"
- **Profundidade da pesquisa:** normal
- **Respostas do Ruben:** rever e completar a política atual (não criar outra); secção de IA completa; sem avisos de IA na interface, só a política.

## 1. Contexto

Já existe uma Política de Privacidade em `/privacidade` (`src/pages/Privacy.tsx`, com traduções de cortesia em `src/pages/legal/privacy.{en,de,es,fr}.tsx`). A IA só aparece em dois pontos soltos da secção "Com quem partilhamos". A auditoria ao código encontrou dados recolhidos e serviços externos que a política não refere ou descreve mal (Stripe, Resend, Google Fonts, reservas, anexos do chat, etc.). O objetivo é uma política completa e fiel ao código, com uma secção própria sobre o uso de Inteligência Artificial, nos cinco idiomas.

## 2. Âmbito

**Inclui:**
- Nova secção "Utilização de Inteligência Artificial" (funcionalidades, fornecedor, dados enviados, base legal, conservação, treino, transferências, ausência de decisões automatizadas, AI Act).
- Completar "Que dados recolhemos", "Para que usamos", "Com quem partilhamos", "Transferências", "Durante quanto tempo" e a tabela de cookies, conforme o que o código faz hoje.
- Atualizar `LEGAL.lastUpdated` e as quatro traduções.
- Pequenas correções no código que tornem a política verdadeira (ver Fase 3), cada uma a aprovar à parte.

**Fica de fora:**
- Avisos de IA na interface (decisão do Ruben; ver riscos).
- Funcionalidade de apagar conta e limpeza automática de dados antigos (só se regista como questão em aberto).
- Revisão jurídica (recomendada, mas fora do código).

## 3. Conclusões da pesquisa

### No código
- Estrutura a reutilizar: `LegalLayout` + `LegalDoc` (`src/components/LegalLayout.tsx`), `CookieSection` (`src/components/CookieSection.tsx`, textos em `src/locales/*/legal.json`), `LEGAL` (`src/lib/legal.ts`). Os `id` das secções são iguais em todos os idiomas.
- **IA — descrições** (`supabase/functions/generate-product-description/index.ts`, modelo `claude-haiku-5-5`): envia o texto do agricultor, campos do formulário, **o nome da quinta** e até 3 fotografias (novas ou já guardadas no bucket `product-media`). Cada utilização fica em `ai_copy_usage` (sem prazo de apagamento). Limite diário por agricultor.
- **IA — traduções** (`supabase/functions/translate-content/index.ts`): só texto. Inclui descrições, títulos e notas das quintas (levantamento, entrega, pausa), avaliações, notificações, mensagens do chat e nomes nas linhas das encomendas. Resultados guardados em `content_translations` (sem prazo de apagamento; não são apagados quando o chat é apagado).
- **Stripe** (`supabase/functions/stripe-connect/index.ts:121-135`): recebe nome da empresa/email, país e id do agricultor; a Stripe recolhe identidade e IBAN diretamente. O pagamento dos clientes ainda é simulado (`create-order/index.ts:2`).
- **Resend** (`supabase/functions/_shared/email.ts`, `farmer-activity/index.ts`): email do agricultor e texto dos lembretes.
- **Google Fonts** (`index.html:7-11`): carregadas sem consentimento → IP enviado à Google.
- **Dados não referidos na política:** reservas (pessoas, datas, noites, quartos, taxas de cancelamento e reembolsos); `preferred_language`; avatares num bucket **público** (`avatars`); anexos do chat e provas de denúncias (bucket `order-attachments`); queixas de entrega (`delivery_complaints`) e pedidos de eliminação de avaliações; pedidos de alteração de dados com documentos (`change-request-docs`); certificados; número de registo do alojamento (AL/TER); `actor_name` no histórico de stock (`product_history`); `stripe_account_id` e estado da conta de pagamentos.
- **Cookies/armazenamento em falta na tabela:** `farmconnect_fulfillment`, `farmconnect_delivery_route`, `valorrural:animacoes-pausadas`, cópias `*::prev` (`src/lib/consent.ts:157-171`); `fc_consent`/`fc_sid` podem cair para sessionStorage.
- **Geolocalização:** usada também na ordenação por distância (`FarmListings.tsx:137`, `CategoryPage.tsx:127`), sempre só no navegador.
- **Imprecisões:** "login com Google recebe nome, email e fotografia" — o trigger só copia o nome (`20260824120000_google_oauth_profile_type.sql:33`).
- **Conservação real:** `delete_old_order_chats()` (apaga chat 5 dias após a entrega) existe mas **nunca é executado** (sem cron). Outras tarefas: `expire-orders` e `expire-stock-batches` (de hora a hora), `farmer-activity` (diária). Pontuação de atividade usa os últimos 30 dias.
- **Efeitos automáticos:** pontuação de atividade (ordenação/destaques, sem ocultar perfis); pedido de alteração de dados bloqueia o perfil e oculta os produtos até revisão humana (`lock_farmer_on_change_request`); expiração automática de encomendas não levantadas (10% reembolsados). Nenhum é tomado por IA.

### Na documentação externa
- A Anthropic não treina modelos com dados da API: [Commercial Terms, secção B](https://www.anthropic.com/legal/commercial-terms).
- Dados da API apagados em 30 dias (exceções: violações da política de uso, obrigações legais): [Privacy Center](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-commercial-api-data).
- A Anthropic é subcontratante; DPA incluído nos termos; transferências por Cláusulas Contratuais-Tipo: [DPA](https://www.anthropic.com/legal/data-processing-addendum).
- Dados guardados nos EUA; inferência pode correr noutras geografias por omissão: [Data residency](https://platform.claude.com/docs/en/manage-claude/data-residency).
- Stripe é responsável pelo tratamento para KYC/antifraude; a plataforma deve remeter para a política da Stripe: [Stripe Connect](https://docs.stripe.com/connect/updating-service-agreements#disclosing-how-stripe-processes-connected-account-data), [Stripe Privacy](https://stripe.com/privacy).
- Resend: subcontratante, EUA, CCT + DPF: [Resend DPA](https://resend.com/legal/dpa).
- Base legal para traduzir conteúdo de terceiros: interesse legítimo (art. 6.º, 1, f) é a opção mais robusta, com teste de ponderação e acesso ao original: [EDPB Diretrizes 1/2024](https://www.edpb.europa.eu/our-work-tools/documents/public-consultations/2024/guidelines-12024-processing-personal-data-based_en); execução do contrato interpretada de forma estrita: [EDPB Diretrizes 2/2019](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-22019-processing-personal-data-under-article-61b_en).
- AI Act art. 50.º aplicável desde 2/8/2026; descrições revistas pelo agricultor e traduções de mensagens privadas ficam fora do art. 50.º(4): [FAQ Comissão](https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act), [Art. 50](https://artificialintelligenceact.eu/article/50/).
- CNPD: Av. D. Carlos I, 134, 1.º, 1200-651 Lisboa; geral@cnpd.pt: [cnpd.pt](https://www.cnpd.pt/).

### Por confirmar
- Se a Anthropic está certificada no EU-US Data Privacy Framework (verificar em dataprivacyframework.gov). Na política fala-se só de CCT, que está confirmado.
- Entidade contratante da API (Anthropic PBC ou Anthropic Ireland) — ver na consola/fatura da Anthropic.
- Se a tradução de **avaliações públicas** cai no art. 50.º(4) do AI Act (depende das diretrizes da Comissão de 20/7/2026) — validar com jurista; pode tornar necessário um selo "traduzido por IA" junto às avaliações.
- Base legal das traduções do chat (6.º 1 b ou f) — validar com jurista.

## 4. Opções e recomendação

| Opção | Descrição | Prós | Contras |
|---|---|---|---|
| A | Só acrescentar uma secção de IA | Rápido | A política continua incompleta (Stripe, Resend, reservas, cookies) |
| B | Secção de IA completa + atualizar o resto da política para refletir o código | Política fiel ao que existe; cumpre art. 13.º RGPD | Mais texto para manter em 5 idiomas |
| C | B + corrigir no código o que torna a política difícil de cumprir (Google Fonts, limpeza de chat) | A política pode prometer menos recolha | Mexe em código e infraestrutura |

**Recomendação:** Opção B, com duas pequenas correções de código da opção C apenas se o Ruben aprovar (Google Fonts locais e cron da limpeza do chat). Sem elas, a política descreve a realidade tal como está (fontes da Google e chats guardados até pedido de eliminação).

## 5. Passos de implementação

1. **Fase 1: texto em português (`src/pages/Privacy.tsx`)**
   - Nova secção `id: "ia"` "Utilização de Inteligência Artificial", depois de "partilha":
     - funcionalidades: (1) "Escrever com IA" (só a pedido do agricultor; proposta só substitui se aceite; dados enviados: texto, campos do formulário, nome da quinta, até 3 fotografias; recomendação de não incluir pessoas nas fotos; registo de utilização para o limite diário); (2) tradução automática (só texto, sem nome/contacto/morada do autor; original sempre disponível; chat só para as duas partes; traduções guardadas na nossa base de dados);
     - fornecedor: Anthropic, como subcontratante, com DPA; **não treina modelos** com estes dados; apaga em 30 dias (salvo violação da política de uso ou obrigação legal);
     - base legal: descrições — execução do contrato (art. 6.º, 1, b); traduções — interesse legítimo (art. 6.º, 1, f) em tornar a plataforma compreensível em vários idiomas, com direito de oposição;
     - transferência para os EUA (e possivelmente outros países) com Cláusulas Contratuais-Tipo;
     - **sem decisões automatizadas** (art. 22.º): a IA não decide encomendas, avaliações, pontuações nem acesso; o texto gerado é da responsabilidade de quem o publica;
     - transparência (AI Act): indicação de que os textos traduzidos são gerados por IA e podem ter erros.
   - "Que dados recolhemos": acrescentar idioma preferido, reservas, pagamentos/reembolsos e conta Stripe, anexos do chat e provas, queixas e pedidos de eliminação, pedidos de alteração de dados com documentos, número de registo do alojamento, histórico de stock com nome de quem alterou; corrigir "login com Google" (só o nome e email); dizer que a fotografia de perfil fica num endereço público.
   - "Para que usamos": acrescentar emails de lembrete, gestão de reservas e cancelamentos, verificação de pedidos de alteração (com bloqueio temporário do perfil até revisão humana), expiração automática de encomendas não levantadas.
   - "Com quem partilhamos": remeter a IA para a nova secção; acrescentar Stripe (responsável próprio para KYC/antifraude, com ligação à política da Stripe), Resend (emails) e Google Fonts.
   - "Transferências": nomear Anthropic (CCT), Stripe e Resend (CCT/DPF).
   - "Durante quanto tempo": IA (30 dias na Anthropic; traduções e registos de utilização na nossa base de dados enquanto o conteúdo original existir / até pedido de eliminação); chat e anexos (até pedido de eliminação, ou 5 dias após a entrega se a limpeza for ativada); pontuação de atividade (janela de 30 dias).
   - "Os seus direitos": acrescentar oposição ao tratamento baseado em interesse legítimo (traduções), contacto da CNPD completo; apagar conta é feito a pedido por email.
2. **Fase 2: cookies (`CookieSection.tsx` + `legal.json` × 5)**
   - Acrescentar à tabela: `farmconnect_fulfillment`, `farmconnect_delivery_route`, `valorrural:animacoes-pausadas`, cópias `*::prev`, Google Fonts; indicar que `fc_consent`/`fc_sid` podem usar sessionStorage.
   - Atualizar o texto da geolocalização (mapa **e** ordenação por distância).
3. **Fase 3 (opcional, aprovar à parte): correções de código**
   - Servir as fontes localmente (remover Google Fonts do `index.html`) — retira um envio de IP sem consentimento.
   - Agendar `delete_old_order_chats()` com `pg_cron` numa migração nova e apagar também anexos e `content_translations` do tipo `chat` correspondentes.
4. **Fase 4: traduções e data**
   - Atualizar `src/pages/legal/privacy.{en,de,es,fr}.tsx` com as mesmas secções e `id`.
   - `LEGAL.lastUpdated` → data da publicação; atualizar `docs/traducoes.md` (secção IA) se mudar algo.
5. **Fase 5: verificação**
   - `tsc`, `eslint`, `npm test` (inclui `locales.test.ts` e `legal-pages.test.tsx`; acrescentar um caso que verifica a âncora `#ia` em todos os idiomas).

## 6. Ficheiros e estimativa

| Ficheiro | Ação | Motivo |
|---|---|---|
| `src/pages/Privacy.tsx` | alterar | Nova secção de IA e secções completadas |
| `src/pages/legal/privacy.{en,de,es,fr}.tsx` | alterar | Traduções de cortesia |
| `src/components/CookieSection.tsx` | alterar | Linhas novas da tabela |
| `src/locales/{pt,en,de,es,fr}/legal.json` | alterar | Textos das novas linhas e da geolocalização |
| `src/lib/legal.ts` | alterar | Data da última atualização |
| `src/test/legal-pages.test.tsx` | alterar | Verificar secção `#ia` |
| `index.html` + fontes locais | alterar (opcional) | Remover Google Fonts |
| `supabase/migrations/2026112012xxxx_limpeza_chat.sql` | criar (opcional) | Agendar limpeza dos chats |

| Fase | Esforço |
|---|---|
| Fase 1: texto PT | M (≈ 2 h) |
| Fase 2: cookies | S (≈ 0,5 h) |
| Fase 3: correções de código (opcional) | M (≈ 2 h) |
| Fase 4: traduções | M (≈ 2 h) |
| Fase 5: verificação | S (≈ 0,5 h) |
| **Total** | **≈ 5 h (≈ 7 h com a Fase 3)** |

## 7. Riscos e questões em aberto

- **Segurança / RLS:** sem alterações de esquema na opção B. Na Fase 3, a migração de limpeza tem de correr como `service_role` (função `SECURITY DEFINER` já existente) e apagar ficheiros do storage via função ou Edge Function.
- **Privacidade e consentimento:**
  - Avatares em bucket público: a política passa a dizer isso; alternativa futura é bucket privado com URLs assinados.
  - Sem funcionalidade de apagar conta e `orders.client_id` com `ON DELETE RESTRICT`: o direito ao apagamento é tratado à mão (anonimização). A política deve dizer que se faz a pedido.
  - Chats guardados indefinidamente enquanto a limpeza não estiver agendada.
- **AI Act:** sem avisos na interface (decisão do Ruben). Se o jurista entender que as avaliações traduzidas caem no art. 50.º(4), será preciso um selo "traduzido por IA" junto delas (o componente `TranslatedText` já mostra "Ver original" e pode receber o selo).
- **Custos:** nenhum novo.
- **Decisões pendentes:**
  - Fazer ou não a Fase 3 (Google Fonts locais; limpeza do chat).
  - Base legal das traduções (proposta: interesse legítimo) — validar com jurista.
  - Confirmar entidade contratante da Anthropic e certificação DPF.
  - Preencher os campos `[Denominação social]`, `[NIPC]` e `[Morada da sede]` em `src/lib/legal.ts` antes de publicar.

## 8. Fontes

- Ficheiros consultados: `src/pages/Privacy.tsx`, `src/components/CookieSection.tsx`, `src/components/LegalLayout.tsx`, `src/lib/legal.ts`, `src/lib/consent.ts`, `src/integrations/supabase/types.ts`, `supabase/functions/{generate-product-description,translate-content,stripe-connect,farmer-activity,delivery-route,sync-market-prices,create-order}/index.ts`, `supabase/functions/_shared/email.ts`, `supabase/migrations/` (buckets, `delete_old_order_chats`, `lock_farmer_on_change_request`, crons, `content_translations`, `product_history`), `index.html`.
- Ligações:
  - [Anthropic Commercial Terms](https://www.anthropic.com/legal/commercial-terms) · [DPA](https://www.anthropic.com/legal/data-processing-addendum) · [Retenção](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-commercial-api-data) · [Data residency](https://platform.claude.com/docs/en/manage-claude/data-residency)
  - [Stripe Privacy](https://stripe.com/privacy) · [Stripe Connect disclosure](https://docs.stripe.com/connect/updating-service-agreements#disclosing-how-stripe-processes-connected-account-data) · [Resend DPA](https://resend.com/legal/dpa)
  - [EDPB 1/2024](https://www.edpb.europa.eu/our-work-tools/documents/public-consultations/2024/guidelines-12024-processing-personal-data-based_en) · [EDPB 2/2019](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-22019-processing-personal-data-under-article-61b_en) · [EDPB Opinião 28/2024](https://edpb.europa.eu/system/files/2024-12/edpb_opinion_202428_ai-models_en.pdf)
  - [AI Act art. 50.º](https://artificialintelligenceact.eu/article/50/) · [FAQ Comissão](https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act)
  - [Lei 58/2019](https://diariodarepublica.pt/dr/detalhe/lei/58-2019-123815982) · [CNPD](https://www.cnpd.pt/)
