# CLAUDE.md — particle.js v2

Simulador clássico de n-corpos no navegador (frontend only). Forças/potenciais são
**expressões definidas pelo usuário**, compiladas para GLSL e executadas em paralelo
na GPU. React + TypeScript + three.js, build com Vite.

Sucessor de `../particle.js` (v1, somente leitura: serve de inspiração, não de modelo).

## Modelo físico

- Física **clássica**: nada de relatividade. `maxSpeed` é só um clamp numérico opcional.
- Partícula: posição, velocidade, tempo próprio (relógio/idade, acumula `dt`), massa (> 0),
  carga, spin (escalar), paridade, carga de cor (quantidades r,g,b sobre 3 vetores-base a 120°;
  `c_dot` = C_i·C_j, ver `docs/forces.md`), carga nuclear (`n`, conceito do v1), tipo (`dynamic` | `fixed`).
- Força de par: magnitude escalar `F(r)`, **positiva = repulsiva**, aplicada ao longo de
  `(x_i - x_j)/|x_i - x_j|`. No modo `potential` o usuário escreve `V(r)` e o motor usa
  `F = -dV/dr` (derivada simbólica).
- Curto alcance: corte rígido em `cutoff` (`x = r/cutoff` disponível). Longo alcance: sem corte.
- `softening` ε: a expressão recebe `r = sqrt(r² + ε²)`; a direção usa a distância real.
- Integradores: Velocity Verlet (padrão, 2ª ordem) e Euler semi-implícito; ambos espelhados em
  `referenceStep.ts`. `npm run parity` compara GPU × CPU.

## Arquitetura

- `src/engine/expr/` — parser próprio → AST → `toGlsl` / `compileJs` / `derivative` / `simplify`.
  Uma única AST alimenta GPU, gráfico da UI e referência em CPU: nunca escreva GLSL de força à mão.
- `src/engine/forces/` — `ForceDefinition` (dados serializáveis), `compileForce` (valida e
  devolve todos os problemas de uma vez), catálogo de variáveis em `variables.ts`.
- `src/engine/particles.ts` — `ParticleSet` em struct-of-arrays, espelho 1:1 das texturas:
  position=(xyz, kind), velocity=(xyz, time), attributes=(mass, charge, spin, parity), color=(rgb, nuclear charge).
- `src/engine/shaders/` — geração dos compute shaders. Parâmetros de força, cutoff e
  softening são **uniforms** (mudar valor não recompila); mudar expressão/alcance/ativação recompila.
- `src/scenarios/library/*.json` — cenários declarativos (formato em `docs/scenarios.md`);
  `scenarioFile.ts` valida (chaves desconhecidas rejeitadas) e constrói as partículas.
- `src/engine/cpu/referenceStep.ts` — mesmo algoritmo em float64; é a especificação executável.
  Toda mudança de semântica no shader muda a referência no mesmo commit.

## Regras do projeto

- Sem estado global mutável de módulo nem "live bindings" reatribuídos (erro do v1).
  Objetos de runtime são criados uma vez e passados explicitamente.
- Sem código comentado, `#if 0` ou blocos experimentais esquecidos.
- Valores inválidos falham alto (mensagem com campo, valor e limite); nunca caia num padrão silencioso.
- Sem MUI: componentes de UI próprios e leves.
- Interatividade segue o v1 (atalhos de teclado, diálogos arrastáveis, clique para inspecionar,
  shift+arrastar para selecionar). Mapa de teclas documentado em `docs/`.

## Comandos

```
npm run dev         # servidor de desenvolvimento
npm test            # vitest (unitários, Node, sem GPU)
npm run typecheck
npm run lint
npm run build
npm run check       # typecheck + lint + test (rode antes de cada commit)
npm run smoke:all   # Chromium headless: todos os cenários + gestos de interação
```

Validação visual: `npm run snap -- --scenario <id>` e leia o PNG em `reports/screenshots/`.

## Fluxo de trabalho

- Tarefas: um `.md` por tarefa em `tasks/inbox/`; ao concluir, escreva a seção `## Result`
  e mova com `git mv` para `tasks/done/`. Pedidos no meio de uma tarefa viram tarefa na hora.
- Commits pequenos, conventional commits em inglês, mensagem via `git commit -F`, stage explícito,
  sem trailers de coautoria. Suíte verde antes de cada commit.
- **Push autorizado** (pedido do usuário em 2026-10-24): faça `git push` para `origin/main` sempre que
  um lote estiver commitado, verde e revisado. Nunca force push nem reescreva histórico publicado.
- **Antes de fechar um lote de commits, rode `/code-review`** e trate os achados.
- **CPU: no máximo 70% da WSL** (pedido do usuário em 2026-10-24). No início de cada sessão rode
  `scripts/cpu-limit.sh` (fixa o processo do Claude Code e descendentes em 70% dos núcleos via
  `taskset`; filhos herdam). Não rode testes de navegador em paralelo além dos agentes ativos.
- Subagentes: no máximo 3, sem filhos; os que escrevem usam worktree. Escolha o modelo mais adequado para a tarefa.
- Documentação (`README.md`, `docs/`, este arquivo) muda no mesmo commit do comportamento.
- Automação repetitiva de CLI vai para `scripts/`.
- Fase atual: **MVP**. Testes completos/gate de cobertura/e2e estão em `tasks/inbox/`.
- Docs: `docs/README.md` é o índice; `docs/forces.md` descreve o modelo e a linguagem de expressões.
