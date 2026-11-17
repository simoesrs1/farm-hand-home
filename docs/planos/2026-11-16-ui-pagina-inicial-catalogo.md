# Plano de UI: página inicial e catálogo com identidade de "mercado vibrante"

- **Data:** 2026-11-16
- **Pedido original:** "quero melhorar o catálogo e a página inicial. Quero dar-lhes um ar mais "profissional" e não que foi tão feito por AI. Pretendo ter algo mais chamativo e que me destaque da concorrência"
- **Projeto e stack:** React 18.3 + Vite 5 + TypeScript · shadcn/ui (Radix) · Tailwind 3.4 com tokens HSL em `src/index.css` · animação existente: `tailwindcss-animate` e keyframes próprios (`fade-in`, `reviews-marquee`); GSAP não instalado
- **Profundidade da pesquisa:** normal (2 subagentes: código de UI; concorrentes, referências e GSAP)
- **Análise no browser:** feita em desktop (`http://localhost:4200`, viewport efetivo de cerca de 1536×735). **Telemóvel por confirmar:** o `resize_window` para 390px não teve efeito (janela maximizada); a análise de telemóvel foi feita só a partir dos breakpoints do código. A base de dados local não tem produtos nem agricultores em destaque, por isso os cartões de produto e de agricultor só foram vistos no código.

## 1. Contexto e objetivo

O Ruben quer que a página inicial e o catálogo deixem de parecer um modelo gerado por IA, com um aspeto mais profissional, mais chamativo e diferente da concorrência.

Respostas da clarificação:
- **Sensação:** "mercado vibrante": cores fortes e sazonais, personalidade, movimento, mais jovem.
- **Identidade:** pode mudar tudo (tipografia, paleta, tom dos textos).
- **Foco:** identidade, layout e animação (GSAP).

Público: clientes portugueses que querem comprar diretamente a produtores locais (levantar na quinta ou receber em casa). Secundariamente, agricultores que avaliam se querem vender na plataforma.

A marca no código é **ValorRural** (`index.html:7`, `src/components/Header.tsx:31`, `src/components/Footer.tsx:15`), e não FarmConnect como diz o `CLAUDE.md`.

## 2. Âmbito

**Páginas e fluxos incluídos:**
- `/` (`src/pages/Index.tsx`, `HeroSection`, `FeaturedFarmers`, `FarmerCard`)
- `/catalogo` (`src/pages/Catalog.tsx`)
- `/catalogo/:slug` (`src/pages/CategoryPage.tsx`), incluindo o cartão de produto
- Tokens globais (`src/index.css`, `tailwind.config.ts`), porque a nova identidade se aplica ao site inteiro
- `Header.tsx` e `Footer.tsx`, só no estilo e nos textos, porque são o enquadramento das duas páginas

**Fica de fora:**
- Área do agricultor (`/agricultor/...`), carrinho, checkout, perfil e páginas legais. Recebem os novos tokens automaticamente, mas não são redesenhadas.
- Logótipo novo: precisa de designer. Fica como questão em aberto (secção 9).
- Sessão fotográfica ou ilustrações encomendadas: o plano prepara os componentes, mas a produção do conteúdo é do Ruben.
- `/resultados` (`SearchResults.tsx`): só herda o `ProductCard` unificado da fase 3.

## 3. Estado atual

### Stack visual
- **Tokens do tema:** paleta shadcn em HSL em `src/index.css:9-96`, com verde-floresta primário (`152 45% 28%`), mostarda de acento (`35 72% 52%`) e fundo creme. São usados na maioria do JSX, mas há cores fixas:
  - `from-black/50 text-white` em `Catalog.tsx:29-30`;
  - `from-black/60 text-white` em `CategoryPage.tsx:258-259`;
  - hex no InfoWindow em `PortugalMapDialog.tsx:68-69`, que é exceção aceite por ser Google Maps.

  Os tokens `earth-*` e `leaf` estão quase sem uso.
- **Tipografia:** Playfair Display e DM Sans (`tailwind.config.ts:16-19`), carregadas por `@import` que bloqueia a renderização (`index.css:1`). Os títulos levam `font-display` globalmente (`index.css:108-110`), o que põe Playfair até nos `h4` pequenos do rodapé.
- **Raios e espaçamentos inconsistentes:** `rounded-xl`, `rounded-2xl` e `rounded-lg`; `py-12` contra `py-16 md:py-24`; gaps de 5, 6 e 8.
- **Animações existentes:**
  - `animate-fade-in` escalonado no hero (`HeroSection.tsx:41-50`). Tem um bug: com `forwards` e atraso, os elementos piscam antes do fade.
  - Hovers em CSS: `-translate-y`, imagem `scale-105`.
  - Marquee de avaliações em CSS (`FarmerReviewsBar.tsx:133`).
  - `prefers-reduced-motion` só no `FarmerReviewsBar`.

### Observações por página
| Página | Desktop | Telemóvel | Pontos fortes | Problemas |
|---|---|---|---|---|
| `/` | Hero com foto de stock de vinha, título serifado centrado, cartão de pesquisa em vidro. Depois, 3 ícones centrados e o rodapé. A página acaba em cerca de 1,5 ecrãs. "Agricultores em destaque" não aparece com a base de dados local (`return null` em `FeaturedFarmers.tsx:81`). A faixa de cookies tapa metade do hero na primeira visita. | Por confirmar no browser. Pelo código: hero `py-24`, campos de pesquisa em coluna (`md:flex-row`), ícones numa coluna. | Pesquisa por localização e raio é útil e diferenciadora; o separador por nome de quinta também. | Fórmula típica de IA: hero com gradiente, título clichê "Do campo para a sua mesa, sem intermediários", 3 ícones `bg-primary/10`. Sem produtos, categorias, preços, rostos nem prova social. Mistura "Descubra" (você) com "Apoia" (tu) (`HeroSection.tsx:45`). Gralha "comunidade.." (`Index.tsx:19`). Ícone `Truck` em "Proximidade Real". O mapa usa 7 quintas inventadas (`src/data/farmers.ts`). |
| `/catalogo` | Título "Catálogo", subtítulo genérico, grelha 4×6 de 22 mosaicos iguais com foto e nome. Hover quase impercetível. | Por confirmar. Pelo código: 2 colunas, `h-32`. | Cobertura de categorias completa, imagens com `loading="lazy"`. | Muro uniforme sem hierarquia: tudo pesa o mesmo e não há destaque sazonal. Mistura fotos locais 4:3 com Unsplash 3:2. Fotos que contradizem a marca: prateleira de supermercado em "Outros produtos", batatas fritas em "Salgados". Não mostra quantos produtos há em cada categoria, por isso categorias vazias parecem iguais às cheias. Sem pesquisa nem filtros. |
| `/catalogo/:slug` | Faixa com foto e título, contador, `Select` de ordenação, grelha de cartões. Com a base de dados local: "0 produtos" e "Ainda não há produtos nesta categoria." | Por confirmar. Grelha numa só coluna (`sm:grid-cols-2`), ao contrário do catálogo, que usa 2. | Ordenação com explicação ("Como ordenamos?"), selos de recolha e de poupança. | Durante o carregamento mostra logo o estado vazio (`items` começa em `[]`, sem skeleton). Sem filtros (Biológico é opção de ordenação). "Melhor avaliação" ordena por `initial_score` e "Mais vendidos" pelo menor stock (`CategoryPage.tsx:226-230`). Cartão duplicado em `SearchResults.tsx`. O cartão é um `div onClick` sem acesso por teclado. Mostra "(? dias)" quando `shipping_days` é nulo. |

## 4. Referências analisadas

Os concorrentes portugueses foram analisados pelo código e pelo texto das páginas, sem os abrir no Chrome. Animações por confirmar visualmente.

| Site | O que faz bem | O que aproveitar | Como fazer com GSAP | Ligação |
|---|---|---|---|---|
| PROVE (concorrente) | Modelo de cabaz claro, receitas, lista de produtores. | Pouco no visual: menu com mais de 20 ligações, 6 famílias de fontes, hero só com título e vídeo. Destacamo-nos com um único botão principal e produtos e preços no primeiro ecrã. | — | [prove.com.pt](https://www.prove.com.pt) |
| Quinta do Arneiro (concorrente) | "Como funciona" em 3 passos concretos, cabaz da semana, tom humano, mistura de produto com experiências. | Passos concretos e frases com voz própria. Integrar experiências e alojamento como parte da marca. | Passos numerados com `ScrollTrigger` e `stagger`. | [quintadoarneiro.pt](https://quintadoarneiro.pt) |
| CrowdFarming (concorrente europeu) | Faixa sazonal no topo ("Start of the clementine season"), 2 botões grandes no hero, contadores de impacto, cartões com preço/kg. | Faixa "Da época". Contadores reais (agricultores, produtos). Preço por unidade claro. O nome do agricultor e a distância no cartão são o que nos distingue. | Contadores com tween sobre `{ val: 0 }` e `snap` com `ScrollTrigger once`. | [crowdfarming.com](https://www.crowdfarming.com) |
| Graza | Paleta de cores fortes (lima, amarelo, verde) sobre creme, crachás de carácter nos cartões, botão "Pause animations". | Crachás de carácter nos produtos ("Acabado de colher", "Da época"). Botão para pausar animações. Contornos escuros em botões coloridos. | Crachá que roda e salta: `gsap.to(badge, { rotate: -8, scale: 1.08, ease: "back.out(3)" })` com `contextSafe`. | [graza.co](https://www.graza.co) |
| Oddbox | Serifa com mono (preços e pesos como etiqueta de mercado), secção "faces behind the fruit & veg", botões com voz própria ("Pick me"). | Fonte mono para preço e unidade. Secção de rostos dos agricultores. Botões como "Quero este". | `ScrollTrigger.batch(".farmer", { onEnter: b => gsap.from(b, { y: 40, autoAlpha: 0, stagger: 0.08 }) })` | [oddbox.co.uk](https://www.oddbox.co.uk) |
| Fishwife | Embalagens ilustradas como arte, carrossel com pausa, secção sobre os fornecedores. | Ilustração própria (ilustrador português) para categorias e épocas, em vez de banco de imagens. | Faixa contínua: `gsap.to(track, { xPercent: -50, repeat: -1, ease: "none" })`, com `Observer` a ajustar velocidade e direção ao scroll. | [eatfishwife.com](https://eatfishwife.com) |
| Misfits Market | Título com opinião ("Groceries sourced for flavor, not appearances") em grotesca a negrito. | Títulos com posição clara em vez de frases genéricas. | `SplitText` com `mask: "lines"` e `yPercent`. | [misfitsmarket.com](https://www.misfitsmarket.com) |

**Conclusão da pesquisa:** nenhum concorrente português tem identidade visual forte nem movimento. O território "mercado vibrante" está livre.

## 5. Lacunas e oportunidades

Ordenadas por impacto e esforço, com as vitórias rápidas primeiro. Esforço em tamanho relativo: S (pequeno, alterações localizadas), M (médio, componente novo ou várias partes de uma página), L (grande, várias secções novas com dados novos).

| # | Melhoria | Página | Impacto | Esforço | Tipo |
|---|---|---|---|---|---|
| 1 | Corrigir textos: "comunidade..", "Descubra… Apoia", gerúndio do rodapé ("Conectando"), "(? dias)", ícone `Truck` | `/`, rodapé, categoria | Médio | S | identidade |
| 2 | Skeleton no carregamento da categoria, em vez do falso "0 produtos" | `/catalogo/:slug` | Alto | S | layout |
| 3 | Contraste do sobretítulo "Destaques" (cerca de 2,3:1) e da sobreposição do texto branco nas fotos | `/`, `/catalogo` | Médio | S | identidade |
| 4 | Nova paleta e tipografia nos tokens (`index.css`, `tailwind.config.ts`), fontes com `<link preconnect>` | todas | Muito alto | M | identidade |
| 5 | Componentes partilhados: `SectionHeading`, `ProductCard`, selos unificados sobre `ui/badge.tsx` | `/`, categoria, resultados | Alto | M | layout |
| 6 | Hero novo: título com opinião, produtos e preços reais visíveis, pesquisa mais compacta, entrada com `SplitText` | `/` | Muito alto | M | layout / animação |
| 7 | Página inicial com mais conteúdo real: "Da época" (faixa contínua), categorias com contagem, rostos dos agricultores, "Como funciona", experiências na quinta, apelo aos agricultores | `/` | Muito alto | L | layout |
| 8 | Catálogo em mosaico com hierarquia: categorias da época em destaque, contagem de produtos, pesquisa e chips de filtro animados com `Flip` | `/catalogo` | Alto | M | layout / animação |
| 9 | Filtros reais (Biológico, Sem lactose, Promoção, Levantar na quinta / Entrega) com `Flip`, ordenações com etiquetas honestas | `/catalogo/:slug` | Alto | M | layout / animação |
| 10 | Animação "voar para o cesto" ao adicionar e salto no contador do carrinho | categoria, resultados | Médio | S | animação |
| 11 | Mapa da página inicial com agricultores reais (`public_farmer_profiles.pickup_lat/lng`), em vez de `src/data/farmers.ts` | `/` | Alto | M | layout |
| 12 | Imagens coerentes: proporção fixa (`aspect-[4/3]`), um só estilo de fotografia ou ilustração, sem Unsplash genérico; trocar as fotos de "Outros produtos" e "Salgados" | `/catalogo`, categoria | Alto | M (código) + conteúdo | identidade |
| 13 | Botão "Pausar animações" no rodapé, à semelhança da Graza | todas | Baixo | S | animação / acessibilidade |

## 6. Opções e recomendação

As três direções de identidade têm todos os pares principais verificados para contraste AA. Os valores estão em hex; ao implementar, convertem-se para os tokens HSL de `index.css`.

| Opção | Descrição | Prós | Contras |
|---|---|---|---|
| A: "Feira de verão" | Bricolage Grotesque (títulos) e Instrument Sans (texto). Tinta `#1C1A17`, papel `#FFF4E2`, tomate `#C8321E`, girassol `#FFC93C`, coral `#F25C3B`, couve `#14532D`. | Muito quente e alimentar. A grotesca larga dá ar jovem. Mantém um verde (couve) para continuidade. | Vermelho e amarelo são frequentes em mercearias e em fast food. Distingue-se menos. |
| B: "Azulejo e citrinos" | Young Serif (títulos) e Schibsted Grotesk (texto). Marinho `#14213D` (≈ `221 51% 16%`), creme `#FFF6E5` (≈ `39 100% 95%`), cobalto `#1F3FBF` (≈ `228 72% 44%`), laranja `#FF8A2A` (≈ `27 100% 58%`), terracota `#B4480E` (≈ `21 86% 38%`), rosa `#F7D7E4` (≈ `336 67% 91%`). | Claramente portuguesa (azulejo, laranjas do Algarve, barro) sem cair no rústico. Nenhum concorrente usa azul. A serifa "gorda" é calorosa e a grotesca é profissional. O acento muda com a estação. | Afasta-se mais da identidade atual (verde). O logótipo atual, verde e ilustrado, vai destoar até ser redesenhado. |
| C: "Cartaz de mercado" | Archivo Expanded Black (cartazes), Atkinson Hyperlegible Next (texto), Azeret Mono (preços). Preto `#1B1B1B`, cal `#F3F0E6`, beringela `#6B2FB3`, lima `#C6F04A`, pink `#FF6FA8`, oliveira `#2E6B1F`. | A mais ousada e memorável. A mono nos preços dá ar de etiqueta de mercado. Ótima legibilidade. | Risco de parecer marca de bebidas energéticas ou de moda. Pode afastar o público mais velho e os agricultores. |

**Recomendação: opção B, "Azulejo e citrinos"**, com dois elementos da C: **Azeret Mono para preços e unidades** e crachás de carácter. Justificação:
- liga a marca a Portugal, ao contrário do look genérico verde e creme;
- é vibrante sem perder confiança, o que importa para quem paga a um produtor que não conhece;
- é a direção que mais se afasta dos concorrentes (PROVE, Arneiro e CrowdFarming usam verde e terra);
- o `--accent` pode trocar por estação (laranja no outono e inverno, cobalto ou rosa na primavera, amarelo no verão), o que reforça a faixa "Da época".

Regra fixa: nunca texto branco sobre laranja, rosa ou lima (contraste abaixo de 3:1). Sobre essas cores, o texto é sempre marinho.

**Decisão do Ruben (2026-11-16):** paleta da **opção A** ("Feira de verão") com a **tipografia da opção B** (Young Serif, Schibsted Grotesk, Azeret Mono). O logótipo fica como está por agora. Notas da implementação:
- O tomate ficou ligeiramente mais escuro (`7 74% 42%` em vez de `#C8321E`) para passar AA também sobre `--muted`.
- O `--accent` do shadcn (fundo ao passar o rato) passou a girassol claro; o girassol forte é o token novo `--highlight`. Tokens novos: `--highlight`, `--coral`, `--kale`.
- O girassol e o coral nunca são cor de texto. Estrelas: girassol com contorno coral. Stock disponível: couve.
- A Young Serif só tem peso 400: os títulos usam `font-synthesis: none`.
- Comparação visual das opções: artefacto "Paletas ValorRural" (privado).

**Exceções ao GSAP:**
- Hover, focus e mudanças de cor em botões, ligações e cartões ficam em Tailwind (`transition-colors`, `transition-transform`), por serem triviais de estado. Também passam a respeitar `motion-reduce:`.
- A abertura e o fecho de `Dialog`, `Select`, `Sheet` e `Tabs` (Radix/shadcn) não se reescrevem.
- O marquee de avaliações (`FarmerReviewsBar.tsx`) fica em CSS nesta fase, por estar fora do âmbito e já respeitar `motion-reduce`. Se a faixa "Da época" ficar em GSAP, pode migrar-se depois para uniformizar.

## 7. Plano por fases

A forma de tratamento da interface mantém-se em **"você"** ("Descubra", "a sua mesa", "Explore"), que é a forma dominante em `/` e em `/catalogo`.

### Fase 0: Vitórias rápidas (sem dependências novas)
| Ficheiro / componente | Alteração | Esforço |
|---|---|---|
| `src/pages/Index.tsx` | Corrigir "comunidade..", trocar o ícone `Truck` por `MapPin` em "Proximidade Real" | S |
| `src/components/HeroSection.tsx` | "Apoia" → "Apoie". Ligar os `label` aos inputs (`htmlFor`/`id`), `aria-label` no `Slider`, usar `ui/input.tsx` | S |
| `src/components/Footer.tsx` | "Conectando consumidores…" → "Ligamos consumidores a agricultores locais, com transparência e confiança." O telefone "+351 912 345 678" é fictício e fica como está (decisão do Ruben). | S |
| `src/pages/CategoryPage.tsx` | Estado `loading` com grelha de `Skeleton` com a mesma altura dos cartões. Erro com `toast`. Não mostrar "(? dias)" quando `shipping_days` é nulo. Usar `low_stock_threshold` em vez de `<= 5`. Retirar `as any` em `pickup_hours`. | S |
| `src/components/FeaturedFarmers.tsx` | Sobretítulo com contraste AA. Número de skeletons igual ao `limit` (6). | S |
| `index.html` / `src/index.css` | Substituir o `@import` das fontes por `<link rel="preconnect">` e `<link rel="stylesheet">` no `index.html` | S |

### Fase 1: Identidade e base de animação

**Estado (2026-11-16):** feita, dividida em 1a (tokens, cores e fontes), 1b (base GSAP, entrada do hero, botão "Pausar animações") e 1c (`ProductCard`, `SectionHeading`, variantes do `Badge`). Fase 0 também feita. Ainda sem commit; à espera da revisão do Ruben.

Estados positivos, avisos e informação: resolvido com os tokens `success`, `warning` e `info` (decisão do Ruben, 2026-11-16). Tema e `PageHeader` aplicados a todo o site.

**Fases 2 e 3 (2026-11-16):** feitas. Página inicial com hero e colagem de produtos, faixa "Da época", mosaico de categorias, "Quem cultiva", "Como funciona", carrossel de experiências, contadores (escondidos abaixo dos mínimos) e apelo aos agricultores; mapa com agricultores reais. Catálogo com mosaico, pesquisa e chips (Flip); categoria com filtros, ordenações reais (avaliação média do agricultor; "Mais vendidos" pela função `product_sales_counts`, migração `20261116120000_product_sales_ranking.sql` por aplicar) e "voar para o cesto". Imagens de "Outros produtos" (cestos numa banca) e "Salgados" (croquetes) trocadas por fotos Unsplash escolhidas pelo Ruben.
- **Instalar o GSAP:** `npm i gsap @gsap/react` (versões atuais: `gsap` 3.15.1 e `@gsap/react` 2.1.2). Licença "Standard no-charge": uso comercial gratuito, incluindo SplitText, ScrollTrigger e Flip.
- **Criar `src/lib/animation.ts`:**
  - regista os plugins uma só vez com `gsap.registerPlugin(useGSAP, ScrollTrigger, Flip, SplitText, Observer)`;
  - define as predefinições com `gsap.defaults({ ease: "power3.out", duration: 0.7 })`;
  - exporta as animações reutilizáveis `fadeUp(targets)`, `staggerIn(targets)`, `splitHeading(el)` e `counter(el, value)`.
- **Criar `src/hooks/useReducedMotion.ts`**, ou integrar no mesmo módulo:
  - todas as animações correm dentro de `gsap.matchMedia()`;
  - com `(prefers-reduced-motion: reduce)` ficam só fades curtos ou nenhuma animação;
  - inclui um interruptor manual (botão "Pausar animações" no rodapé), guardado em `localStorage`, que chama `gsap.matchMediaRefresh()`.
- **Tokens (`src/index.css`, `tailwind.config.ts`):**
  - nova paleta da opção B em HSL, no claro e no escuro;
  - `--accent` sazonal;
  - tokens novos `--citrus`, `--tile` e `--blush` para os crachás;
  - fontes `display` (Young Serif), `sans` (Schibsted Grotesk) e `mono` (Azeret Mono);
  - rever `--radius`;
  - limitar o `font-display` global aos `h1`–`h2` (os `h3`/`h4` pequenos passam a sans).
- **Componentes partilhados:**
  - `src/components/SectionHeading.tsx`: sobretítulo, título e texto, com alinhamento à esquerda ou ao centro;
  - `src/components/ProductCard.tsx`: substitui as cópias de `CategoryPage.tsx:306-375` e `SearchResults.tsx:206-260`. Leva `aspect-[4/3]`, preço em mono, agricultor e distância, crachás, um `Link` acessível e botão "Adicionar";
  - variantes em `src/components/ui/badge.tsx` (`season`, `organic`, `pickup`, `discount`) para substituir os 5 estilos de pílula.
- **Hero:** retirar `animate-fade-in` e `animationDelay` do hero, que passam para GSAP. Isto corrige o pisco.

### Fase 2: Página inicial
| Ficheiro / componente | Alteração | Técnica GSAP | Esforço |
|---|---|---|---|
| `src/components/HeroSection.tsx` | Layout assimétrico. À esquerda, título com opinião (proposta: "Fruta com nome e apelido. Do produtor a 20 km de si.") e a pesquisa por localização/quinta (os separadores atuais, mais compactos). À direita, uma colagem de 3 ou 4 produtos reais do momento, com crachás de preço em mono a rodar. Imagem de fundo de stock substituída por cor e fotografia de produto. | `timeline`: `SplitText` (`mask: "lines"`, `yPercent`, sem `autoAlpha` no H1, para não prejudicar o LCP), depois entrada da colagem com `stagger` e crachás com `back.out` | M |
| `src/components/SeasonalStrip.tsx` (novo) | Faixa contínua "Da época · novembro": produtos com `availability_start/end` dentro do mês, a partir de `products`. | `gsap.to(track, { xPercent: -50, repeat: -1, ease: "none" })` mais `Observer` para acelerar com o scroll. Pausa ao passar o rato ou com o foco. Desligada com movimento reduzido. | M |
| `src/components/CategoryShowcase.tsx` (novo) | 6 a 8 categorias com mais produtos, em mosaico de tamanhos diferentes, com contagem ("34 produtos"). Botão "Ver catálogo completo". | `ScrollTrigger.batch` com `stagger` | M |
| `src/components/FeaturedFarmers.tsx` + `FarmerCard.tsx` | "Quem cultiva": cartões tipo retrato com nome, localidade, nível de atividade (`farmer_activity.level`, **RLS por confirmar**) e categorias. Se não houver destaques, mostrar um estado vazio com mensagem em vez de `return null`. Retirar as estrelas sempre a 0 ou ligá-las a `farmer_reviews`. | `ScrollTrigger.batch` | M |
| `src/components/HowItWorks.tsx` (novo) | 3 passos concretos e numerados em grande, sem ícones genéricos: "Escolha perto de si", "Encomende à quinta", "Levante ou receba em casa". Substitui a grelha de 3 ícones de `Index.tsx:5-41`. | `ScrollTrigger` com `scrub` leve nos números e `stagger` nos passos | S |
| `src/components/FarmExperiencesRail.tsx` (novo) | "Visite a quinta": carrossel de `farm_experiences` e `farm_stays`. | `Draggable` com `inertia`, ou o `embla-carousel-react` já instalado com entrada em GSAP (decidir na implementação) | M |
| `src/components/ImpactCounters.tsx` (novo) | Contadores reais: agricultores ativos, produtos disponíveis, avaliações (`count` no Supabase). Só aparecem acima de um mínimo, para não mostrar "3 agricultores". | Tween sobre `{ val: 0 }` com `snap`, `ScrollTrigger once` | S |
| `src/components/FarmerCta.tsx` (novo) | Faixa "É agricultor? Venda sem intermediários" com ligação ao registo de agricultor. | `fadeUp` | S |
| `src/components/PortugalMapDialog.tsx` | Usar `public_farmer_profiles` (`pickup_lat`, `pickup_lng`) em vez de `src/data/farmers.ts`. Construir o InfoWindow com nós DOM ou com texto escapado (evita XSS com dados reais). | — | M |
| `src/pages/Index.tsx` | Nova ordem: Hero → Da época → Categorias → Quem cultiva → Como funciona → Visite a quinta → Contadores → Apelo aos agricultores | — | S |

### Fase 3: Catálogo e categoria
| Ficheiro / componente | Alteração | Técnica GSAP | Esforço |
|---|---|---|---|
| `src/pages/Catalog.tsx` | Cabeçalho com título com voz própria, pesquisa de produtos e chips "Da época", "Biológico", "Promoções". Mosaico com hierarquia: as categorias da época e as com mais produtos em tamanho maior; as vazias em tamanho menor e com "Brevemente". Contagem por categoria (uma query agregada a `products`). Sobreposição de texto com token de cor (`from-foreground/70`) em vez de `black`. | `Flip.getState` / `Flip.from` ao filtrar com os chips; entrada com `ScrollTrigger.batch` | M |
| `src/data/categories.ts` | Proporção uniforme, sem Unsplash genérico. Substituir pelo menos "Outros produtos" (prateleira de supermercado) e "Salgados" (batatas fritas). Opção: ilustração por categoria (questão em aberto). | — | S (código) |
| `src/pages/CategoryPage.tsx` | Usa o `ProductCard`. Barra de filtros (Biológico, Sem lactose, Promoção, Levantar na quinta, Entrega). "Biológico" sai da ordenação. Ordenações com etiquetas honestas: retirar "Mais vendidos" e "Melhor avaliação" até haver dados reais. Grelha de 2 colunas em telemóvel. Faixa da categoria com `alt=""`. | `Flip` ao filtrar e ordenar; `ScrollTrigger.batch` na entrada | M |
| `src/components/ProductCard.tsx` + `Header.tsx` | "Voar para o cesto": clone da imagem até ao ícone do carrinho e salto do contador. | Tween `x`/`y`/`scale` dentro de `contextSafe`; `back.out` no contador | S |
| `src/pages/SearchResults.tsx` | Passar a usar o `ProductCard`. | — | S |
| Imagens dos produtos | Trocar os N pedidos `createSignedUrl` por um `createSignedUrls` em lote (`CategoryPage.tsx:141-147`, `FeaturedFarmers.tsx:57-62`). `loading="lazy"` e `width`/`height` nas imagens dos cartões. | — | S |

**Esforço total, em tamanho relativo:**

| Fase | Tamanho | O que pesa mais |
|---|---|---|
| 0: vitórias rápidas | S | Alterações pequenas e localizadas |
| 1: identidade e base de animação | M | Converter a paleta em tokens (claro e escuro), criar `ProductCard`, `SectionHeading` e os selos |
| 2: página inicial | L (a maior) | 6 secções novas, várias com queries novas ao Supabase, e o mapa com dados reais |
| 3: catálogo e categoria | M | Filtros com Flip, mosaico com contagens, animação de adicionar ao cesto |

**O que determina o ritmo real:** escrever o código é a parte rápida. O tempo vai sobretudo para:
- a aprovação de cada alteração e a revisão visual no browser, com afinações;
- as decisões em aberto da secção 9: direção visual, logótipo, nome;
- os dados de exemplo na base local;
- a produção de fotografia ou ilustração, que não depende de código e pode ser o mais demorado.

## 8. Acessibilidade e desempenho

- **Contraste (WCAG 1.4.3):**
  - Todos os pares principais da opção B passam AA: marinho/creme 14,9:1; creme/cobalto 7,8:1; marinho/laranja 6,8:1; terracota/creme 5,1:1; marinho/rosa 12:1.
  - É proibido texto claro sobre laranja e rosa.
  - O texto sobre fotografias leva uma sobreposição com token que garanta 4,5:1.
  - Problema atual a corrigir: "Destaques" em `text-accent` (cerca de 2,3:1, `FeaturedFarmers.tsx:87`).
- **Movimento (`prefers-reduced-motion`, WCAG 2.3.3):**
  - Todas as animações GSAP dentro de `gsap.matchMedia()`.
  - Com movimento reduzido: sem parallax, sem faixa contínua (fica estática e com scroll horizontal), sem "voar para o cesto"; só fades curtos.
  - Botão "Pausar animações" para quem não configurou o sistema.
  - A faixa contínua pausa ao passar o rato e com o foco (WCAG 2.2.2, **por confirmar**).
  - Hovers em CSS com `motion-reduce:transform-none`.
- **Peso das dependências adicionadas:** `gsap` (núcleo, cerca de 25 KB gzip) mais ScrollTrigger, Flip, SplitText e Observer, cerca de 50 a 60 KB gzip no total (**por confirmar** com `vite build`). `@gsap/react` é mínimo. Importar os plugins só onde são usados; as páginas de agricultor não os carregam se as rotas forem divididas (`React.lazy`, que hoje não se usa: opcional). As 3 fontes novas substituem as 2 atuais, com `display=swap` e preconnect.
- **Core Web Vitals:**
  - **LCP:** o H1 entra com máscara e `yPercent`, nunca com `opacity: 0`, porque elementos invisíveis não contam para o LCP. A imagem principal do hero (se houver) com `fetchpriority="high"` e sem lazy. Fontes com preconnect. Hoje `hero-farm.jpg` tem 363 KB, sem WebP nem `srcset`: converter ou retirar.
  - **CLS:** `aspect-ratio` fixo nas imagens dos cartões; skeletons com a altura final; `SplitText` com `autoSplit`; animar só `transform` e `opacity`; contadores com largura reservada (`tabular-nums`).
  - **INP:** em `Flip`, ler o estado antes do `setState`; `ScrollTrigger.batch` em vez de um trigger por cartão; parallax desligado em telemóvel; `ScrollTrigger.refresh()` depois de o TanStack Query carregar dados.

## 9. Riscos e questões em aberto

1. **Direção de identidade:** recomendo a B ("Azulejo e citrinos"), mas a decisão é tua, Ruben. Posso fazer uma maqueta rápida das três (só tokens e hero) antes de decidir.
2. **Logótipo:** o atual (ilustração verde) não combina com a nova paleta. Encomendar a um designer, ou fazer um logótipo tipográfico provisório em Young Serif?
3. **Fotografia e ilustração:** o maior salto de "não parece IA" vem de imagens próprias (produtores reais, produtos reais). Há fotos dos agricultores? A vista `public_farmer_profiles` não tem campo de foto do agricultor: seria preciso migração e upload.
4. **Nome:** o `CLAUDE.md` diz "FarmConnect" e o site diz "ValorRural". Qual é o definitivo? A tagline "A Tua Conexão Direta com a Quinta" usa "tu" e "conexão" (soa a brasileirismo): proponho rever.
5. **Dados de teste:** a base de dados local não tem produtos nem agricultores em destaque. Para validar o design no browser, é preciso um seed de exemplo (`supabase/seed.sql` ou equivalente).
6. **RLS:** confirmar se `farmer_activity` e `farm_experiences`/`farm_stays` podem ser lidos sem sessão, antes de os usar na página inicial.
7. **Mapa com dados reais:** mudar `PortugalMapDialog` para a base de dados expõe as coordenadas de recolha. Confirmar que é intencional (a vista já as expõe hoje).
8. **Telemóvel:** a análise visual a 390px ficou por fazer. Repetir no browser antes da fase 2.
9. **Etiquetas de ordenação enganadoras** ("Mais vendidos", "Melhor avaliação"): retirar ou implementar com dados reais (vendas e médias de `farmer_reviews`)?

## 10. Fontes

- **Ficheiros consultados:**
  - Páginas: `src/pages/Index.tsx`, `src/pages/Catalog.tsx`, `src/pages/CategoryPage.tsx`, `src/pages/SearchResults.tsx`.
  - Componentes: `src/components/HeroSection.tsx`, `src/components/FeaturedFarmers.tsx`, `src/components/FarmerCard.tsx`, `src/components/Header.tsx`, `src/components/Footer.tsx`, `src/components/PortugalMapDialog.tsx`, `src/components/MapConsentGate.tsx`, `src/components/PickupAvailabilityBadge.tsx`, `src/components/SavingsBadge.tsx`, `src/components/FarmerReviewsBar.tsx`.
  - Dados: `src/data/categories.ts`, `src/data/category-list.ts`, `src/data/farmers.ts`.
  - Outros: `src/hooks/useMarketPrices.ts`, `src/integrations/supabase/types.ts`.
  - Configuração e estilos: `src/index.css`, `tailwind.config.ts`, `index.html`, `package.json`, `vite.config.ts`.
- **Ligações:**
  - Concorrentes: [PROVE](https://www.prove.com.pt), [Quinta do Arneiro](https://quintadoarneiro.pt), [CrowdFarming](https://www.crowdfarming.com), [Euronews sobre CrowdFarming](https://parsi.euronews.com/2026/06/05/crowd-farming-the-platform-that-wants-to-feed-europe-better).
  - Referências de design: [Graza](https://www.graza.co), [Oddbox](https://www.oddbox.co.uk), [Fishwife](https://eatfishwife.com), [Misfits Market](https://www.misfitsmarket.com), [More Nutrition no Awwwards](https://www.awwwards.com/more-nutrition-you-deserve-more.html).
  - GSAP:
    - [Licença](https://gsap.com/standard-license)
    - [GSAP 3.13](https://gsap.com/blog/3-13/)
    - [React e useGSAP](https://gsap.com/resources/React/)
    - [gsap.matchMedia](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/)
    - [ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/)
    - [Erros comuns do ScrollTrigger](https://gsap.com/resources/st-mistakes/)
    - [SplitText](https://gsap.com/docs/v3/Plugins/SplitText/)
    - [Flip](https://gsap.com/docs/v3/Plugins/Flip/)
    - [Observer](https://gsap.com/docs/v3/Plugins/Observer/)
    - [Draggable](https://gsap.com/docs/v3/Plugins/Draggable/)
  - Acessibilidade e desempenho: [WCAG 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [WCAG 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html), [LCP](https://web.dev/articles/lcp), [CLS](https://web.dev/articles/cls), [INP](https://web.dev/articles/inp).
