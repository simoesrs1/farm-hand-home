# Sistema de atividade dos agricultores

> Estado: implementado, por publicar · Última atualização: 3 de outubro de 2026

## Porquê

Uma loja parada prejudica toda a gente: os clientes encontram stock desatualizado e não recebem resposta, e as encomendas expiram ou são canceladas. O objetivo deste sistema é estimular os agricultores a manter a loja viva:

- stock atualizado;
- encomendas aceites depressa;
- clientes respondidos no chat.

O princípio é **só incentivos**. Ninguém é penalizado, suspenso nem ocultado por estar parado. Quem está ativo ganha visibilidade; quem está parado recebe lembretes com ações concretas para voltar.

## Decisões tomadas

| Tema | Escolha | Alternativas postas de parte |
|---|---|---|
| Abordagem | Só incentivos | Penalização gradual; ocultação após um prazo |
| O que conta como atividade | Atualizar produtos e stock, responder a encomendas, responder no chat | Iniciar sessão (sinal fraco) |
| Pausa | Pausa voluntária **e** isenção automática quando nada está na época | Só uma das duas; nenhuma |
| Incentivos | Melhor posição no catálogo, destaque na página inicial | Selos públicos, redução de comissão (ficam para depois) |
| Onde o agricultor vê a sua atividade | Cartão no topo da página de vendas, que já existia | Página própria; nada visível |
| Canais dos lembretes | Notificações na app já; email preparado mas sem fornecedor escolhido | Email imediato; SMS/WhatsApp |

## Como funciona

### Pontuação de atividade (0–100)

A pontuação é calculada **todos os dias** sobre os **últimos 30 dias**. Usa apenas dados que a plataforma já regista:

| Componente | Peso | O que mede |
|---|---|---|
| Catálogo e stock | 40% | Dias desde a última alteração ao catálogo feita pelo próprio agricultor: máximo até 7 dias, zero a partir de 45. Inclui também a percentagem de produtos ativos com stock. As vendas automáticas não contam. |
| Encomendas | 40% | Tempo mediano até aceitar uma encomenda: máximo até 2 h, zero a partir de 48 h. Inclui também a percentagem de encomendas **não** canceladas por falta de stock. |
| Chat | 20% | Percentagem de mensagens de clientes respondidas em menos de 24 h. |

**Uma componente sem dados não penaliza.** Um agricultor que não teve encomendas no período não perde pontos por isso, porque não controla a procura. O peso dessa componente é redistribuído pelas restantes.

### Níveis

O nível só é visível para o próprio agricultor e serve de meta:

| Nível | Pontuação |
|---|---|
| Semente | 0–39 |
| Rebento | 40–69 |
| Colheita | 70–89 |
| Pomar | 90–100 |

Também se conta uma **sequência de semanas seguidas** com pelo menos uma ação (atualizar um produto ou aceitar uma encomenda).

### Incentivos

1. **Posição no catálogo.** A ordenação predefinida, "Relevância", soma a pontuação de atividade (0–100) aos pontos de certificados da exploração (10 por certificado, até 50). Aplica-se às páginas de categoria e à pesquisa. O cliente pode sempre escolher outra ordenação.
2. **Destaque na página inicial.** A secção "Agricultores em destaque" mostra os 6 agricultores com maior soma, desde que cumpram tudo isto:
   - estão verificados;
   - não estão em pausa;
   - têm produtos à venda nesse dia;
   - têm **pelo menos 40 pontos de atividade**.

   Esta secção substitui os dados fictícios que lá estavam.

> **Porquê o mínimo de 40?** Nos testes, um agricultor parado (22 pontos) entrava nos destaques só por ter 50 pontos de certificados, à frente de agricultores ativos. Os certificados sozinhos não devem chegar para destacar alguém numa secção que promete "os mais ativos".

### Pausa e época

Há duas situações em que o agricultor fica isento. Nesses casos a **pontuação fica congelada** no último valor e **não há lembretes**:

- **Pausa voluntária** (férias, entressafra). Ativa-se na página *Disponibilidade*, com uma data de regresso (até 6 meses) e uma mensagem opcional para os clientes. Durante a pausa:
  - os produtos ficam ocultos;
  - não é possível encomendar;
  - o perfil público mostra "Em pausa até…".

  Tudo volta automaticamente no dia de regresso, sem o agricultor ter de fazer nada.
- **Fora de época, automaticamente.** Acontece quando nenhum produto ativo está dentro das datas de disponibilidade de hoje.

### Lembretes

Cada agricultor recebe **no máximo 1 lembrete por semana**: o mais relevante no momento, por esta ordem.

1. Encomenda por aceitar há mais de 12 h.
2. Mensagem de cliente sem resposta há mais de 24 h.
3. Ainda sem produtos.
4. Catálogo sem alterações há 14 dias ou mais.

Fora deste limite, o agricultor recebe também **mensagens positivas**:

- subida de nível;
- entrada nos destaques da página inicial;
- aviso de que a pausa termina amanhã.

Os lembretes chegam como notificação na app, com link direto para a ação a tomar.

### Painel do agricultor

No topo de *As minhas vendas* aparece o cartão **"A minha atividade"**, com:

- pontuação e nível, e uma barra de progresso até ao próximo nível;
- sequência de semanas e indicação de destaque na página inicial;
- o detalhe por componente ("sem dados — não conta" quando aplicável);
- até 3 ações sugeridas, com link direto (ex.: "3 produtos estão sem stock. Reponha ou desative-os.");
- o estado de isenção, quando existe ("Em pausa até…" ou "Fora de época").

## Transparência e enquadramento legal

A ordenação passa a depender da atividade, e a lei obriga a explicar os critérios a quem é afetado:

- **Aos agricultores:** Regulamento (UE) 2019/1150 (P2B). Os parâmetros estão descritos na secção "Ordenação e destaque" dos Termos e Condições (`/termos#ordenacao`).
- **Aos consumidores:** DL 109-G/2021. Há uma ligação "Como ordenamos?" junto do seletor de ordenação e "Como escolhemos?" nos destaques.
- **Proteção de dados:** a pontuação foi acrescentada à Política de Privacidade como tratamento por interesse legítimo. Fica explícito que nunca leva à suspensão ou ocultação do perfil.

## Arquitetura

```
cron diário (07:00) ──▶ edge function farmer-activity
                           │
                           ├─ rpc compute_farmer_activity()  ──▶ tabela farmer_activity
                           │                                     (pontuação, nível, componentes,
                           │                                      sequência, isenção, destaque)
                           ├─ regras de lembrete ──▶ notifications
                           └─ sendEmail() (inativo até haver fornecedor)

farmer_activity ──▶ view public_farmer_profiles (activity_score, featured_rank)
                      ├─ catálogo / pesquisa: ordenação "Relevância"
                      └─ página inicial: destaques
```

| Peça | Ficheiro |
|---|---|
| Tabela, pausa, cálculo, RLS, vista pública | `supabase/migrations/20261003150000_farmer_activity.sql` |
| Job diário e lembretes | `supabase/functions/farmer-activity/index.ts` |
| Envio de email (por ligar) | `supabase/functions/_shared/email.ts` |
| Bloqueio de encomendas em pausa | `supabase/functions/create-order/index.ts` |
| Níveis, ordenação, ações sugeridas | `src/lib/farmer-activity.ts` (+ testes em `src/test/farmer-activity.test.ts`) |
| Cartão do agricultor | `src/components/ActivityCard.tsx` → `src/pages/farmer/Sales.tsx` |
| Pausa (UI) | `src/pages/farmer/Availability.tsx`, aviso em `src/pages/FarmerProfile.tsx` |
| Destaques | `src/components/FeaturedFarmers.tsx`, `src/components/FarmerCard.tsx` |
| Ordenação | `src/pages/CategoryPage.tsx`, `src/pages/SearchResults.tsx` |
| Textos legais | `src/pages/Terms.tsx`, `src/pages/Privacy.tsx` |

**Fonte de dados principal:** o histórico de produtos (`product_history`, migração `20261003120000`). É a partir dele que se distinguem as ações do próprio agricultor das vendas automáticas e de alterações feitas por outras pessoas.

## Como foi verificado

- Migração aplicada num Postgres local com 6 agricultores de teste. Os perfis eram: ativo, parado, em pausa, fora de época, sem produtos e lento a responder.
- As pontuações coincidem com o cálculo manual: 100, 22 e 69.
- A pausa congela a pontuação e oculta os produtos ao público, mas não ao próprio agricultor. Os produtos voltam no dia de regresso.
- As validações da pausa funcionam: data no passado, mais de 6 meses, mensagem demasiado longa.
- A migração pode ser reexecutada sem erros.
- Uma segunda execução do cálculo no mesmo dia não repete notificações.
- Type-check, testes unitários (níveis, ordenação, pausa, ações sugeridas) e build de produção passam.

**Ainda por testar:**
- a edge function num ambiente com Deno;
- a interface no browser com a migração aplicada.

## Para publicar (por esta ordem)

1. **Aplicar as migrações** `20261003120000_product_history.sql` e `20261003150000_farmer_activity.sql`. Tem de ser antes de publicar o frontend: sem as colunas novas, o catálogo perde os nomes dos agricultores e os destaques ficam vazios.
2. **Fazer deploy da edge function `farmer-activity`.** Usa o mesmo `CRON_SECRET` que o `expire-orders`.
3. **Agendar a função** para todos os dias às 07:00 (Europe/Lisbon), da mesma forma que o `expire-orders`.

## Em aberto / próximos passos

- **Fornecedor de email.** A sugestão é o Resend. Ligá-lo só exige implementar o envio em `_shared/email.ts` e definir `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_FROM` e `APP_URL`.
- **Selos públicos** (ex.: "Responde rapidamente") e **redução de comissão** para os mais ativos. Ficaram fora desta versão.
- **Avaliações reais.** A página de avaliação ainda não grava avaliações na base de dados. Quando gravar, as avaliações podem entrar como parâmetro adicional da ordenação, mas os Termos terão de ser atualizados.
- **Afinar os limiares** depois de algumas semanas com dados reais: 7/45 dias, 2/48 h e mínimo de 40 para destaque.
