# Plano: descrições com IA (copywriting) para produtos, experiências e alojamento

- **Data:** 2026-11-19
- **Pedido original:** "Quero que onde os agricultores podem colocar a descrição dos produtos, experiências e Alojamento que baseado nas imagens e baseado num pequeno texto que coloquem que um agente AI coloque um texto mais apelativo e uma copywriting atraente e glamurosa."
- **Profundidade da pesquisa:** normal
- **Respostas do Ruben:** em todos os formulários (criar e editar); tom glamuroso, mas só com factos dados ou visíveis nas fotos; a IA mostra uma proposta para aceitar, gerar outra ou editar (não substitui logo).
- **Destino final do plano:** `docs/planos/2026-11-19-descricoes-ia-copywriting.md` (copiado depois de aprovado; em modo de planeamento só este ficheiro pode ser escrito).

## 1. Contexto

Os agricultores escrevem descrições curtas e pouco apelativas. Já existe um botão "Escrever com IA" em Adicionar produto, mas só aí, escreve num tom "simples e honesto" de ~60 palavras e **substitui** o texto do agricultor. Queremos o mesmo assistente em produtos, experiências e alojamento (criar e editar), com copywriting sensorial e glamuroso, baseado no texto curto do agricultor e nas fotografias, sem inventar factos, e apresentado como proposta que o agricultor aceita ou pede outra.

## 2. Âmbito

**Inclui:**
- Edge Function de IA generalizada para 3 tipos (`product`, `experience`, `stay`), com autenticação de agricultor e limite diário de utilização.
- Componente partilhado "Escrever com IA" com proposta (Aceitar · Gerar outra · Descartar), em: Adicionar produto, Editar produto, formulário de experiência e formulário de alojamento.
- Fotografias novas (ficheiros no browser) e já guardadas (bucket `product-media`).
- Política de Privacidade (fotografias e texto enviados à Anthropic) e documentação do segredo `ANTHROPIC_API_KEY`.

**Fica de fora:**
- Tradução para outras línguas, títulos sugeridos e geração de imagens.
- Vídeos (a API só aceita imagens; os vídeos são ignorados).
- Área de administração para ver o consumo (fica registado na base de dados).

## 3. Conclusões da pesquisa

### No código
- **Já existe** `supabase/functions/generate-product-description/index.ts`: modelo `claude-haiku-5-5`, `max_tokens: 16000`, `output_config: { effort: "low" }`, até 3 imagens em data URL (jpeg/png/gif/webp), resposta `{ description }`, 503 sem `ANTHROPIC_API_KEY`, 422 em recusa.
- **Falha de segurança:** a função **não verifica quem a chama** (sem `auth.getUser()`, CORS `*`). Não há entrada em `supabase/config.toml`, por isso vale `verify_jwt = true`, mas a chave pública (anon) passa essa verificação: qualquer pessoa pode gastar créditos da Anthropic.
- Padrão de autenticação a reutilizar: `supabase/functions/order-action/index.ts:49-82` (cliente com o `Authorization` → `auth.getUser()` → cliente admin → `farmer_details` por `user_id`).
- `src/pages/farmer/NewProduct.tsx:89-133` (`handleGenerateDescription`): envia `name, category, unit, isOrganic, isLactoseFree, modifications, farmName, images` (≤3 imagens < 4 MB em data URL); **faz `setDescription` direto**. Botão em `:475-485` ("Escrever com IA" / `Sparkles`). Página em "você".
- `src/pages/farmer/EditProduct.tsx:351-357`: descrição sem botão de IA; carrega `media_urls` (`select("*")`, `:104-108`) mas não as usa.
- `src/components/ExperienceForm.tsx:152-159` e `src/components/StayForm.tsx:172-179`: descrição (mín. 20 caracteres); fotografias em `existingMedia` (caminhos no bucket) + `files` (novos `File`).
- `src/lib/media-upload.ts`: `signMedia`, `isVideoPath`, `uploadMedia`; bucket privado `product-media`, pasta `<user_id>/` (`supabase/migrations/20261107120000_storage_buckets_em_falta.sql`, política em `20260705134050_…sql:33-41`).
- Não existe tabela de consumo/limites de IA. `supabase/functions/_shared/` não tem helper de autenticação.
- Deploy: `.github/workflows/supabase-deploy.yml` publica todas as funções no push para `main`; o segredo `ANTHROPIC_API_KEY` só está documentado num comentário da função.

### Na documentação externa
- Preços por milhão de tokens: Haiku 5.5 $0,10 entrada / $0,50 saída; Sonnet 5.5 $2 / $10; Opus 5.5 $4 / $20 (tabela de modelos da skill `claude-api`, cache 2026-11-03; [preços](https://claude.com/pricing)).
- Imagens: JPEG, PNG, GIF, WebP; até 10 MB por imagem (base64) e 8000×8000 px; custo ≈ ⌈largura/28⌉ × ⌈altura/28⌉ tokens; nos modelos 4.7+ o lado maior vai até 2576 px (até 4784 tokens/imagem). Também aceita imagens por URL: [Vision](https://platform.claude.com/docs/en/build-with-claude/vision).
- Resposta em JSON garantida com `output_config.format` (`json_schema`) e `client.messages.parse()` + `jsonSchemaOutputFormat`/`zodOutputFormat`; suportado no `claude-haiku-5-5`; sem `minLength`/`maxLength` no esquema: [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs).
- Haiku 5.5: esforço por omissão `medium`, pensamento adaptativo; recusas sem fallback no servidor (tratar `stop_reason: "refusal"`).
- Cache de prompt não compensa: o prompt de sistema é curto (abaixo do mínimo cacheável de 512–4096 tokens).

### Por confirmar
- Se `ANTHROPIC_API_KEY` já está definida nos segredos do Supabase (confirmar com `supabase secrets list` ou testando o botão atual).
- Termos de retenção/uso de dados da API da Anthropic para os textos do Privacy (confirmar nos termos comerciais da Anthropic antes de publicar o texto).
- Qualidade do Haiku 5.5 para copywriting glamuroso em pt-PT (testar com 5–10 casos reais antes de decidir mudar de modelo).

## 4. Opções e recomendação

| Opção | Descrição | Prós | Contras |
|---|---|---|---|
| A | Generalizar a função existente com `kind` + autenticação + limite diário; componente de proposta partilhado | Uma só função e um só componente; corrige a falha de segurança | Nome da função fica "product" (aceitável) |
| B | Três funções separadas (produto, experiência, alojamento) | Prompts isolados | Código repetido, três sítios para autenticação e limites |
| C | Chamar a API diretamente do browser | Simples | **Proibido**: exporia a chave (CLAUDE.md: segredos só nas Edge Functions) |

**Recomendação:** Opção A, com `claude-haiku-5-5` (custo estimado < 0,2 cêntimos por geração com 3 fotos). Se nos testes o texto não tiver qualidade suficiente, troca-se para `claude-sonnet-5-5` ou `claude-opus-5-5` numa só constante (≈ 2–6 cêntimos por geração). Decisão de modelo fica para o Ruben após os testes.

## 5. Passos de implementação

1. **Fase 1: Edge Function segura e generalizada** (`supabase/functions/generate-product-description/index.ts`)
   - Exigir sessão: `auth.getUser()` + `farmer_details` do utilizador (padrão de `order-action`); 401/403 caso contrário.
   - Corpo: `{ kind: "product" | "experience" | "stay", draft: string, facts: {...}, images: string[] (data URLs), imagePaths: string[] }`. Compatibilidade: sem `kind`, assume `product` com os campos antigos.
   - Fotografias já guardadas: descarregar do bucket com o cliente admin **só** se o caminho começar por `<user_id>/` e não for vídeo; total máximo 3 imagens.
   - Prompt por tipo, em pt-PT: tom glamuroso e sensorial; **só factos do agricultor ou visíveis nas fotos**; sem certificações, prémios, alegações de saúde ou superlativos absolutos inventados; texto dirigido ao cliente sem "tu"/"você" direto (impessoal); extensão: produto 60–100 palavras, experiência e alojamento 120–200 palavras, sem markdown nem emojis.
   - Resposta com `client.messages.parse()` + `jsonSchemaOutputFormat({ description: string })`; tratar `refusal` (422), `RateLimitError` (429), `AuthenticationError` (503).
   - Limite diário por agricultor (ex.: 30 gerações/dia) e registo de consumo (tokens de entrada/saída) na tabela da Fase 2; 429 com mensagem clara quando excedido.
2. **Fase 2: Migração** `supabase/migrations/2026111912xxxx_ai_copy_usage.sql`
   - Tabela `ai_copy_usage (id, farmer_id → farmer_details, kind, input_tokens, output_tokens, created_at)`; RLS ativo sem políticas para utilizadores; `GRANT ALL` só a `service_role`; índice `(farmer_id, created_at)`.
3. **Fase 3: Cliente partilhado**
   - `src/lib/ai-description.ts`: reduzir fotografias novas no browser (canvas, lado maior ≤ 1568 px, JPEG ~0,85) antes de converter para data URL; escolher até 3 imagens (novas primeiro, depois guardadas, sem vídeos); chamar a função e extrair a mensagem de erro (`FunctionsHttpError.context.json()`, como em `NewProduct`).
   - `src/components/AiDescriptionAssistant.tsx`: botão "Escrever com IA" (Sparkles/Loader2) e, por baixo do campo, cartão com a proposta e **Aceitar** (substitui o texto), **Gerar outra**, **Descartar**; nota "Confirme que o texto está correto antes de publicar."; tratamento "você"; tokens de cor do tema.
4. **Fase 4: Integração nos formulários**
   - `NewProduct.tsx`: substituir `handleGenerateDescription` pelo componente (deixa de substituir direto).
   - `EditProduct.tsx`: acrescentar o componente usando `media_urls` já carregadas.
   - `ExperienceForm.tsx` e `StayForm.tsx`: componente junto da descrição, com os factos do formulário (título, duração/pessoas/sessões/brindes; quartos/lotação/noites/horários) e `existingMedia` + `files`.
5. **Fase 5: Privacidade, documentação e testes**
   - `src/pages/Privacy.tsx`: acrescentar a Anthropic aos subcontratantes (texto e fotografias enviados só quando o agricultor carrega no botão).
   - `docs/ia-descricoes.md`: como definir `ANTHROPIC_API_KEY` (`supabase secrets set`), limites e custos; referência no comentário da função.
   - Testes Vitest em `src/test/ai-description.test.ts` (seleção de imagens, limites, construção do pedido por tipo).

## 6. Ficheiros e estimativa

| Ficheiro | Ação | Motivo |
|---|---|---|
| `supabase/functions/generate-product-description/index.ts` | alterar | Autenticação, `kind`, imagens guardadas, prompts, JSON, limite diário |
| `supabase/migrations/2026111912xxxx_ai_copy_usage.sql` | criar | Consumo e limite diário (RLS + GRANT) |
| `src/lib/ai-description.ts` | criar | Preparar imagens e chamar a função |
| `src/components/AiDescriptionAssistant.tsx` | criar | Botão + proposta (aceitar / outra / descartar) |
| `src/pages/farmer/NewProduct.tsx` | alterar | Usar o componente |
| `src/pages/farmer/EditProduct.tsx` | alterar | Acrescentar o componente |
| `src/components/ExperienceForm.tsx` | alterar | Acrescentar o componente |
| `src/components/StayForm.tsx` | alterar | Acrescentar o componente |
| `src/pages/Privacy.tsx` | alterar | Subcontratante Anthropic |
| `docs/ia-descricoes.md` | criar | Segredo, limites, custos |
| `src/test/ai-description.test.ts` | criar | Testes da lógica do cliente |
| `src/integrations/supabase/types.ts` | alterar | Tabela nova (à mão) |

| Fase | Esforço |
|---|---|
| Fase 1: Edge Function | M (≈ 3–4 h) |
| Fase 2: Migração | S (≈ 0,5 h) |
| Fase 3: Cliente partilhado | M (≈ 2–3 h) |
| Fase 4: Integração (4 formulários) | M (≈ 2–3 h) |
| Fase 5: Privacidade, docs, testes | S (≈ 1–2 h) |
| **Total** | **≈ 9–12 h** |

## 7. Riscos e questões em aberto

- **Segurança / RLS:** hoje qualquer pessoa pode chamar a função e gastar créditos; a Fase 1 corrige (só agricultores com sessão). Fotografias do bucket só se o caminho for da pasta do próprio agricultor. A tabela de consumo não é legível pelos utilizadores.
- **Privacidade e consentimento:** texto e fotografias vão para a Anthropic só quando o agricultor carrega no botão; tem de constar da Política de Privacidade. Retenção de dados da API **por confirmar**.
- **Publicidade enganosa:** o tom "glamuroso" pode exagerar; o prompt proíbe factos inventados e alegações de saúde (Regulamento (CE) n.º 1924/2006 sobre alegações nutricionais e de saúde), e a proposta exige aceitação do agricultor, que fica responsável pelo texto.
- **Custos:** Haiku 5.5 ≈ < 0,2 cêntimos por geração; limite diário evita abusos. Opus 5.5 ≈ 20–40× mais caro. Recomenda-se alerta de orçamento na consola da Anthropic.
- **Decisões pendentes:** modelo final após testes (Haiku vs Sonnet/Opus); valor do limite diário (proposta 30); confirmar se `ANTHROPIC_API_KEY` já está definida.

## 8. Verificação (depois de implementar)

- `npx tsc --noEmit -p tsconfig.app.json`, `npm run lint` nos ficheiros alterados, `npm test`, `npx vite build`.
- Depois do push e do deploy: com a conta de agricultor de teste, gerar descrição em Adicionar/Editar produto, experiência e alojamento, com e sem fotografias; confirmar a proposta (aceitar / gerar outra / descartar).
- Chamar a função sem sessão (só com a chave anon) → 401; com conta de cliente → 403; exceder o limite → 429.
- Confirmar linhas em `ai_copy_usage` e que a função ignora caminhos de outra pasta.

## 9. Fontes

- Ficheiros consultados: `supabase/functions/generate-product-description/index.ts`, `supabase/functions/order-action/index.ts`, `supabase/config.toml`, `src/pages/farmer/NewProduct.tsx`, `src/pages/farmer/EditProduct.tsx`, `src/components/ExperienceForm.tsx`, `src/components/StayForm.tsx`, `src/components/MediaListEditor.tsx`, `src/lib/media-upload.ts`, `supabase/migrations/20261107120000_storage_buckets_em_falta.sql`, `supabase/migrations/20260705134050_3d3e9a92-4527-46a2-b40a-cd3c6d7a7b63.sql`, `.github/workflows/supabase-deploy.yml`.
- Ligações: [Vision](https://platform.claude.com/docs/en/build-with-claude/vision), [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs), [Preços](https://claude.com/pricing).
