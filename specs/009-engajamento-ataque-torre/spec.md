# Feature Specification: Comportamento de Engajamento de Ataque da Torre

**Feature Branch**: `009-engajamento-ataque-torre`

**Created**: 2026-07-11

**Status**: Draft

**Input**: User description: "atualmente o vira lata ataque e volta pra base, queremos adicionar a caracteristicas que define como a torre se comporta em relacao ao ataque. O vira lata tem um range alto e ataca o inimigo mais proximo do final, ele nao deve voltar pra base se tiver outro inimigo dentro do range deve ir para o proximo inimigo e so voltar para base quando nao tiver mais inimigos proximos"

## Contexto

Hoje o Vira-lata Caramelo executa um ciclo fixo: sai da base, corre até o inimigo
mais avançado, morde e **sempre volta à base** antes de poder atacar de novo. Com
vários inimigos passando ao mesmo tempo, o cachorro gasta a maior parte do tempo
em trajetos de ida e volta — parece bobo e desperdiça dano.

Esta funcionalidade introduz o **perfil de engajamento**: uma característica
declarada da torre que descreve *como ela se comporta em relação ao ataque* —
se permanece na base atacando à distância, ou se sai para perseguir o alvo e
encadear alvos enquanto houver caça dentro do alcance.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Vira-lata encadeia alvos sem voltar à base (Priority: P1)

O jogador posiciona um Vira-lata Caramelo perto de uma curva por onde passa um
grupo de inimigos. O cachorro sai da base, morde o inimigo mais próximo do fim do
caminho e, em vez de voltar, já parte direto para o próximo inimigo dentro do seu
alcance, mordendo um após o outro. Ele se comporta como um cão solto no quintal
perseguindo intrusos — não como um ioiô preso à base.

**Why this priority**: É o coração do pedido e sozinho já entrega o valor —
o Vira-lata deixa de desperdiçar tempo em trajetos de volta e passa a causar dano
de forma contínua enquanto há alvos. Demonstrável isoladamente e sem depender das
outras histórias.

**Independent Test**: Colocar uma torre Vira-lata ao lado do caminho, deixar
passar uma fila de 3+ inimigos e observar que, entre a primeira e a segunda
mordida, o cachorro não retorna à base — vai direto de um alvo ao outro.

**Acceptance Scenarios**:

1. **Given** um Vira-lata com dois ou mais inimigos válidos dentro do alcance,
   **When** ele conclui a mordida no alvo atual, **Then** ele engaja o próximo
   alvo a partir da posição em que está, sem passar pela base.
2. **Given** um Vira-lata engajando alvos em sequência, **When** cada mordida é
   aplicada, **Then** o dano por mordida é exatamente o mesmo do comportamento
   atual (o encadeamento muda o deslocamento, não o dano).
3. **Given** um Vira-lata que acabou de morder, **When** existe mais de um
   inimigo válido dentro do alcance, **Then** o próximo alvo escolhido é o
   inimigo mais avançado no caminho (mais próximo do fim), e não o mais perto do
   cachorro.
4. **Given** um Vira-lata correndo em direção a um alvo, **When** esse alvo morre
   ou sai do alcance antes da mordida, **Then** nenhum dano é aplicado a ele e a
   torre reavalia imediatamente os alvos disponíveis, sem voltar à base se ainda
   houver alvo válido.

---

### User Story 2 - Vira-lata volta à base quando não há mais alvos (Priority: P2)

Terminada a leva de inimigos que estava ao alcance, o cachorro para de perseguir e
retorna calmamente ao seu posto, ficando ocioso na base até que um novo inimigo
entre no alcance. Se um inimigo aparecer no alcance enquanto ele ainda está
voltando, ele interrompe o retorno e parte para cima do novo alvo.

**Why this priority**: Fecha o ciclo de comportamento e mantém a leitura visual
clara de onde a torre "mora". Sem ela, o cachorro ficaria parado no meio do mapa
depois da última mordida — confuso e visualmente quebrado. Depende da US1 existir,
mas é testável de forma independente.

**Independent Test**: Deixar passar um único inimigo, matá-lo dentro do alcance e
observar o cachorro retornar à base e ficar ocioso lá; depois, spawnar um novo
inimigo enquanto ele volta e observar o reengajamento imediato.

**Acceptance Scenarios**:

1. **Given** um Vira-lata que acabou de concluir uma mordida, **When** não há
   nenhum inimigo válido dentro do alcance, **Then** ele inicia o retorno à base.
2. **Given** um Vira-lata retornando à base, **When** chega ao posto, **Then**
   fica ocioso na posição da base, pronto para um novo ciclo.
3. **Given** um Vira-lata em pleno retorno à base, **When** um inimigo válido
   entra no alcance, **Then** ele interrompe o retorno e engaja o novo alvo a
   partir da posição em que está.
4. **Given** uma partida em que a onda termina com o cachorro fora da base,
   **When** o último inimigo é eliminado, **Then** o cachorro retorna à base sem
   depender do início da próxima onda.

---

### User Story 3 - Perfil de engajamento como característica declarada da torre (Priority: P3)

O designer de jogo consegue definir, nos dados de cada torre, como aquela torre se
comporta ao atacar — "fica no posto" ou "sai para perseguir" — sem escrever regra
nova. O Vira-lata declara perseguição; futuras torres (ex.: uma torre de tiro à
distância) declaram permanência no posto e continuam funcionando como hoje.

**Why this priority**: É o que transforma um ajuste pontual do Vira-lata em uma
característica reutilizável do roster, alinhada à evolução data-driven do projeto.
O valor é para quem cria conteúdo, não diretamente para o jogador — por isso vem
depois do comportamento em si.

**Independent Test**: Alternar o perfil de engajamento do Vira-lata nos dados para
"estacionária" e verificar que ele volta a atacar sem sair do posto, sem nenhuma
alteração de código de sistema; depois voltar para "perseguidora".

**Acceptance Scenarios**:

1. **Given** o roster de torres, **When** uma torre declara o perfil
   "estacionária", **Then** ela ataca sem sair da base, exatamente como as torres
   se comportam hoje.
2. **Given** o roster de torres, **When** uma torre declara o perfil
   "perseguidora", **Then** ela sai da base, persegue, encadeia alvos e retorna
   conforme as regras das US1 e US2.
3. **Given** uma nova torre adicionada ao jogo, **When** o designer define seu
   perfil de engajamento, **Then** basta uma entrada de dados — nenhuma regra de
   combate, alvo ou economia precisa ser alterada.

---

### Edge Cases

- **Alvo morre durante a corrida**: o cachorro não aplica dano a um alvo morto;
  reavalia e engaja outro alvo válido no alcance ou inicia o retorno.
- **Alvo vaza (chega ao fim do caminho) durante a corrida**: mesmo tratamento —
  sem dano, reavaliação imediata.
- **Alvo sai do alcance durante a corrida** (o inimigo é mais rápido que a
  perseguição): o ataque é descartado e a torre reavalia; não há perseguição para
  fora do alcance.
- **Empate de progresso**: dois inimigos com o mesmo avanço no caminho dentro do
  alcance — a escolha é determinística (sempre o mesmo, dada a mesma lista), nunca
  aleatória, para não gerar oscilação de alvo entre frames.
- **Inimigo entra no alcance no exato instante do retorno**: o reengajamento vence
  — o cachorro não completa o trajeto de volta à toa.
- **Jogo pausado com o cachorro fora da base**: o estado congela; ao despausar,
  o comportamento continua de onde parou (nenhum salto ou teleporte).
- **Fim de partida / reinício com o cachorro fora da base**: a torre volta ao
  estado ocioso na base, sem resíduo visual de perseguição.
- **Torre sem sprite de ataque (assets ausentes)**: o encadeamento, o dano e o
  retorno continuam funcionando pelo tempo de fallback — o comportamento não
  depende da animação.
- **Alcance alto cobrindo dois trechos do caminho**: alvos em qualquer trecho
  dentro do alcance são válidos; a escolha continua sendo o mais avançado no
  caminho.

## Requirements *(mandatory)*

### Functional Requirements

#### Característica de engajamento

- **FR-001**: Toda torre MUST declarar, em seus dados, um **perfil de
  engajamento** que define como ela se comporta em relação ao ataque.
- **FR-002**: O sistema MUST suportar, nesta fatia, dois perfis: **estacionária**
  (ataca sem sair da base) e **perseguidora** (sai da base até o alvo, encadeia
  alvos e retorna quando não há mais alvos).
- **FR-003**: Torres com perfil **estacionária** MUST manter exatamente o
  comportamento atual — nenhuma regressão para o roster existente ou futuro.
- **FR-004**: Adicionar ou alterar o perfil de engajamento de uma torre MUST ser
  uma mudança de dados, sem alterar sistemas de combate, alvo ou economia.

#### Comportamento do Vira-lata Caramelo

- **FR-005**: O Vira-lata Caramelo MUST declarar o perfil **perseguidora**.
- **FR-006**: O Vira-lata Caramelo MUST ter alcance alto — significativamente
  maior que o atual, permitindo cobrir vários inimigos em fila (ver Assumptions
  para o valor inicial; é um valor de balanceamento ajustável em dados).
- **FR-007**: A regra de alvo do Vira-lata MUST continuar sendo **o inimigo vivo
  mais avançado no caminho (mais próximo do fim) dentro do alcance**, tanto no
  primeiro engajamento quanto em cada encadeamento.

#### Encadeamento e retorno

- **FR-008**: Ao concluir um ataque, uma torre perseguidora MUST, se houver ao
  menos um alvo válido dentro do alcance, engajar o próximo alvo **a partir da
  posição atual**, sem retornar à base.
- **FR-009**: Uma torre perseguidora MUST iniciar o retorno à base **somente**
  quando não houver nenhum alvo válido dentro do alcance.
- **FR-010**: Durante o retorno, se um alvo válido entrar no alcance, a torre MUST
  interromper o retorno e engajar esse alvo a partir da posição em que estiver.
- **FR-011**: Ao chegar à base sem alvos, a torre MUST ficar em estado ocioso na
  posição da base.
- **FR-012**: O alcance de uma torre perseguidora MUST ser medido a partir da
  **posição fixa da torre (a base)**, nunca da posição corrente do perseguidor.
  A torre opera sob "coleira": persegue, morde e encadeia apenas dentro do seu
  círculo de alcance, e nunca o ultrapassa — mesmo que o alvo continue visível
  logo além dele.
- **FR-012a**: O anel de alcance exibido ao jogador MUST corresponder exatamente à
  área em que a torre perseguidora pode atuar — o anel é o contrato visual do que
  a torre cobre, e o perseguidor jamais aparece fora dele.
- **FR-013**: A cadência da torre (ataques por segundo) MUST continuar governando
  o intervalo entre ataques, inclusive nos encadeamentos — encadear não permite
  atacar mais rápido que a cadência declarada.

#### Validade de alvo e integridade

- **FR-014**: Um alvo MUST deixar de ser válido ao morrer, ao vazar pelo fim do
  caminho ou ao sair do alcance; um alvo inválido MUST NOT receber dano, e a torre
  MUST reavaliar seus alvos imediatamente.
- **FR-015**: Nenhuma regra de gameplay (dano, alvo, encadeamento, retorno,
  cadência) MUST depender da existência ou do estado dos assets de animação — sem
  sprite, o comportamento é idêntico, apenas com temporização de fallback.
- **FR-016**: As regras de engajamento (escolher próximo alvo, decidir encadear vs.
  retornar, validade de alvo) MUST ser testáveis sem renderização.
- **FR-017**: A transição de estados do engajamento (ocioso → perseguindo →
  atacando → encadeando/retornando) MUST ser determinística e independente de
  frame rate.

### Key Entities

- **Perfil de Engajamento**: característica declarada da torre que define como ela
  se comporta em relação ao ataque. Nesta fatia: `estacionária` | `perseguidora`.
  Não carrega dano, alcance nem cadência — esses continuam sendo stats da torre,
  com fonte única.
- **Torre Perseguidora**: torre cujo perfil é `perseguidora`. Possui um estado de
  engajamento (ocioso na base, perseguindo alvo, atacando, retornando) e uma
  posição corrente que pode diferir da posição da base.
- **Alvo Válido**: inimigo vivo, ainda no caminho, dentro do alcance da torre.
- **Base**: posição fixa em que a torre foi construída; origem do alcance e destino
  do retorno.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Com dois ou mais inimigos válidos dentro do alcance, o Vira-lata
  encadeia mordidas sem retornar à base em **100%** dos casos.
- **SC-002**: Em uma fila de 3 inimigos dentro do alcance, o número de mordidas
  aplicadas em um mesmo intervalo de tempo aumenta em **pelo menos 50%** em
  relação ao comportamento atual (ida-e-volta a cada ataque).
- **SC-003**: O intervalo entre duas mordidas encadeadas é limitado apenas pela
  cadência e pelo tempo de deslocamento entre alvos — **nenhum tempo é gasto em
  trajeto até a base** enquanto houver alvo no alcance.
- **SC-004**: Após a saída/morte do último inimigo do alcance, o Vira-lata está
  ocioso na base em **até 2 segundos** (para o alcance e a velocidade de
  perseguição configurados).
- **SC-005**: Um jogador que observa uma onda consegue dizer, sem explicação
  prévia, **por que** o cachorro está onde está — ele persegue enquanto há
  inimigos e volta quando o caminho esvazia.
- **SC-006**: Adicionar uma torre com perfil `estacionária` ao roster não requer
  nenhuma alteração fora dos dados da torre.
- **SC-007**: Nenhuma regressão perceptível de performance: a taxa de quadros se
  mantém estável com o número de torres e inimigos suportado hoje.
- **SC-008**: Em **100%** dos ciclos de perseguição, o Vira-lata permanece dentro
  do círculo de alcance da sua base — nunca é observado atuando fora do anel
  mostrado ao jogador.

## Assumptions

- **Alcance inicial do Vira-lata**: "range alto" é interpretado como um aumento
  substancial sobre o valor atual (120 px) — assume-se **200 px** como ponto de
  partida. É um valor de balanceamento, ajustável nos dados sem tocar em regra.
- **Custo/dano/cadência inalterados**: esta fatia muda *como* a torre engaja, não
  quanto ela custa nem quanto dano causa por mordida. O rebalanceamento de custo,
  se necessário, é decisão futura de balanceamento.
- **Velocidade de perseguição e de retorno**: são propriedades de apresentação
  (deslocamento visual), já existentes, e não passam a ser regra de gameplay. O
  retorno usa a mesma velocidade da perseguição.
- **Regra de alvo única nesta fatia**: apenas "mais avançado no caminho" continua
  suportada. Outras regras (mais próximo, mais forte, mais fraco) ficam fora de
  escopo, ainda que o perfil de engajamento seja declarado de forma a acomodá-las
  depois.
- **Perfil padrão**: torres que não precisam perseguir declaram `estacionária`;
  esse é o comportamento equivalente ao roster atual.
- **Empate de alvos**: resolvido de forma determinística (primeiro encontrado na
  ordem de avaliação), sem sorteio.
- **Sem venda/remoção de torre**: o jogo ainda não permite vender torres, portanto
  o caso "torre removida com o cachorro fora da base" não é tratado nesta fatia.

## Out of Scope

- Novas regras de alvo (mais próximo, maior vida, prioridade por tipo).
- Novos perfis de engajamento além de `estacionária` e `perseguidora`
  (ex.: patrulha, orbital, área fixa).
- Upgrades que alterem o perfil de engajamento em tempo de jogo.
- Rebalanceamento geral de custo/dano/cadência do roster.
- Colisão ou bloqueio entre a torre perseguidora e os inimigos (a perseguição é
  deslocamento, não corpo físico).
