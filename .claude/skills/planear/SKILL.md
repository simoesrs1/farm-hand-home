---
name: planear
description: Investiga uma tarefa técnica (código do repositório e documentação oficial), faz perguntas de clarificação e produz um plano estruturado em docs/planos/. Usar só quando o Ruben invocar /planear.
disable-model-invocation: true
argument-hint: <descrição da tarefa>
---

# /planear: pesquisa e planeamento de uma tarefa técnica

Tarefa: $ARGUMENTS

O objetivo desta skill é **perguntar, investigar e escrever um plano**. Não se implementa nada.
Se `$ARGUMENTS` vier vazio, pede ao Ruben a descrição da tarefa antes de continuar.

## Regras gerais

- Escreve em pt-PT e trata o utilizador por Ruben (ver CLAUDE.md).
- Até ao fim da skill só se fazem operações de leitura: ler ficheiros, pesquisar código, pesquisar na web e correr verificações sem efeitos (`tsc`, `lint`). Não se editam ficheiros de código, não se correm migrações nem deploys, e não se fazem commits.
- A única escrita é o ficheiro do plano em `docs/planos/` (fase 4).
- Factos sobre o código têm de ser verificados (caminho e, se fizer sentido, linha). Factos externos levam ligação para a fonte. O que não foi possível confirmar é marcado como **por confirmar**.

## Fase 1: Clarificação (obrigatória, antes de qualquer pesquisa)

1. Faz uma leitura rápida do código relacionado com a tarefa, só o necessário para fazer perguntas informadas (não mais de alguns ficheiros).
2. Usa `AskUserQuestion` com 2 a 4 perguntas, escolhidas entre:
   - **Objetivo**: qual é o problema real e o resultado esperado.
   - **Âmbito**: o que entra e o que fica de fora (ex.: só o agricultor, só o cliente ou os dois; só frontend ou também Edge Functions e migrações).
   - **Restrições**: prazo, custo, serviços externos permitidos, compatibilidade com o que já existe.
   - **O que o Ruben quer saber**: comparação de opções, viabilidade, estimativa, riscos ou um passo a passo de implementação.
   - **Profundidade da pesquisa** (pergunta obrigatória):
     - Rápida: sem subagentes, pesquisa direta e curta.
     - Normal (recomendada): até 2 subagentes em paralelo.
     - Exaustiva: até 3 subagentes em paralelo e mais fontes externas.
3. Cada pergunta deve fazer sentido sozinha e propor opções concretas, baseadas no que viste no código.
4. Se, depois das respostas, a tarefa continuar ambígua, faz uma segunda ronda de perguntas. Não avances para a pesquisa sem respostas.

## Fase 2: Pesquisa

Divide a pesquisa em frentes independentes:

- **Código do repositório**
  - Componentes e páginas relacionados (`src/pages/`, `src/pages/farmer/`, `src/components/`).
  - Lógica reutilizável em `src/lib/` e nos contextos (`src/contexts/`).
  - Edge Functions (`supabase/functions/`, incluindo `_shared/`).
  - Esquema: migrações em `supabase/migrations/` e `src/integrations/supabase/types.ts`. Confirma que cada coluna e tabela referida existe.
  - Documentação existente em `docs/` (incluindo planos anteriores em `docs/planos/`).
- **Web e documentação oficial**
  - Documentação oficial das bibliotecas e serviços envolvidos (Supabase, Stripe, Google Maps, React, TanStack Query, etc.).
  - Versões atuais, limites, preços e boas práticas. Guarda as ligações.

Execução, conforme a profundidade escolhida:
- **Rápida**: faz tudo diretamente, sem subagentes.
- **Normal / Exaustiva**: lança os subagentes **em paralelo, numa única mensagem**, cada um com um foco distinto e um prompt autossuficiente (contexto da tarefa, respostas do Ruben, o que procurar e o formato da resposta):
  - `Explore` para o código (indica a abrangência: "medium" ou "very thorough");
  - `general-purpose` para a web e a documentação externa.
  - Pede a cada subagente conclusões com caminhos de ficheiros ou ligações, não excertos longos.

## Fase 3: Síntese

- Cruza as conclusões do código com as fontes externas.
- Resolve contradições. Se não for possível, regista-as em "Riscos e questões em aberto".
- Identifica o que já existe e pode ser reutilizado, antes de propor código novo.
- Verifica se as opções respeitam o CLAUDE.md: uma única fonte para cada dado, RLS e `GRANT` nas migrações, operações sensíveis via Edge Functions, `MapConsentGate` nos mapas, sem segredos com prefixo `VITE_`.

## Fase 4: Plano

1. Lê `.claude/skills/planear/modelo-plano.md` e preenche todas as secções. Se alguma não se aplicar, escreve "Não se aplica" e explica numa linha porquê.
2. Guarda o plano em `docs/planos/AAAA-MM-DD-tema-curto.md`, com a data de hoje e o tema em kebab-case, sem acentos (ex.: `2026-11-16-notificacoes-email-encomendas.md`). Se já existir um ficheiro com esse nome, acrescenta um sufixo (`-2`).
3. No chat, mostra:
   - o caminho do ficheiro, como ligação clicável;
   - um resumo de 5 a 10 linhas: a recomendação, o esforço total e as principais questões em aberto.

## Fase 5: Fim

Pergunta ao Ruben se quer avançar para a implementação. Se quiser, a implementação segue as regras normais do CLAUDE.md: apresentar os ficheiros a alterar e esperar aprovação antes de mexer em qualquer ficheiro.
