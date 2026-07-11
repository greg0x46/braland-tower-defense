<!--
Sync Impact Report — 2026-07-11
Version change: TEMPLATE (uninitialized) → 1.0.0
Bump rationale: Primeira ratificação. Preenchimento inicial de todos os
placeholders do template com princípios concretos do projeto BR-TD.

Princípios definidos (14):
  I. Gameplay em Primeiro Lugar
  II. Responsividade e Sensação de Controle
  III. Performance desde o Início
  IV. Arquitetura Desacoplada
  V. Separação entre Dados, Lógica e Apresentação
  VI. Evolução Incremental
  VII. TypeScript Rigoroso
  VIII. Determinismo e Consistência
  IX. Testabilidade
  X. Observabilidade e Depuração
  XI. Assets Substituíveis
  XII. Qualidade de Código
  XIII. Compatibilidade e Escalabilidade Visual
  XIV. Definição de Concluído

Seções adicionadas (substituem placeholders genéricos do template):
  - Regras Obrigatórias
  - Práticas Recomendadas
  - Práticas Proibidas
  - Critérios de Qualidade
  - Arquitetura de Referência
  - Governança
  - Checklist de Revisão de Funcionalidades

Templates verificados para consistência:
  ✅ .specify/templates/plan-template.md (Constitution Check é derivado deste
     arquivo; nenhuma edição necessária — o gate lê a constitution em runtime)
  ✅ .specify/templates/spec-template.md (sem regra que conflite)
  ✅ .specify/templates/tasks-template.md (categorias cobrem testes/observ.)
  ✅ README.md (arquitetura já alinhada a este documento)

Follow-up TODOs: nenhum. Sem placeholders pendentes.
-->

# BR-TD Constitution

## Visão

BR-TD é um Tower Defense com identidade brasileira — arquétipos, humor e cultura
locais — inspirado na estrutura de jogos como Bloons TD, mas próprio. O objetivo
imediato é **validar o loop central de gameplay** com visuais temporários
(emojis e formas), mantendo desde já uma arquitetura que suporte evoluir para
sprites, animações, áudio, partículas, múltiplos mapas, upgrades, chefes,
progressão, persistência e leaderboards — **sem reescrever regras de gameplay**.

Esta constitution existe para evitar dois extremos: overengineering (abstrair o
que ainda não tem uso) e código descartável (atalhos que travam a evolução). Ela
é curta o bastante para ser consultada durante o desenvolvimento e específica o
bastante para orientar decisões reais de código, revisão e arquitetura.

Stack atual: **Phaser 3 + TypeScript + Vite**. Backend (Laravel ou FastAPI)
apenas quando uma funcionalidade concreta exigir — não antes.

## Core Principles

### I. Gameplay em Primeiro Lugar

Toda decisão prioriza uma experiência responsiva, clara e divertida. O MVP DEVE
validar o loop principal (construir → onda → dano/dinheiro → vitória/derrota)
antes de qualquer conteúdo avançado. Visuais temporários NUNCA bloqueiam o
avanço da gameplay. Nenhuma abstração é criada sem necessidade concreta ou
evolução claramente prevista neste documento.
**Racional:** diversão é o único requisito que não pode ser adiado; tudo o mais
existe para servi-la.

### II. Responsividade e Sensação de Controle

Entradas do jogador DEVEM produzir feedback imediato. Construção, seleção,
ataque, dano e movimentação DEVEM parecer rápidos e precisos. A UI NÃO interrompe
nem atrasa a partida sem motivo. Feedback visual e sonoro é tratado como parte da
mecânica, não como decoração.
**Racional:** em TD a sensação de controle vem da resposta imediata; latência
percebida quebra a diversão mais que gráficos simples.

### III. Performance desde o Início

O jogo DEVE manter desempenho estável com muitos inimigos, projéteis e efeitos.
Evite alocações dentro do game loop; evite criar/destruir objetos em excesso
durante a partida; use object pooling quando o volume justificar. Atualize apenas
o que precisa. Colisão, busca de alvo e cálculo de distância DEVEM evitar
complexidade desnecessária. Toda otimização é baseada em medição/profiling —
**nada de otimização prematura**.
**Racional:** performance é design, não polish; recuperá-la depois custa
reescrita. Mas otimizar sem evidência gera código complexo sem ganho.

### IV. Arquitetura Desacoplada

Regras de negócio NÃO dependem de sprites, emojis ou assets. Entidades de
gameplay são separadas de sua representação visual. Torres, inimigos, projéteis,
ondas, economia e efeitos têm responsabilidades bem definidas e se comunicam por
interfaces, eventos ou contratos claros. Proibido: dependências circulares e
classes-Deus. `GameScene` COORDENA sistemas — não concentra regras de negócio.
**Racional:** desacoplamento é o que permite trocar visual, adicionar conteúdo e
testar sem renderização.

### V. Separação entre Dados, Lógica e Apresentação

Estatísticas de torres, inimigos e ondas DEVEM viver em dados configuráveis
(`src/data/`), não espalhadas pelo código. Trocar emoji por sprite NÃO exige
mexer em regra de gameplay. Animações e efeitos NÃO alteram regras de combate.
Assets são referenciados por identificadores estáveis, nunca por caminho ou
dimensão embutidos na lógica.
**Racional:** balanceamento e arte mudam com frequência; isolá-los em dados
torna a iteração barata e segura.

### VI. Evolução Incremental

Cada funcionalidade é implementada na forma mais simples que preserve capacidade
de evolução. Novas abstrações só entram quando reduzem acoplamento, duplicação ou
risco real. Adicionar uma torre/inimigo/onda DEVE ser uma nova entrada em
`src/data/` — não uma modificação em vários sistemas. Prefira composição e
configuração a grandes hierarquias de herança. NÃO implemente antecipadamente
multiplayer, backend, árvore de upgrades ou persistência sem necessidade do MVP.
**Racional:** o roadmap é longo; simplicidade hoje é o que compra velocidade
amanhã.

### VII. TypeScript Rigoroso

`strict: true` é obrigatório. Evite `any`. Tipe contratos, eventos,
configurações e estados. Modele estados inválidos como difíceis ou impossíveis de
representar (uniões discriminadas em vez de flags soltas). NÃO use type assertions
(`as`) para esconder problemas de modelagem. Tipos DEVEM tornar as regras do
domínio compreensíveis.
**Racional:** o tipo é a primeira camada de teste e de documentação viva do
domínio.

### VIII. Determinismo e Consistência

Regras de dano, recompensa, spawn e ondas DEVEM ser previsíveis e testáveis. A
lógica principal NÃO depende do frame rate: movimentação, cooldowns e timers usam
delta time ou relógios controlados. Comportamento aleatório DEVE permitir seed
quando necessário para teste e reprodução de bugs.
**Racional:** sem determinismo não há teste confiável nem reprodução de bug — e
balanceamento vira adivinhação.

### IX. Testabilidade

Regras críticas de gameplay DEVEM ser testáveis sem renderização — dano,
economia, ondas, efeitos e seleção de alvo isoláveis do Phaser. Testes priorizam
comportamento e regras, não detalhes internos. Bug corrigido em sistema crítico
recebe teste de regressão quando viável.
**Racional:** o valor do desacoplamento (IV) só se realiza se a lógica for de
fato exercitada fora da cena.

### X. Observabilidade e Depuração

O projeto DEVE ter ferramentas de debug ativáveis apenas em desenvolvimento,
capazes de mostrar hitboxes, caminhos, alcance de torres, alvo atual, FPS e
contagem de entidades. Logs são úteis, estruturados e desativados/removidos em
produção. Erros silenciosos são PROIBIDOS — falhe visível ou registre.
**Racional:** gameplay tunável exige enxergar o que o motor está fazendo; bug
silencioso em TD é quase invisível a olho nu.

### XI. Assets Substituíveis

Emojis são placeholders do MVP. NENHUMA regra de gameplay depende das dimensões
de um emoji. Sprites, animações, sons e efeitos DEVEM ser trocáveis sem alterar o
domínio. Dimensões de colisão/gameplay são configuradas separadamente das
dimensões visuais. O carregamento de assets é centralizado e organizado.
**Racional:** o salto de emoji para arte final é previsto; ele deve custar
trabalho de arte, não de reengenharia.

### XII. Qualidade de Código

Funções e classes têm responsabilidade pequena e clara. Nomes refletem conceitos
do domínio (Enemy, Tower, Wave, Economy). Evite duplicação de regras e comentários
que só repetem o código. Prefira código simples e explícito. NÃO crie abstração
genérica sem uso concreto. Todo código passa por verificação de tipos e testes
aplicáveis antes de ser considerado pronto.
**Racional:** legibilidade é o que mantém o custo de adicionar conteúdo baixo ao
longo do roadmap.

### XIII. Compatibilidade e Escalabilidade Visual

O jogo DEVE considerar diferentes resoluções e proporções. Posicionamento de UI é
responsivo. A lógica do mapa NÃO depende de resolução fixa. Câmera, escala e
viewport são tratadas separadamente da lógica de gameplay.
**Racional:** múltiplos dispositivos estão no roadmap; hardcodar resolução hoje
gera retrabalho garantido.

### XIV. Definição de Concluído (NÃO-NEGOCIÁVEL)

Uma funcionalidade só está concluída quando TODOS os itens valem: (1) funciona
dentro do loop principal; (2) tem feedback visual mínimo; (3) não introduz
regressão perceptível de performance; (4) respeita os contratos arquiteturais;
(5) tem tipos adequados; (6) tem testes quando envolve regra crítica; (7) é
configurável sem alterar código espalhado; (8) não depende de assets finais para
funcionar. Ver o **Checklist de Revisão de Funcionalidades**.
**Racional:** "quase pronto" acumula dívida silenciosa; o gate único torna o
padrão inegociável e verificável.

## Regras Obrigatórias

Estas regras são verificáveis e valem para todo commit/PR:

- **Dados fora do código:** stats de torre/inimigo/onda vivem em `src/data/*`.
  Adicionar conteúdo = adicionar entrada de dados, não editar sistemas.
- **Domínio sem Phaser onde possível:** cálculo de dano, economia, progressão de
  onda e seleção de alvo DEVEM ser exercitáveis sem instanciar uma cena.
- **Delta time obrigatório:** nada de gameplay dependente de frame rate;
  movimento/cooldown/timer usam `delta` ou relógio controlado.
- **Comunicação por eventos/contratos:** sistemas conversam via EventBus ou
  interfaces tipadas, não por referências diretas que criem ciclos.
- **`strict` ligado, sem `any` de conveniência.** `as` só com justificativa.
- **Debug togglável:** overlays de debug (hitbox, path, alcance, alvo, FPS,
  contagem) existem e são desligáveis, saindo de produção.
- **Typecheck verde:** `npm run build` (que roda `tsc --noEmit`) passa antes de
  concluir qualquer funcionalidade.
- **Sem erro silencioso:** todo caminho de falha registra ou falha visível.

## Práticas Recomendadas

- Modelar variação de comportamento (ex.: Motoboy móvel, debuff do Político) como
  campos de config ou pequenas subclasses/estratégias de uma entidade — não como
  novos sistemas.
- Introduzir object pooling em projéteis/inimigos **quando o profiling mostrar**
  pressão de GC, não antes.
- Usar uniões discriminadas para estados de jogo/entidade em vez de múltiplos
  booleans.
- Escrever o teste de regra crítica junto da regra, não depois.
- Centralizar cores, dimensões e valores iniciais em `core/constants.ts`.
- Manter `GameScene` fina: orquestração e listas de entidades; regra vai para o
  manager/sistema responsável.

## Práticas Proibidas

- Ler dimensão/posição de emoji ou sprite para decidir regra de gameplay.
- Concentrar regra de combate, economia e ondas numa única classe central.
- Criar sistema de multiplayer, backend, upgrades ou persistência "para o
  futuro" sem uma funcionalidade do MVP que o exija.
- Otimizar sem medição que justifique.
- Silenciar erro com `try/catch` vazio ou `as` para calar o compilador.
- Hardcodar resolução/coordenadas absolutas na lógica de mapa ou UI.
- Introduzir abstração genérica com um único uso.

## Critérios de Qualidade

- **Tipos como contrato:** eventos, configs e estados totalmente tipados; estado
  inválido difícil de representar.
- **Coesão:** cada arquivo/classe tem uma responsabilidade nomeável em uma frase.
- **Sem duplicação de regra:** uma regra de gameplay tem uma única fonte de
  verdade.
- **Testes de comportamento:** cobrem regras (dano, economia, ondas, alvo), não
  detalhes internos; regressões viram teste.
- **Performance verificável:** mudanças sensíveis a performance acompanham uma
  medição (FPS/contagem) antes/depois.

## Arquitetura de Referência

As responsabilidades abaixo DEVEM permanecer separadas (nomes podem variar; a
separação, não). O layout atual de `src/` já a materializa:

- **`scenes/` — GameScene / UIScene / BootScene:** coordenam mundo, loop e HUD.
  Não abrigam regra de negócio.
- **`entities/` — Enemy / Tower / Projectile:** estado e comportamento da
  entidade; sem conhecer a fonte de dados nem a UI.
- **`managers/` — BuildManager / WaveManager:** construção/validação/compra e
  agendamento de spawns / fim de onda.
- **`core/` — GameState / EventBus / constants:** estado do jogo (dinheiro, vida,
  onda) emitindo eventos; barramento de eventos tipado; constantes.
- **`data/` — towers / enemies / waves / path:** configuração data-driven.
  Adicionar conteúdo = nova entrada aqui.
- **Sistemas de regra — targeting / combat / economia / vida:** isoláveis e
  testáveis sem renderização, seja como módulo próprio ou como responsabilidade
  clara dentro de manager/entidade.
- **Camada de apresentação:** visual (emoji/forma hoje, sprite amanhã) separada
  da lógica; trocável sem tocar no domínio.

Qualquer novo sistema DEVE declarar em qual dessas camadas vive e por quê.

## Governança

- Esta constitution **prevalece** sobre conveniências locais de implementação.
  Em conflito entre um atalho e um princípio, o princípio vence ou a exceção é
  registrada.
- **Exceções** a qualquer regra DEVEM ser justificadas explicitamente no PR/commit
  (o quê, por quê, e o custo de não abrir a exceção). Exceção não documentada é
  violação.
- **Mudanças arquiteturais relevantes** (nova camada, novo sistema central,
  quebra de contrato entre sistemas) DEVEM registrar motivação e trade-offs.
- **Princípios podem evoluir** conforme o projeto amadurece. Revisões DEVEM
  preservar o foco em gameplay, performance, simplicidade e evolução incremental.
- **Versionamento (SemVer)** deste documento:
  - MAJOR: remoção/redefinição incompatível de princípio ou governança.
  - MINOR: novo princípio/seção ou expansão material de guia.
  - PATCH: esclarecimento, redação, correção sem mudança semântica.
- **Conformidade:** revisões de código e PRs verificam aderência a esta
  constitution; complexidade adicional DEVE ser justificada. O
  `Constitution Check` do plano (`.specify/templates/plan-template.md`) lê estes
  princípios como gate.

## Checklist de Revisão de Funcionalidades

Uma funcionalidade só é aceita quando marca todos:

- [ ] Funciona dentro do loop principal (construir → onda → combate → fim).
- [ ] Tem feedback visual mínimo para o jogador.
- [ ] Não introduz regressão perceptível de performance (com medição, se
      sensível).
- [ ] Respeita os contratos arquiteturais (camada certa, sem ciclo, sem
      classe-Deus).
- [ ] Regras de negócio não dependem de assets/emoji.
- [ ] Tem tipos adequados; sem `any`/`as` de conveniência.
- [ ] Tem testes quando envolve regra crítica (dano, economia, ondas, alvo).
- [ ] É configurável via `src/data/` / `constants` — sem código espalhado.
- [ ] Não depende de assets finais para funcionar (emoji/forma bastam).
- [ ] `npm run build` passa (typecheck limpo).
- [ ] Overlays/debug e logs de produção adequados (sem erro silencioso).

**Version**: 1.0.0 | **Ratified**: 2026-07-11 | **Last Amended**: 2026-07-11
