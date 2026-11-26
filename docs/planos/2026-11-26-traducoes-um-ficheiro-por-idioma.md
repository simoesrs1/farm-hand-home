# Plano: traduções num ficheiro por idioma

- **Data:** 2026-11-26
- **Pedido original:** a tradução deve ficar num ficheiro por idioma (`pt.json`, `es.json`, `fr.json`, `en.json`…), com chaves e valores, traduzidos no HTML por um pipe próprio.
- **Profundidade da pesquisa:** normal (1 subagente de código e pesquisa direta na documentação)

## 1. Contexto

As traduções já usam `react-i18next` com chaves e valores em JSON, mas repartidas por 10 ficheiros em cada um dos 5 idiomas (50 ficheiros). O Ruben quer um ficheiro por idioma. Decisões do Ruben: organizar **por secções** e **manter `t()`** (é o equivalente React do pipe do Angular).

Resultado: `src/locales/{pt,en,de,es,fr}.json`, sem mudanças nos componentes nem no que se vê no ecrã.

## 2. Âmbito

**Inclui:** fundir os 50 ficheiros em 5; ajustar o carregamento, um teste, comentários e documentação.

**Fica de fora:** pipe ou componente próprio; rever textos ou procurar texto por traduzir; tradução por IA; `supabase/functions/_shared/email-i18n.ts`; textos legais em `src/pages/legal/`.

## 3. Conclusões da pesquisa

### No código
- Só `src/i18n/index.ts` depende da disposição dos ficheiros (imports nas linhas 15-24, `import.meta.glob` e regex nas linhas 44-51).
- `t()`, `useTranslation("área")`, `src/i18n/i18next.d.ts` e `src/test/locales.test.ts` continuam válidos, porque `resources[idioma][área]` mantém a forma.
- Os 50 ficheiros são JSON válido, sem BOM nem chaves duplicadas, com a mesma formatação.
- `common.json` tem uma chave `offerings` e `farmer.json` uma chave `orders`: cada área tem de ficar **aninhada** sob o seu nome, nunca espalhada no topo.
- Os ramos `dev` e `new-visual` e o stash não alteram `src/locales` nem `src/i18n`.

### Na documentação externa
- O i18next aceita `resources` como idioma → área → chaves: [Add or load translations](https://www.i18next.com/how-to/add-or-load-translations)
- As chaves tipadas vêm do `typeof` dos textos de origem: [TypeScript](https://www.i18next.com/overview/typescript)

### Por confirmar
- Se o Diogo tem trabalho por enviar que mexa nos ficheiros antigos. Daria conflitos de "alterado/apagado".

## 4. Opções e recomendação

| Opção | Descrição | Prós | Contras |
|---|---|---|---|
| A | Um ficheiro por idioma, por secções | Componentes intactos | Ficheiros de cerca de 2350 linhas |
| B | Um ficheiro por idioma, chaves planas | Fácil pesquisar uma chave | Obriga a rever as chamadas `t()` |
| C | Deixar como está | Sem trabalho | 50 ficheiros |

**Recomendação:** A, mantendo `t()`. Um pipe próprio repetiria o que o `t()` já faz.

Exemplo de `src/locales/pt.json`:

```json
{
  "common": { "…": "…" },
  "home": { "hero": { "title": "Do campo para a sua mesa, sem intermediários" } }
}
```

No componente nada muda: `const { t } = useTranslation("home"); t("hero.title")`.

## 5. Passos de implementação

0. Guardar este plano em `docs/planos/2026-11-26-traducoes-um-ficheiro-por-idioma.md` (o modo de planeamento não o permitiu antes).
1. **Fundir** com um script Node temporário (no scratchpad, fora do repositório): para cada idioma, juntar as áreas pela ordem atual (`common, home, catalog, cart, orders, account, farmer, offerings, legal, server`) e escrever com `JSON.stringify(obj, null, 2)`. Antes de apagar, confirmar que cada área do ficheiro novo é igual ao ficheiro antigo.
2. **Apagar** as pastas `src/locales/<idioma>/`.
3. **`src/i18n/index.ts`:**
   - `import pt from "@/locales/pt.json"` e `export const ptResources = pt;` em vez dos 10 imports;
   - glob `../locales/*.json`, tipado com `ResourceLanguage`, e regex que só apanha o idioma;
   - atualizar os comentários.
   - Um glob errado não dá erro de compilação; o teste dos cinco idiomas apanha-o.
4. **`src/test/locales.test.ts`:** novo teste a exigir que cada idioma tenha exatamente as mesmas secções que o `pt` (hoje uma secção a mais passaria despercebida).
5. **Comentários e documentação:** novos caminhos.

## 6. Ficheiros e estimativa

| Ficheiro | Ação | Motivo |
|---|---|---|
| `src/locales/{pt,en,de,es,fr}.json` | criar | um por idioma |
| `src/locales/<idioma>/*.json` (50) | apagar | substituídos |
| `src/i18n/index.ts` | alterar | carregamento |
| `src/test/locales.test.ts` | alterar | teste das secções |
| `src/components/SideMenu.tsx`, `src/lib/site-links.ts`, `src/lib/server-messages.ts`, `src/pages/Privacy.tsx` | alterar | só comentários com os caminhos antigos |
| `CLAUDE.md`, `docs/traducoes.md` | alterar | regras e documentação |
| `docs/planos/2026-11-26-traducoes-um-ficheiro-por-idioma.md` | criar | cópia do plano |

Os planos antigos em `docs/planos/` não se alteram. `src/components/StripePayoutsCard.tsx` já estava modificado e não é tocado.

**Esforço total:** S (≈ 1 hora).

## 7. Verificação

- Comparação automática entre os 50 ficheiros antigos e os 5 novos (passo 1).
- `npx tsc --noEmit -p tsconfig.app.json`, `npx eslint` nos ficheiros `.ts`/`.tsx` alterados, `npm test`, `npm run build`.
- `npm run dev`: abrir a página inicial, o catálogo e o carrinho, trocar entre os 5 idiomas e confirmar que não aparecem chaves cruas (ex.: `hero.title`). As páginas que exigem sessão ficam para o Ruben validar, e isso será dito no resumo.
- Sem commit nem push.

## 8. Riscos e questões em aberto

- **Segurança / RLS:** não se aplica, não há alterações à base de dados.
- **Privacidade e consentimento:** não se aplica, não mudam dados nem serviços.
- **Custos:** nenhum.
- **Conflitos:** avisar o Diogo antes de enviar; textos novos que tenha nos ficheiros antigos têm de ser passados para os novos.
- **Manutenção:** ficheiros grandes; a pesquisa pela secção no editor resolve a navegação.
- **Decisões pendentes:** nenhuma.

## 9. Fontes

- Ficheiros: `src/i18n/index.ts`, `src/i18n/i18next.d.ts`, `src/i18n/languages.ts`, `src/test/locales.test.ts`, `src/components/HeroSection.tsx`, `docs/traducoes.md`.
- Ligações: as da secção 3.
