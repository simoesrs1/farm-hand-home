# Plano: ordenar os produtos por proximidade quando a localização é conhecida

- **Data:** 2026-11-21
- **Pedido original:** "quero que na parte do catálogo, caso tenha a localização ativa, ou já tenha feito pesquisa, no catálogo de produtos deverá ter uma ordenação por o que está mais perto. O catálogo continua normalmente para escolher a categoria; quando a categoria é escolhida e estamos a ver os produtos, é que vai ser ordenado por predefinição pela localização. Podendo ser a que está ativa ou a última localização pesquisada."
- **Profundidade da pesquisa:** rápida
- **Respostas do Ruben:**
  - "pesquisa" = mapa **e** pesquisa por localidade;
  - lembrar a última localização entre visitas, com consentimento de preferências;
  - mostrar a distância em cada cartão.
- **Destino final do plano:** `docs/planos/2026-11-21-ordenacao-proximidade-catalogo.md` (copiado depois de aprovado).

## 1. Contexto

A página de produtos de cada categoria (`/catalogo/:slug`) começa sempre em "Relevância". O "Mais perto" só funciona se o cliente o escolher e pede a localização de novo em cada visita. A localização escolhida no mapa da página inicial (aparelho, distrito ou clique) perde-se e nunca chega ao catálogo.

Queremos uma "localização de pesquisa" única. Pode vir de três sítios: do aparelho (se já houver autorização), do mapa ou de uma localidade escrita pelo cliente. Quando existe, a página de produtos abre ordenada do mais perto para o mais longe e mostra os km em cada cartão. `/catalogo`, com a escolha de categorias, não muda.

## 2. Âmbito

**Inclui:**
- **Fonte única da localização** (`src/lib/search-location.ts` + hook `useSearchLocation`):
  - guarda a latitude, a longitude, o nome ("A sua localização", "Coimbra", "Fundão") e a origem;
  - fica guardada entre visitas só com o consentimento de preferências.
- **Localização do aparelho sem perguntar**, se o browser já a autorizou (Permissions API). Se ainda não autorizou, não aparece nenhum pedido automático.
- **Pesquisa por localidade** nos 308 concelhos de Portugal, com sugestões ao escrever. O ponto usado é a sede do concelho.
- **Página de produtos (`CategoryPage`):**
  - com localização, abre em "Mais perto";
  - aparece a linha "A ordenar pela distância a X" com "Alterar" e "Limpar";
  - cada cartão mostra os km.
- **Mapa da página inicial (`PortugalMapDialog`):** passa a escrever na fonte única e também a ler dela.
- **Experiências e Alojamento (`FarmListings`):** usam a mesma localização, sem pedir outra vez.
- **Textos novos nos 5 idiomas.** A Política de Privacidade e a tabela de cookies ganham a nova chave guardada.

**Fica de fora:**
- **Pesquisa por morada exata ou por freguesia:** exigiria a geocodificação da Google ou do openrouteservice, com custo e consentimento. Fica como evolução possível.
- **Distância por estrada:** a distância é em linha reta (Haversine), como já acontece hoje.
- **Ordenação na página `/catalogo`:** a página das categorias não muda.

## 3. Conclusões da pesquisa

### No código
- **`src/pages/CategoryPage.tsx`:**
  - ordenação: `SortOption`/`SORT_OPTIONS` (`:23-40`), `useState<SortOption>("relevancia")` (`:104`);
  - `handleSortChange` pede a geolocalização só ao escolher "mais-perto"/"mais-longe" (`:115-139`);
  - repete a função `distanceKm` (`:76-89`), que já existe em `@/lib/geo`;
  - cada produto tem `lat`/`lng` de `farmer_details.pickup_lat/pickup_lng` (`:205`, `:257-258`); a ordenação está em `:290-334`;
  - não tem caixa de pesquisa.
- **`src/pages/Catalog.tsx`:** só categorias (pesquisa por nome de categoria). Não muda.
- **`src/components/PortugalMapDialog.tsx`:** `center` local (`:51`), `locateMe` (`:225-250`), `<select>` de distritos `PT_REGIONS` (`:280-292`) e clique no mapa. É usado em `HeroSection`, `Experiences` e `Stays`.
- **`src/components/FarmListings.tsx`:** o seu próprio `userPos` (`:53`), a ordenação "perto" (`:118-142`) e `distanceKm` de `@/lib/geo`.
- **`src/lib/geo.ts`:** `distanceKm`, `withinRadius`, `PT_REGIONS` (18 distritos e 2 regiões autónomas) e `formatKm`, tudo reutilizável.
- **`src/lib/consent.ts`:**
  - `STORAGE_KEYS` + `scopedStorage` (`:157-200`) já guardam dados "só nesta sessão, ou entre visitas com consentimento de preferências", com a cópia `::prev` à espera da escolha;
  - basta acrescentar uma chave (ex.: `searchLocation: "farmconnect_search_location"`).
- **`src/components/ProductCard.tsx`:** já tem uma pastilha de localização sobre a imagem (`showLocation && p.location`, `:123-128`). Junta-se a distância a essa pastilha (prop opcional `distanceKm`).
- **Política de Privacidade e cookies:**
  - `legal.json` `cookies.location` e a secção "dados" dizem que a localização "não é guardada nem enviada";
  - continua a não ser enviada, mas passa a ser guardada no navegador. É preciso atualizar o texto e acrescentar `farmconnect_search_location` a `STORAGE_ITEMS` em `src/components/CookieSection.tsx`.
- **Sem alterações** à base de dados nem às Edge Functions.

### Na documentação externa
- **Permissions API:** `navigator.permissions.query({ name: "geolocation" })` devolve `granted` / `prompt` / `denied`, o que permite obter a posição sem mostrar um pedido. Suportada no Chrome, Edge, Firefox e Safari ≥ 16: [MDN Permissions.query](https://developer.mozilla.org/en-US/docs/Web/API/Permissions/query).
- **Geolocation API:** `getCurrentPosition` com `maximumAge` aproveita uma posição recente: [MDN Geolocation](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition).
- **Lista de concelhos com coordenadas:** a CAOP da DGT é a carta administrativa oficial. Daí derivam-se os 308 concelhos e as coordenadas da sede: [DGT — CAOP](https://www.dgterritorio.gov.pt/cartografia/cartografia-tematica/caop).

### Por confirmar
- **Fonte exata e licença da lista dos 308 concelhos com coordenadas:** a CAOP/dados.gov.pt tem licença aberta, mas é preciso confirmar o ficheiro antes de o gerar.
- **Safari em iOS:** ver se `permissions.query` devolve `granted` depois de uma autorização "Permitir uma vez". Se não devolver, o cliente usa "Usar a minha localização" ou escreve a localidade.

## 4. Opções e recomendação

| Opção | Descrição | Prós | Contras |
|---|---|---|---|
| A | Lista local dos 308 concelhos (`src/data/municipios.ts`) com pesquisa sem acentos | Grátis, instantânea, não envia dados a terceiros, sem consentimento extra | Precisão ao nível do concelho; não aceita moradas |
| B | Google Geocoding/Places no browser | Aceita qualquer morada | Só funciona com consentimento de mapas (`MapConsentGate`); custo por pedido; o texto vai para a Google |
| C | Geocodificação do openrouteservice numa Edge Function nova | Aceita moradas, chave no servidor | Função nova, limites do plano gratuito, mais latência; o endpoint na `api.heigit.org` está **por confirmar** |

**Recomendação:** opção A. Para ordenar produtos por proximidade basta a precisão de concelho, e a opção A não cria custos nem novas partilhas de dados. Se mais tarde fizer falta pesquisar moradas, a fonte única aceita outra origem sem mexer nas páginas.

## 5. Passos de implementação

1. **Fase 1: fonte única da localização**
   - Criar `src/data/municipios.ts`: `{ name, district, lat, lng }[]` com os 308 concelhos, gerado a partir da fonte oficial.
   - Criar `src/lib/search-location.ts`:
     - tipo `SearchLocation = { lat, lng, label, source: "device" | "district" | "municipality" | "map" }`;
     - `getSearchLocation` / `setSearchLocation` / `clearSearchLocation` gravam com `scopedStorage` (nova chave em `STORAGE_KEYS`) e avisam quem estiver a ouvir;
     - `useSearchLocation()` através de `useSyncExternalStore`;
     - `findMunicipalities(query)`: pesquisa sem acentos nem maiúsculas, até 8 resultados;
     - `tryDeviceLocation()`: se `permissions.query` der `granted`, obtém a posição e grava-a. Caso contrário, não faz nada.
   - Ordem de prioridade ao abrir a página: localização do aparelho já autorizada, depois a última pesquisada que esteja guardada.
2. **Fase 2: página de produtos**
   - **`CategoryPage.tsx`:**
     - a ordenação começa em "mais-perto" quando há localização; o estado `sortTouched` evita trocar a escolha manual do cliente;
     - `userPos` passa a vir de `useSearchLocation`;
     - o "Mais perto" escolhido à mão usa `requestDeviceLocation()` (o pedido normal do browser) e grava o resultado;
     - remover a cópia de `distanceKm` e usar a de `@/lib/geo`.
   - **Componente `SearchLocationBar`:**
     - mostra "A ordenar pela distância a {{label}}" com "Alterar" (campo com sugestões de concelhos e o botão "Usar a minha localização") e "Limpar";
     - sem localização, mostra "Ver os mais perto de si" com os mesmos controlos.
   - **`ProductCard.tsx`:** prop opcional `distanceKm`, mostrada com `formatKm` na pastilha de localização.
3. **Fase 3: ligar o mapa e as listagens**
   - **`PortugalMapDialog.tsx`:** o centro inicial vem de `useSearchLocation`. Usar a localização, escolher um distrito ou clicar no mapa chama `setSearchLocation`, e o "x" limpa.
   - **`FarmListings.tsx`:** `userPos` passa a vir de `useSearchLocation`, e "perto" fica predefinido quando há localização, como na página de produtos.
4. **Fase 4: textos, privacidade e testes**
   - Chaves novas em `src/locales/*/catalog.json` (e `offerings.json`, se for preciso) nos 5 idiomas.
   - Novo item em `STORAGE_ITEMS` e em `legal.json` (`cookies.items.searchLocation`), mais o texto revisto de `cookies.location`.
   - Atualizar "dados" em `Privacy.tsx` e nas 4 traduções: a localização escolhida fica guardada só no navegador e nunca é enviada.
   - Testes Vitest em `src/test/search-location.test.ts`: pesquisa de concelhos sem acentos, prioridade das origens, e o comportamento com e sem consentimento (persistência).

## 6. Ficheiros e estimativa

| Ficheiro | Ação | Motivo |
|---|---|---|
| `src/data/municipios.ts` | criar | 308 concelhos com coordenadas |
| `src/lib/search-location.ts` | criar | Fonte única + hook + pesquisa |
| `src/components/SearchLocationBar.tsx` | criar | Linha "A ordenar pela distância a…" + alterar/limpar |
| `src/lib/consent.ts` | alterar | Nova chave em `STORAGE_KEYS` |
| `src/pages/CategoryPage.tsx` | alterar | Predefinição "Mais perto", barra, km nos cartões |
| `src/components/ProductCard.tsx` | alterar | Mostrar a distância |
| `src/components/PortugalMapDialog.tsx` | alterar | Ler e escrever a fonte única |
| `src/components/FarmListings.tsx` | alterar | Usar a fonte única |
| `src/components/CookieSection.tsx` | alterar | Nova linha na tabela |
| `src/locales/*/catalog.json`, `legal.json` | alterar | Textos nos 5 idiomas |
| `src/pages/Privacy.tsx`, `src/pages/legal/privacy.*.tsx` | alterar | Localização guardada no navegador |
| `src/test/search-location.test.ts` | criar | Testes |

| Fase | Esforço |
|---|---|
| Fase 1: fonte única + concelhos | M (≈ 2–3 h) |
| Fase 2: página de produtos | M (≈ 2 h) |
| Fase 3: mapa e listagens | S (≈ 1 h) |
| Fase 4: textos, privacidade, testes | S (≈ 1–2 h) |
| **Total** | **≈ 6–8 h** |

## 7. Riscos e questões em aberto

- **Segurança / RLS:** não se aplica, porque não há alterações no servidor nem na base de dados.
- **Privacidade:** a localização nunca sai do browser; só se guarda entre visitas com o consentimento de preferências. É preciso atualizar a Política e a tabela de cookies na mesma alteração.
- **Produtos sem coordenadas:** agricultores sem `pickup_lat/lng` ficam no fim da lista e não mostram km.
- **Expectativa do cliente:** a ordenação automática pode surpreender; a linha "A ordenar pela distância a…" deixa claro porquê e permite limpar.
- **Por confirmar:** a fonte e a licença da lista de concelhos, e o comportamento do Safari iOS com `permissions.query`.

## 8. Verificação

- `npx tsc --noEmit -p tsconfig.app.json`, `npm run lint` nos ficheiros alterados, `npm test` e `npx vite build`.
- **No browser (`npm run dev`):**
  - sem localização: a página de uma categoria abre em "Relevância" e mostra "Ver os mais perto de si";
  - escrever "Fundão" ordena por distância e mostra os km; ao recarregar, mantém-se só se as preferências estiverem aceites;
  - escolher "Coimbra" no mapa da página inicial faz a página de produtos abrir ordenada por Coimbra;
  - com a localização já autorizada no browser, ordena sem mostrar nenhum pedido;
  - mudar à mão para "Preço" mantém essa escolha; "Limpar" volta a "Relevância";
  - Experiências e Alojamento usam a mesma localização.

## 9. Fontes

- Ficheiros consultados: `src/pages/CategoryPage.tsx`, `src/pages/Catalog.tsx`, `src/components/PortugalMapDialog.tsx`, `src/components/FarmListings.tsx`, `src/components/ProductCard.tsx`, `src/lib/geo.ts`, `src/lib/consent.ts`, `src/components/CookieSection.tsx`, `src/locales/pt/legal.json`, `supabase/functions/delivery-route/index.ts`.
- Ligações: [MDN Permissions.query](https://developer.mozilla.org/en-US/docs/Web/API/Permissions/query), [MDN Geolocation.getCurrentPosition](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition), [DGT — CAOP](https://www.dgterritorio.gov.pt/cartografia/cartografia-tematica/caop).
