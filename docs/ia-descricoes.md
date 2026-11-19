# Descrições com IA ("Escrever com IA")

Nos formulários de **produto** (adicionar e editar), **experiência** e **alojamento**, o
agricultor pode carregar em **"Escrever com IA"**. A IA lê o texto que ele escreveu, os dados do
formulário e até 3 fotografias, e propõe uma descrição apelativa. A proposta aparece por baixo do
campo, com **Aceitar**, **Gerar outra** e **Descartar**; o texto do agricultor só muda se ele aceitar.

Plano original: [`docs/planos/2026-11-19-descricoes-ia-copywriting.md`](planos/2026-11-19-descricoes-ia-copywriting.md).

## Peças

| Peça | Onde |
|---|---|
| Edge Function | `supabase/functions/generate-product-description/index.ts` |
| Consumo e limite diário | tabela `ai_copy_usage` (`supabase/migrations/20261119120000_ai_copy_usage.sql`) |
| Preparação do pedido (fotografias reduzidas, até 3) | `src/lib/ai-description.ts` |
| Botão e proposta | `src/components/AiDescriptionAssistant.tsx` |

## Regras

- **Só agricultores com sessão iniciada.** A função verifica a sessão (`auth.getUser()`) e o
  registo em `farmer_details`; a chave pública, sozinha, recebe 401.
- **Limite:** 30 gerações por agricultor nas últimas 24 horas (`DAILY_LIMIT` na função). Acima
  disso, a função responde 429 com uma mensagem clara.
- **Fotografias:** novas (reduzidas no browser para lado maior ≤ 1568 px) e já guardadas no
  bucket `product-media`, só da pasta do próprio agricultor. Vídeos são ignorados.
- **Texto:** português de Portugal, tom apelativo e sensorial, só com factos dados pelo
  agricultor ou visíveis nas fotografias; sem certificações, prémios, alegações de saúde ou
  superlativos absolutos inventados.

## Ativar (segredo)

A função precisa da chave da API da Anthropic (console.anthropic.com → API keys):

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref vwlzarmijxqwmiwtzxlc
```

Nunca com prefixo `VITE_` nem no `.env` do frontend. Sem a chave, o botão mostra "A geração de
descrições ainda não está ativa" e o formulário continua a funcionar.

## Custos

Modelo `claude-haiku-5-5` ($0,10 por milhão de tokens de entrada, $0,50 de saída). Uma geração com
3 fotografias custa menos de 0,2 cêntimos. Para mais qualidade, trocar `MODEL` na função por
`claude-sonnet-5-5` ou `claude-opus-5-5` (≈ 20 a 40 vezes mais caro). Recomenda-se um alerta de
orçamento na consola da Anthropic.

Para ver o consumo, no SQL Editor do Supabase:

```sql
SELECT date_trunc('day', created_at) AS dia, kind, count(*), sum(input_tokens), sum(output_tokens)
  FROM ai_copy_usage GROUP BY 1, 2 ORDER BY 1 DESC;
```
