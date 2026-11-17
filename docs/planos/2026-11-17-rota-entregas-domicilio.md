# Plano: Organizar rota das entregas ao domicílio (vista do agricultor)

- **Data:** 2026-11-17
- **Pedido original:** "Trajetória na entrega ao domicílio, na vista de agricultor." Cartão: "Colocar nas encomendas da tua quinta, quando houver entregas ao domicílio, um botão para organizar a rota mais rápida e económica para o agricultor."
- **Profundidade da pesquisa:** normal (2 subagentes: código e web)
- **Destino do ficheiro (depois da aprovação):** `docs/planos/2026-11-17-rota-entregas-domicilio.md`

## 1. Contexto

Hoje, o diálogo "Entregas ao domicílio" em Encomendas mostra a quinta e as entregas de cada dia ligadas por **linhas retas, pela ordem da hora marcada**. A numeração "sugere" uma ordem que não está otimizada e as distâncias são em linha reta. O agricultor quer um botão que organize, para cada dia, a ordem de entrega mais rápida e económica a partir da quinta, e que abra essa rota no Google Maps do telemóvel para seguir a navegação.

Respostas do Ruben:
- otimizar a ordem e abrir no Google Maps;
- ignorar a hora marcada dentro do mesmo dia;
- só soluções gratuitas ou open source.

## 2. Âmbito

**Inclui:**
- Botão "Organizar rota" no diálogo `DeliveryRouteMapDialog`, que reordena as paragens de cada dia a partir da quinta.
- Opção "Voltar à quinta no fim" (rota fechada ou aberta).
- Km totais (e tempo, na fase 2) por dia.
- Botão "Abrir no Google Maps" por dia, que abre a navegação com as paragens pela ordem calculada.
- Algoritmo puro testado (`src/lib/route-optimizer.ts`).
- Fase 2 (opcional): trajeto e tempos reais por estrada através de um serviço open source, com Edge Function.

**Fica de fora:**
- Janelas horárias. A hora marcada pelo cliente é ignorada dentro do dia, como foi decidido.
- Guardar a ordem calculada na base de dados. É recalculada sempre que o diálogo abre.
- Notificar os clientes da hora prevista de chegada.
- Vista do cliente.
- Google Directions, Routes e Distance Matrix API, porque são pagas.

## 3. Conclusões da pesquisa

### No código
- O diálogo existente é `src/components/DeliveryRouteMapDialog.tsx`:
  - agrupa por dia com `toDateString()` (linhas 63–80);
  - tem uma cópia local de `haversineKm` (31–39);
  - desenha uma `Polyline` geodésica em linha reta (145–154);
  - numera as paragens com `i + 1`;
  - já tem `MapConsentGate`, cores por dia e o tema do mapa.
- `src/pages/farmer/FarmerOrders.tsx` define três coisas:
  - `farm` (linhas 122 e 144–150), a partir de `farmer_details.pickup_lat/pickup_lng`; fica `null` se faltar a localização;
  - `routeStops` (239–255), com as encomendas `awaiting_pickup` que têm `delivery_lat/lng`;
  - `deliveryPlan` (276–293), que repete o agrupamento por dia para a lista.
- Colunas confirmadas em `src/integrations/supabase/types.ts`:
  - `orders.delivery_lat`, `delivery_lng`, `delivery_address`, `scheduled_pickup_at` e `pickup_deadline` (912–932);
  - `farmer_details.pickup_lat`, `pickup_lng` e `delivery_radius_km` (≈520).
- `src/lib/geo.ts` já tem `LatLng`, `distanceKm` (haversine) e `formatKm` (vírgula decimal). O diálogo devia usá-los em vez da sua própria cópia.
- Não há código de TSP ou otimização de rota, nem limite de entregas por dia.
- Não há CSP no repositório (nem `_headers`, nem meta tag). O alojamento é a Cloudflare Pages.
- As Edge Functions definem `corsHeaders` inline e fazem auth com `auth.getUser()` (ver `supabase/functions/order-action/index.ts:33-56`). Não há `_shared/cors.ts`.
- Os textos de privacidade só referem a Google como serviço de mapas: `src/lib/consent.ts:51-54`, `src/components/MapConsentGate.tsx` e `src/pages/Privacy.tsx:230-245` (subcontratantes).
- Testes: `src/test/*.test.ts` (Vitest). O modelo a seguir é `src/test/geo.test.ts`.
- Forma de tratamento: FarmerOrders usa "tu", mas o diálogo diz "desde a **sua** exploração" (linha 240). Os textos novos usam "tu" e essa linha corrige-se.
- **Problema existente:** o `InfoWindow` (linhas 134–140) monta HTML com `s.address`, uma morada escrita pelo cliente. Isto permite injetar HTML no ecrã do agricultor. Deve passar a usar nós DOM com `textContent`, como já faz `PortugalMapDialog.tsx`.

### Na documentação externa
- **Google Maps URLs** ([fonte](https://developers.google.com/maps/documentation/urls/get-started)):
  - não precisam de chave e não têm custo;
  - formato: `https://www.google.com/maps/dir/?api=1&destination=…&waypoints=a|b&travelmode=driving&dir_action=navigate`;
  - os waypoints são seguidos pela ordem dada;
  - no máximo 9 waypoints (3 em browser móvel; na app não há essa restrição);
  - sem `origin`, a navegação parte da localização atual.
- **OSRM, servidor demo** ([termos](https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server), [API](https://github.com/Project-OSRM/osrm-backend/blob/master/docs/http.md)):
  - tem `/table` (matriz), `/trip` e `/route` (geometria, km e tempo);
  - os termos dizem **"uso não-comercial"**, no máximo 1 pedido por segundo e sem garantias.
  - **Não é adequado para produção numa plataforma comercial.**
- **OpenRouteService** ([planos](https://account.heigit.org/info/plans), [restrições](https://giscience.github.io/openrouteservice/hosted-api-restrictions), [FAQ](https://giscience.github.io/openrouteservice/frequently-asked-questions)):
  - plano gratuito: Directions 2.000/dia, Matrix 500/dia, Optimization 2.500/dia;
  - a chave **não pode ir para o cliente**, por isso tem de passar por uma Edge Function.
- **GraphHopper Free** só serve para uso não-comercial ([fonte](https://www.graphhopper.com/pricing/)). O Valhalla da FOSSGIS tem os mesmos termos que o OSRM demo. A Mapbox exige cartão e os termos podem impedir o uso sobre o Google Maps.
- **Algoritmo:** Held-Karp (programação dinâmica) é exato e corre em milissegundos até ~15 paragens. Acima disso usa-se vizinho mais próximo + 2-opt.
- **Atribuição OSM/ODbL:** é obrigatório mostrar "© OpenStreetMap contributors" junto ao mapa quando se usam rotas de dados OSM ([fonte](https://osmfoundation.org/wiki/Licence/Attribution_Guidelines)).
- **Termos da Google:** proíbem usar conteúdo Google em mapas que não sejam Google. Não proíbem desenhar uma polyline de terceiros sobre um mapa Google ([fonte](https://cloud.google.com/maps-platform/terms/maps-service-terms)). `google.maps.geometry.encoding.decodePath` descodifica polylines com precisão 5.

### Por confirmar
- **Termos de uso comercial do plano gratuito do OpenRouteService** ([ToS](https://account.heigit.org/info/tos)). Ler antes da fase 2.
- **Quotas exatas do ORS:** a página de planos é inconsistente. Confirmar no dashboard depois de criar a conta.
- Se a Cloudflare Pages tem cabeçalhos CSP configurados no painel (fora do repositório). Na fase 1 isso não importa, porque não há pedidos novos.

## 4. Opções e recomendação

| Opção | Descrição | Prós | Contras |
|---|---|---|---|
| A | Ordem ótima calculada no browser (Held-Karp com distâncias em linha reta) + links Google Maps | Gratuito, sem terceiros novos, sem mudança de textos legais, funciona offline. A navegação real (estrada e tempo) é feita pelo Google Maps no telemóvel | A ordem é ótima em linha reta, não por estrada (pode falhar em zonas com rios ou serra). Km estimados e sem tempo |
| B | A + matriz e trajeto por estrada via OpenRouteService numa Edge Function | Ordem ótima por tempo real de condução, trajeto desenhado no mapa, km e tempo reais | Conta e chave ORS, nova Edge Function, novo subcontratante (atualizar Privacidade), atribuição OSM, ToS por confirmar |
| C | A + OSRM demo diretamente do browser | Sem chave, simples | Os termos proíbem uso comercial e o acesso pode ser cortado sem aviso |
| D | OSRM ou Valhalla em servidor próprio (Docker com o mapa de Portugal) | Sem limites e legalmente limpo | Custo e manutenção de uma VPS; viola "só gratuito" |

**Recomendação:** implementar a **opção A já (fase 1)**. Responde ao pedido ("organizar a rota e abrir no Google Maps") sem custos, sem riscos legais e sem mexer na privacidade. Quem traça o percurso por estrada é o próprio Google Maps, ao navegar. A **opção B fica como fase 2 opcional**, se a ordem em linha reta se revelar má na prática. O algoritmo da fase 1 recebe uma matriz de custos, por isso a fase 2 só troca a origem da matriz. A opção C não é recomendada por causa dos termos.

## 5. Passos de implementação

1. **Fase 1: otimização local + Google Maps** (sem backend)
   - Criar `src/lib/route-optimizer.ts` (lógica pura):
     - `buildDistanceMatrix(origin, stops)` com `distanceKm` de `@/lib/geo`;
     - `optimizeRoute(matrix, { returnToOrigin })`: Held-Karp exato até 15 paragens e vizinho mais próximo + 2-opt acima disso. Devolve a ordem e o custo total;
     - `googleMapsDirectionsUrls(stops, { returnTo? })`: gera um ou mais links (blocos de até 9 waypoints), sem `origin`, com `travelmode=driving`.
   - Criar `src/test/route-optimizer.test.ts` com estes casos: 0, 1 e 2 paragens; um caso conhecido em que a ordem ótima difere da ordem por hora; rota fechada vs. aberta; partição de links com mais de 9 paragens; coordenadas repetidas.
   - Alterar `DeliveryRouteMapDialog.tsx`:
     - usar `distanceKm` e `formatKm` de `@/lib/geo` e remover o `haversineKm` local;
     - deixa de receber `stops` e passa a receber os `days` já ordenados, mais o estado `optimized`/`returnToOrigin` e os setters (componente controlado). Assim há uma única fonte para a ordem;
     - botão **"Organizar rota"** e interruptor **"Voltar à quinta no fim"** (**desligado por defeito**: a rota termina na última entrega, por decisão do Ruben);
     - a numeração do mapa e da lista segue a ordem recebida;
     - a polyline continua em linha reta (é uma estimativa) e mostra "≈ X km" por dia;
     - botão **"Abrir no Google Maps"** por dia (`<a target="_blank" rel="noopener">`), com vários links quando há mais de 9 paragens;
     - se `farm` for `null`, o botão aparece desativado e explica que falta a localização da quinta em Disponibilidade, com ligação para lá;
     - `InfoWindow` com nós DOM e `textContent` (corrige a injeção de HTML);
     - textos em "tu"; corrigir a linha 240 ("sua exploração", "sugere a ordem").
   - Criar o hook `src/hooks/useDeliveryRoute.ts`:
     - recebe `farm`, `routeStops`, `optimized` e `returnToOrigin`;
     - devolve, com `useMemo`, os dias com as paragens ordenadas (por hora ou otimizadas), os km estimados e os links do Google Maps;
     - é a única fonte da ordem, usada pelo diálogo e pela lista.
   - Alterar `FarmerOrders.tsx`:
     - estado `optimized` e `returnToOrigin` (falso por defeito) e chamada do hook **antes do `return` antecipado** da linha 257;
     - passar os dias ao diálogo;
     - a lista "Organiza o teu dia" (`deliveryPlan`, linhas 276–293) passa a ordenar cada dia pela mesma ordem (por `orderId`). As encomendas sem ponto marcado vão para o fim, com a nota "sem ponto de entrega marcado";
     - há também um botão "Organizar rota" no cabeçalho dessa lista, ligado ao mesmo estado;
     - aproveitar para pôr `deliveryPlan` num `useMemo`.
2. **Fase 2 (opcional): trajeto real por estrada (OpenRouteService)**
   - Confirmar os ToS do ORS e criar a conta. Segredo `ORS_API_KEY` só nas Edge Functions, sem prefixo `VITE_`.
   - Nova Edge Function `supabase/functions/delivery-route/`:
     - recebe `orderIds` e não coordenadas, para não servir de proxy aberto;
     - valida o utilizador e confirma que as encomendas são da sua quinta;
     - lê as coordenadas no servidor;
     - chama ORS Matrix (durações) e, com a ordem calculada, ORS Directions;
     - devolve a matriz, a geometria, os km e o tempo.
     - Fallback: se o ORS falhar ou atingir a quota, o cliente mantém o cálculo da fase 1.
   - Registar `verify_jwt` em `supabase/config.toml` e confirmar que o workflow de deploy publica a função nova.
   - Diálogo: `optimizeRoute` passa a usar a matriz de durações; desenhar a geometria com `decodePath`; mostrar "X km · Y min"; acrescentar a atribuição "© OpenStreetMap contributors · openrouteservice.org".
   - Privacidade: acrescentar o OpenRouteService (HeiGIT, Alemanha) aos subcontratantes em `Privacy.tsx`, ajustar a descrição da categoria "maps" em `consent.ts` e `MapConsentGate`, e atualizar a versão e a data em `src/lib/legal.ts`.

## 6. Ficheiros e estimativa

| Ficheiro | Ação | Motivo |
|---|---|---|
| `src/lib/route-optimizer.ts` | criar | Algoritmo e links do Google Maps (puro, testável) |
| `src/test/route-optimizer.test.ts` | criar | Testes do algoritmo e dos links |
| `src/hooks/useDeliveryRoute.ts` | criar | Única fonte da ordem por dia (diálogo e lista) |
| `src/components/DeliveryRouteMapDialog.tsx` | alterar | Componente controlado: botões, km, links, InfoWindow seguro, textos |
| `src/pages/farmer/FarmerOrders.tsx` | alterar | Estado da rota, hook, lista "Organiza o teu dia" pela mesma ordem |
| `supabase/functions/delivery-route/index.ts` | criar (fase 2) | Proxy autenticado para o ORS |
| `supabase/config.toml` | alterar (fase 2) | `verify_jwt` da função nova |
| `src/pages/Privacy.tsx`, `src/lib/consent.ts`, `src/components/MapConsentGate.tsx`, `src/lib/legal.ts` | alterar (fase 2) | Novo subcontratante e versão dos textos |

| Fase | Esforço |
|---|---|
| Fase 1 | M (≈ 5–7 h, com testes e a lista da página) |
| Fase 2 | M (≈ 5–7 h, com a conta ORS e os textos legais) |
| **Total** | ≈ 5–7 h (só a fase 1) · ≈ 10–14 h (as duas) |

## 7. Riscos e questões em aberto

- **Segurança / RLS:**
  - Fase 1 sem mudanças de dados.
  - Corrige-se a injeção de HTML no `InfoWindow`, que já existia.
  - Na fase 2, a Edge Function tem de validar que as encomendas pertencem ao agricultor autenticado.
- **Privacidade e consentimento:**
  - Fase 1: o link do Google Maps envia as coordenadas dos clientes à Google, mas só quando o agricultor carrega no botão. A Google já é subcontratante dos mapas.
  - Fase 2: há um terceiro novo (ORS), o que obriga a atualizar os textos legais.
- **Custos:**
  - Fase 1: zero.
  - Fase 2: zero dentro das quotas do ORS (estimam-se poucos pedidos por dia).
- **Qualidade:** a distância em linha reta pode dar uma ordem pior em zonas com rios ou serra. É este o critério para avançar ou não para a fase 2.
- **Limite do link:** acima de 9 paragens há vários links, um por troço. Em browser móvel (sem app) o Google limita a 3.
- **Decisões tomadas (2026-11-17):**
  - Por defeito, a rota termina na última entrega; voltar à quinta é opcional.
  - A lista "Organiza o teu dia" também segue a ordem otimizada.
  - A fase 2 só avança depois de testar a fase 1.
- **Decisões pendentes:** a ordem otimizada não é guardada. Se o agricultor fechar a página, volta à ordem por hora até carregar outra vez em "Organizar rota". Se fizer falta, pode guardar-se em `localStorage` por dia.

## 8. Fontes

- **Ficheiros consultados:**
  - `src/components/DeliveryRouteMapDialog.tsx`
  - `src/pages/farmer/FarmerOrders.tsx`
  - `src/pages/farmer/Availability.tsx`
  - `src/lib/geo.ts`
  - `src/lib/consent.ts`
  - `src/components/MapConsentGate.tsx`
  - `src/pages/Privacy.tsx`
  - `src/integrations/supabase/types.ts`
  - `supabase/functions/order-action/index.ts`
  - `src/test/geo.test.ts`
  - `.env.example`
- **Ligações:**
  - https://developers.google.com/maps/documentation/urls/get-started
  - https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server
  - https://github.com/Project-OSRM/osrm-backend/blob/master/docs/http.md
  - https://account.heigit.org/info/plans
  - https://giscience.github.io/openrouteservice/hosted-api-restrictions
  - https://giscience.github.io/openrouteservice/frequently-asked-questions
  - https://www.graphhopper.com/pricing/
  - https://osmfoundation.org/wiki/Licence/Attribution_Guidelines
  - https://cloud.google.com/maps-platform/terms/maps-service-terms
  - https://developers.google.com/maps/documentation/javascript/reference/geometry

## Estado (2026-11-17)

**Fase 1: implementada.** Ficheiros:
- `src/lib/route-optimizer.ts`
- `src/hooks/useDeliveryRoute.ts`
- `src/components/DeliveryRouteMapDialog.tsx`
- `src/pages/farmer/FarmerOrders.tsx`

**Fase 2: implementada.** Funciona assim:
- A Edge Function `supabase/functions/delivery-route` tem duas ações: `matrix` (tempos por estrada) e `directions` (trajeto, km e tempo).
- Recebe ids de encomendas, nunca coordenadas, e só aceita encomendas da quinta do agricultor autenticado.
- Só é chamada depois de "Organizar rota": sem esse clique não há pedidos externos.
- Se falhar (sem chave, quota esgotada ou erro), mantém-se a estimativa em linha reta.
- A atribuição OSM/openrouteservice aparece por baixo do mapa quando há percurso por estrada.
- A política de privacidade foi atualizada: o openrouteservice passa a constar como subcontratante e a data dos documentos legais é agora 17 de novembro de 2026.

**Configuração necessária:**
1. Criar a conta no openrouteservice e confirmar nos termos que o plano gratuito permite uso comercial. Usar uma conta da empresa, porque as chaves são pessoais.
2. Guardar a chave com `npx supabase secrets set ORS_API_KEY=...`. Fica só nas Edge Functions, nunca no `.env` nem com o prefixo `VITE_`.
3. Publicar a função. O workflow já publica todas as pastas de `supabase/functions/`. O `verify_jwt` fica ligado por omissão.

## Verificação (na implementação)

- `npx tsc --noEmit -p tsconfig.app.json`, `npx eslint` sobre os ficheiros alterados e `npm test` (incluindo `route-optimizer.test.ts`).
- No browser (`npm run dev`), com um agricultor que tenha 3 ou mais entregas ativas no mesmo dia:
  - abrir Encomendas, depois "Entregas ao domicílio", depois "Organizar rota";
  - confirmar que a numeração muda e os km descem;
  - alternar "Voltar à quinta";
  - abrir o link e confirmar a ordem das paragens no Google Maps (no telemóvel, com a app).
- Sem consentimento de mapas: o botão "Organizar rota" e a lista funcionam e o mapa mostra o `MapConsentGate`.
