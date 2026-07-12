# Fase 0 — Pesquisa e Decisões

**Feature**: 009-engajamento-ataque-torre

A spec não deixou nenhum `NEEDS CLARIFICATION` em aberto: os pontos ambíguos já
foram fechados na seção *Assumptions* (alcance 200 px, dano/custo/cadência
inalterados, desempate determinístico, sem venda de torre). Esta fase resolve as
**decisões técnicas** que a spec deliberadamente não toma — todas derivadas da
leitura do código atual.

## Ponto de partida (o que o código faz hoje)

- `Tower.update()` chama `resolveAttack()` (puro) e, quando a política é `onCue`,
  entrega o alvo ao `TowerAttackAnimator` e guarda o efeito em `pendingOutcome`.
- **A perseguição inteira vive no animador**, como deslocamento de um container
  visual (`visualRoot`): `moveTowardTarget()` + `hasArrived()` movem o sprite em
  coordenadas locais e o `reset()` o devolve a `(0,0)` — ou seja, o "voltar à base"
  de hoje é um **teleporte**, não um trajeto.
- O dano sai na deixa do animador (`onFireCue`), com `onComplete` como rede de
  segurança para animação quebrada.
- O alcance já é medido a partir de `this.x/this.y` da torre (a base), tanto em
  `isTargetValid` quanto em `acquireTarget` — a regra do FR-012 já está certa; o
  que escapa do anel hoje é apenas o **sprite**.

Conclusão: as regras que a spec pede (encadear, retornar, coleira) não têm onde
morar sem renderização. É isso que a Fase 0 resolve.

---

## D1 — Onde declarar o perfil de engajamento

**Decisão**: campo **obrigatório** `engagement: EngagementProfile` dentro de
`AttackBehaviorSpec` (em `src/data/towers.ts`), propagado para o `AttackBehavior`
resolvido por `attackBehaviorOf()`.

**Rationale**: a própria spec define o perfil como "uma característica declarada da
torre que descreve *como ela se comporta em relação ao ataque*" — que é exatamente
o escopo de `AttackBehaviorSpec`. Colocá-lo ali dá três coisas de graça: (1) o
contrato de ataque resolvido, que combate e engajamento já consomem, passa a
carregar o perfil sem uma segunda fonte de verdade; (2) sendo obrigatório, o
compilador força o FR-001 — nenhuma torre nova compila sem declarar seu perfil;
(3) o registro `tower.vira-lata-caramelo.attack-behavior` em `data/contracts.ts`
passa a proteger o perfil contra deriva acidental, como já protege `kind` e
`targetRule`.

**Alternativas rejeitadas**:
- *Campo solto no `TowerType`* (`type.engagement`): separaria o perfil do contrato
  de ataque que ele modula, e obrigaria a passar dois objetos para o sistema.
- *Campo opcional com default `'stationary'`*: mais barato, mas o FR-001 diz
  "**toda** torre MUST declarar". Opcional deixa o esquecimento passar em silêncio.
- *Subclasse `PursuerTower`*: a constitution manda preferir configuração a
  hierarquia (VI), e o perfil precisa ser trocável em dados (US3/FR-004).

---

## D2 — Quem é dono da posição do perseguidor

**Decisão**: o **sistema puro** (`src/systems/engagement.ts`) é dono da posição
corrente do perseguidor e da fase do engajamento. `TowerAttackAnimator` deixa de
mover o sprite e passa a **ler** a posição do estado, cuidando só de frame e
espelhamento.

**Rationale**: FR-016 e FR-017 exigem que as transições (ocioso → perseguindo →
atacando → encadeando/retornando) sejam testáveis sem renderização e independentes
de frame rate. Se a posição continuar dentro do animador, "chegou no alvo",
"chegou na base" e "está dentro da coleira" — todas condições de *transição de
regra* — só existem dentro do Phaser. É a mesma classe de acoplamento que a fatia
007 removeu do dano, agora aplicada ao movimento.

**Alternativas rejeitadas**:
- *Manter o movimento no animador e só adicionar o encadeamento na `Tower`*: mais
  barato hoje, mas deixa a regra do retorno e da coleira sem teste, ferindo o
  princípio IX e o FR-016. Foi rejeitada como dívida imediata, não como economia.
- *Um `PursuerEntity` Phaser separado da torre*: introduz uma entidade nova (e
  gerenciamento de ciclo de vida) para um problema que é de estado, não de cena.

**Nota de terminologia**: "posição do perseguidor" é estado de simulação, não
regra de alvo. O alcance continua medido **da base** (D4) — a posição corrente só
determina o tempo de deslocamento e o que o jogador vê.

---

## D3 — Quando o dano sai (sem depender de asset)

**Decisão**: o sistema puro emite um comando `strike` num instante calculado a
partir de **timings em segundos** que a `Tower` injeta: `prepareSec`, `strikeSec`,
`cueAtSec`. Esses timings são derivados dos **dados** de `attackAnimation` (soma de
`frames.length × frameDurationMs`, respeitando `minDurationMs`, e o
`fireCueFrameIndex` para a deixa) ou, quando a torre não declara animação, de
constantes de fallback em `core/constants.ts`.

**Rationale**: dado ≠ asset. A definição da animação é um objeto de configuração
que existe mesmo quando a textura não carrega — logo, derivar o tempo do golpe dela
não viola o FR-015; derivar do *callback* do animador (como hoje) viola, e é por
isso que hoje existe a rede de segurança `onComplete: this.handleFireCue`. Com a
inversão, o dano nunca passa pelo animador e essa gambiarra desaparece: sprite
quebrado vira só um frame errado, nunca dano perdido.

**Consequência para `visualCuePolicy`**: o campo permanece (é o que distingue
"aplica ao resolver" de "aplica no golpe" e "aplica no impacto do projétil"), mas
`onCue` passa a significar *"no instante do golpe, definido pelos dados"* — não
*"quando o animador avisar"*.

**Alternativas rejeitadas**:
- *Animador continua dando a deixa*: mantém o acoplamento que o FR-015 proíbe e
  torna o teste da US1 dependente de renderização.
- *Golpe instantâneo ao chegar (`strikeSec = 0`)*: mataria a leitura visual da
  mordida e mudaria a cadência efetiva do encadeamento.

---

## D4 — Coleira: alcance medido da base + clamp da posição

**Decisão**: manter o alcance medido da **base** (já é o comportamento de
`acquireTarget`/`isTargetValid`) e, adicionalmente, **grampear (clamp)** a posição
do perseguidor ao disco de raio `range` centrado na base, dentro do sistema puro.

**Rationale**: o FR-012a é sobre a posição *renderizada*, não sobre a regra de
alvo — e é aí que está o bug real. Numa perseguição, os dois extremos do trajeto
(posição atual do cão e posição do alvo) estão dentro do disco, e o disco é convexo,
então o segmento inteiro está dentro. Mas o alvo **se move durante a corrida**: ele
pode cruzar a borda do alcance enquanto o cão ainda o persegue, arrastando o sprite
para fora do anel antes de o alvo ser invalidado no frame seguinte. O clamp fecha
essa janela por construção, e vira um teste puro direto (SC-008).

**Alternativas rejeitadas**:
- *Só invalidar o alvo ao sair do alcance, sem clamp*: deixa a janela de um frame
  em que o cão aparece fora do anel — exatamente o que o FR-012a proíbe ("jamais").
- *Medir o alcance da posição corrente do cão*: quebraria o FR-012 e transformaria
  a coleira num passeio infinito, com o cão puxando o alcance efetivo caminho afora.

---

## D5 — Reaquisição de alvo durante a perseguição

**Decisão**: reavaliar o alvo **a cada passo** com a mesma regra
(`pickMostAdvancedInRange`, a partir da base), inclusive durante a corrida e o
retorno. Desempate: o primeiro encontrado na ordem de avaliação (a implementação
atual só troca de melhor com `>`, nunca com `>=` — já é determinística).

**Rationale**: é a leitura literal do FR-007 ("tanto no primeiro engajamento quanto
em cada encadeamento") e do FR-014 (alvo inválido → reavaliação imediata). O medo
seria a oscilação de alvo entre frames, mas ela não acontece na prática: inimigos só
avançam no caminho, então o mais avançado continua sendo o mais avançado até morrer,
vazar ou sair do alcance — e nesses três casos a troca é justamente o que se quer.
O custo é uma varredura O(n) por torre/frame, o mesmo que `resolveAttack` já faz
hoje.

**Alternativas rejeitadas**:
- *Travar o alvo até a mordida*: mais estável, mas contraria o FR-014 (alvo que
  morre no meio da corrida continuaria sendo perseguido até a mordida vazia).
- *Reavaliar só ao terminar a mordida*: deixaria o cão correndo atrás de um cadáver.

---

## D6 — Cadência x deslocamento no encadeamento

**Decisão**: o cooldown de cadência (`1 / fireRate`) é armado **ao iniciar a
mordida** e **corre durante o deslocamento** até o alvo seguinte. O perseguidor pode
*se mover* em cooldown, mas só entra na fase de golpe quando o cooldown zerou **e**
chegou ao alvo. Intervalo efetivo entre mordidas encadeadas = `max(1/cadência,
tempo de deslocamento)`.

**Rationale**: é exatamente o que o SC-003 pede ("limitado apenas pela cadência e
pelo tempo de deslocamento") e o que o FR-013 proíbe violar (encadear não pode
atacar mais rápido que a cadência declarada). Bloquear o *movimento* durante o
cooldown seria mais simples, mas faria o cão parar plantado no meio do mapa
esperando o relógio — feio e contra o SC-002.

---

## D7 — Perfil `stationary` sem regressão

**Decisão**: a mesma máquina de estados atende os dois perfis. Para `stationary`, a
posição corrente é sempre a base, as fases de perseguição/retorno são inalcançáveis
e o ciclo é `idle → strike → idle` governado pela cadência — observavelmente
idêntico ao roster de hoje.

**Rationale**: FR-003 exige zero regressão para o perfil estacionário, e a US3 pede
que alternar o perfil do Caramelo nos dados baste para voltar ao comportamento
atual. Um único motor, com os ramos de movimento desligados por dado, é o que torna
essa troca uma mudança de *dado* (FR-004) — dois motores separados exigiriam um
`if` de sistema em algum lugar.

**Risco e mitigação**: hoje não existe nenhuma torre estacionária no roster, então a
regressão não seria pega por playtest. Mitigação: teste puro dedicado que exercita
o perfil `stationary` (alvo no alcance, cadência governando o intervalo, posição
imóvel na base) — é o `Independent Test` da US3, feito em código.

---

## D8 — Alcance do Caramelo: 120 → 200 px

**Decisão**: adotar os 200 px da Assumption da spec, atualizando **junto** o
contrato `tower.vira-lata-caramelo.base-stats` em `src/data/contracts.ts` com
`reason` e `changedBy`.

**Rationale**: `data/contracts.test.ts` é um portão de deriva — mudar o `range` no
runtime sem mexer no contrato **falha o teste de propósito**. Esse é o mecanismo
desenhado na fatia 007 e ele deve ser honrado: a mudança é intencional (o range alto
é o que dá caça a encadear, FR-006), então o contrato muda com ela, registrando o
porquê. Nota de balanceamento a registrar no `reason`: 200 px de alcance com 90 px/s
de velocidade do motoboy deixa o inimigo ~4,4 s sob cobertura (vs. ~2,3 s hoje) —
folga suficiente para 2+ mordidas encadeadas sem tornar a torre única capaz de
segurar a onda sozinha.

---

## Resumo das decisões

| # | Decisão |
|---|---------|
| D1 | `engagement` obrigatório em `AttackBehaviorSpec`; o compilador força o FR-001 |
| D2 | Sistema puro é dono da fase **e** da posição do perseguidor; animador só desenha |
| D3 | Golpe sai em instante derivado dos **dados** da animação, nunca do callback do asset |
| D4 | Alcance medido da base + **clamp** da posição do perseguidor ao disco (coleira) |
| D5 | Alvo reavaliado a cada passo, com desempate determinístico |
| D6 | Cooldown corre durante o deslocamento; golpe exige cooldown zerado **e** chegada |
| D7 | Um motor só; `stationary` desliga os ramos de movimento por dado |
| D8 | Range 120 → 200 com atualização explícita do contrato de gameplay |
