# Feature Specification: Sprite animado e orientação do inimigo "Dois Caras numa Moto"

**Feature Branch**: `005-inimigo-moto-sprite`

**Created**: 2026-07-11

**Status**: Draft

**Input**: User description: "Inimigo 'Dois Caras numa Moto' renderizado como sprite animado a partir de um sprite sheet, substituindo o placeholder atual (círculo + emoji 🛵). Requisito central: DIREÇÃO/orientação do sprite ao longo do caminho — em nenhum momento a moto pode aparentar 'andar de ré'."

## Clarifications

### Session 2026-07-11

- Q: Como o sprite deve se orientar ao longo do caminho (FR-009)? → A: Espelhamento horizontal (por sentido) **+ inclinação discreta**; sem rotação livre.
- Q: Qual a granularidade e a magnitude da inclinação discreta? → A: **3 estados** — subindo / plano / descendo — com inclinação sutil (~±15°); o flip horizontal é independente da inclinação.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver a moto como sprite animado percorrendo o caminho (Priority: P1)

Quando uma onda começa e o inimigo "Dois Caras numa Moto" entra no mapa, o
jogador o vê como um sprite animado — o ciclo de "pilotar/andar" em loop
contínuo — no lugar do placeholder atual (círculo colorido + emoji 🛵). O
inimigo continua se comportando exatamente como antes: mesmo HP, mesma
velocidade, mesma recompensa, mesmo raio de colisão. A barra de vida permanece
acima do sprite.

**Why this priority**: É a essência do pedido e entrega valor sozinha — dá
identidade visual ao primeiro inimigo do jogo, reforçando o tema brasileiro, e
é o mínimo demonstrável.

**Independent Test**: Iniciar uma partida, deixar uma onda de motos entrar e
confirmar que elas aparecem como sprite animado (ciclo de pilotar em loop), sem
qualquer alteração nas métricas de gameplay observáveis.

**Acceptance Scenarios**:

1. **Given** a sprite sheet do inimigo carregada com sucesso,
   **When** um inimigo "Dois Caras numa Moto" é spawnado numa onda,
   **Then** ele aparece renderizado como sprite animado tocando o ciclo de
   "pilotar/andar" em loop infinito enquanto se move.
2. **Given** uma moto em movimento pelo caminho,
   **When** ela recebe dano de uma torre,
   **Then** a barra de vida acima do sprite reflete o dano e o comportamento de
   combate (HP, morte, recompensa) é idêntico ao da versão com placeholder.
3. **Given** uma moto animada no campo,
   **When** ela é observada em relação a torres, caminho e HUD,
   **Then** a ordem de profundidade (depth) permanece consistente com a atual,
   sem cobrir indevidamente a UI nem ficar atrás do caminho.

---

### User Story 2 - A moto sempre aponta para onde está indo (Priority: P1)

À medida que a moto percorre o caminho — que faz curvas e inverte o sentido
horizontal ao longo da rota — o sprite reflete a direção do deslocamento. A arte
original olha para a esquerda; quando o inimigo se move para a direita, o sprite
é espelhado horizontalmente. Em nenhum momento a moto aparenta "andar de ré"
(apontar para o lado oposto ao do movimento).

**Why this priority**: É o requisito central desta feature. Sem orientação
correta, a moto parece andar de ré em trechos do caminho, quebrando a
credibilidade visual — um defeito imediatamente perceptível.

**Independent Test**: Colocar uma moto para percorrer o caminho inteiro e
verificar, em cada segmento, que o sprite aponta para o mesmo sentido horizontal
do deslocamento (nunca para o sentido oposto).

**Acceptance Scenarios**:

1. **Given** a moto num segmento cujo deslocamento é para a direita,
   **When** ela se move nesse segmento,
   **Then** o sprite aparece orientado para a direita (arte espelhada em relação
   à orientação natural que olha para a esquerda).
2. **Given** a moto num segmento cujo deslocamento é para a esquerda,
   **When** ela se move nesse segmento,
   **Then** o sprite aparece orientado para a esquerda (orientação natural da
   arte, sem espelhamento horizontal).
3. **Given** a moto atravessando uma curva onde o sentido horizontal se inverte,
   **When** ela cruza o ponto de inversão,
   **Then** a orientação do sprite acompanha a mudança de sentido, e em nenhum
   frame a moto aparenta andar de ré.
4. **Given** um segmento predominantemente vertical (subida/descida quase reta),
   **When** a moto o percorre,
   **Then** a orientação escolhida não faz a moto aparentar andar de ré (mantém
   o último sentido horizontal coerente até haver deslocamento horizontal claro).
5. **Given** um segmento em subida (ou descida),
   **When** a moto o percorre,
   **Then** o sprite recebe a inclinação discreta correspondente (nariz para cima
   ao subir, para baixo ao descer, ~±15°), coerente com o sentido horizontal e
   sem inverter subida/descida ao trocar de lado.

---

### User Story 3 - Fallback jogável quando a sheet não carrega (Priority: P2)

Se a sprite sheet do inimigo falhar ao carregar, o jogo não trava: o inimigo
volta ao placeholder (círculo colorido + emoji 🛵) e a partida segue totalmente
jogável, com a falha registrada/visível (sem erro silencioso). É o mesmo
contrato de fallback já usado nas torres.

**Why this priority**: Garante robustez e alinha ao princípio de assets
substituíveis, mas é secundário: o valor visual principal já é entregue pelas
Stories 1 e 2 quando a sheet carrega.

**Independent Test**: Simular a ausência/falha do asset e confirmar que a moto
aparece como círculo + emoji, se move normalmente e a partida continua jogável,
com registro da falha.

**Acceptance Scenarios**:

1. **Given** a sprite sheet indisponível ou com falha de carregamento,
   **When** um inimigo "Dois Caras numa Moto" é spawnado,
   **Then** ele é renderizado com o placeholder (círculo + emoji) e percorre o
   caminho normalmente, sem travar o jogo.
2. **Given** a falha de carregamento do asset,
   **When** o jogo inicializa,
   **Then** a falha é registrada/visível (log ou aviso), sem erro silencioso.

---

### Edge Cases

- **Inversão de sentido em curva fechada**: em pontos onde a rota inverte o
  sentido horizontal, a troca de orientação deve ocorrer de forma perceptível
  como "virar", sem frames em que a moto aparente andar de ré.
- **Segmento puramente vertical**: quando o deslocamento não tem componente
  horizontal significativa, não há sentido esquerda/direita a inferir; a
  orientação deve manter o último sentido horizontal válido em vez de "resetar"
  para um lado arbitrário. A inclinação discreta (subindo/descendo), porém,
  aplica-se normalmente com base na componente vertical.
- **Fronteira entre estados de inclinação**: a mudança entre subindo/plano/
  descendo deve ocorrer por faixas (thresholds) da inclinação do segmento, sem
  oscilação (flicker) perceptível quando o ângulo fica próximo de uma fronteira.
- **Proporção do frame diferente do espaço do inimigo**: cada frame é mais alto
  que largo; o sprite é dimensionado pela largura (≈ 2,6× o raio) preservando a
  proporção, sem distorção e sem alterar o raio de colisão, que continua definido
  pelos dados do inimigo.
- **Falha ao carregar o asset**: coberto pela User Story 3 (fallback + registro).
- **Animação de "atirar" ainda sem uso**: a sequência de tiro é registrada mas
  não é disparada nesta feature; sua existência não deve interferir no ciclo de
  pilotar em loop.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O inimigo "Dois Caras numa Moto", quando a sprite sheet estiver
  disponível, MUST ser representado por um sprite animado tocando o ciclo de
  "pilotar/andar" em loop infinito enquanto percorre o caminho, no lugar do
  placeholder atual (círculo + emoji).
- **FR-002**: A troca de visual MUST NOT alterar qualquer regra ou métrica de
  gameplay do inimigo (HP, velocidade, recompensa e raio de colisão permanecem
  os definidos nos dados do inimigo).
- **FR-003**: A barra de vida MUST continuar sendo exibida acima do sprite e
  refletir o dano recebido, como na versão com placeholder.
- **FR-004**: O sprite MUST ser dimensionado pela largura de exibição ≈ 2,6× o
  raio do inimigo, preservando a proporção do frame, sem distorção e sem alterar
  a área de colisão.
- **FR-005**: A ordem de profundidade (depth) do inimigo renderizado MUST
  permanecer consistente com a atual.
- **FR-006**: O sprite MUST refletir o sentido horizontal do deslocamento do
  inimigo ao longo dos segmentos do caminho: espelhado quando o movimento é para
  a direita, na orientação natural quando é para a esquerda.
- **FR-007**: Em nenhum momento o inimigo MUST aparentar "andar de ré" — o
  sprite não pode apontar para o lado horizontal oposto ao do seu deslocamento
  (critério de aceite central).
- **FR-008**: Em segmentos sem componente horizontal significativa (movimento
  praticamente vertical), o sistema MUST manter a última orientação horizontal
  válida, em vez de assumir um lado arbitrário.
- **FR-009**: Além do espelhamento horizontal, o sprite MUST receber uma
  **inclinação discreta** derivada da inclinação do segmento atual, limitada a
  **3 estados** — subindo / plano / descendo — com magnitude sutil (~±15°). O
  sistema MUST NOT aplicar rotação livre (360°) nem inclinações fora desses
  estados, preservando a leitura da arte em perspectiva 3/4.
- **FR-009a**: A inclinação discreta (FR-009) MUST ser independente do
  espelhamento horizontal (FR-006): o estado subindo/plano/descendo é escolhido
  pela componente vertical do deslocamento e permanece coerente qualquer que seja
  o sentido horizontal, sem inverter a leitura de "subindo" vs "descendo".
- **FR-010**: Caso o carregamento da sprite sheet falhe, o sistema MUST manter o
  inimigo funcional com o fallback visual (círculo + emoji) e registrar/exibir a
  falha, sem erro silencioso.
- **FR-011**: O asset MUST ser referenciado por um identificador estável (chave
  de textura + chave de animação), e não por caminho ou dimensões embutidos na
  lógica de gameplay.
- **FR-012**: O carregamento e o registro das animações do inimigo MUST ocorrer
  de forma centralizada (no ponto de carregamento de assets), de modo que o
  inimigo esteja pronto para animar quando spawnado.
- **FR-013**: A sequência de animação de "atirar" (mira à frente + muzzle flash)
  MUST ser registrada/disponível a partir da sheet para uso futuro, mas MUST NOT
  ser disparada nesta feature (sem comportamento de tiro/dano do inimigo).
- **FR-014**: Adicionar um novo inimigo baseado em sprite sheet MUST ser uma
  questão de dados (chave de textura + definição de animação), sem exigir código
  novo específico por inimigo.

### Key Entities

- **Sprite sheet do inimigo (Dois Caras numa Moto)**: recurso visual em grade
  uniforme de 8 colunas × 2 linhas (16 frames); a linha 1 (frames 0–7) é o ciclo
  de "pilotar/andar" e a linha 2 (frames 8–15) é a sequência de "atirar". Cada
  frame preserva proporção mais alta que larga. Substituível sem impacto nas
  regras de gameplay.
- **Definição de animação do inimigo**: identificadores estáveis para os clipes
  "pilotar" (loop) e "atirar" (uma vez), associados à textura por chave;
  consumidos de forma data-driven.
- **Orientação do inimigo**: estado derivado do deslocamento ao longo do
  caminho, com dois eixos independentes — (1) espelhamento horizontal pelo
  sentido esquerda/direita e (2) inclinação discreta em 3 estados
  (subindo/plano/descendo, ~±15°) pela componente vertical. Determina a
  apresentação do sprite; independente das dimensões visuais e das regras de
  gameplay.
- **Tipo de inimigo "Dois Caras numa Moto"**: configuração data-driven que
  define métricas de gameplay (HP, velocidade, recompensa, raio) e referencia a
  apresentação por identificadores estáveis (textura/animação).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Ao percorrer o caminho completo, o inimigo aparece como sprite
  animado em 100% do trajeto quando a sheet está carregada (nenhum trecho exibe
  o placeholder).
- **SC-002**: Em 100% dos segmentos do caminho, o sentido horizontal do sprite
  coincide com o sentido horizontal do deslocamento — zero ocorrências de "andar
  de ré" observadas ao acompanhar uma moto do início ao fim.
- **SC-002a**: A inclinação do sprite assume exatamente um de 3 estados
  (subindo/plano/descendo, ~±15°) e, em cada segmento, corresponde à componente
  vertical do deslocamento — sem rotação fora desses estados e sem inverter
  subida/descida ao trocar de sentido horizontal.
- **SC-003**: Nenhuma métrica de gameplay do inimigo (HP, velocidade,
  recompensa, raio de colisão) muda em relação à versão com placeholder — o
  resultado de uma onda é idêntico com e sem o sprite.
- **SC-004**: Com a sheet indisponível, 100% das partidas permanecem jogáveis com
  o fallback (círculo + emoji) e a falha é registrada de forma visível.
- **SC-005**: Adicionar um segundo inimigo com sprite sheet requer apenas novas
  entradas de dados (textura + animação + tipo de inimigo), sem novo código
  específico por inimigo.
- **SC-006**: A introdução do sprite animado não causa regressão perceptível de
  desempenho com o volume de inimigos típico de uma onda avançada (framerate
  estável em relação à versão com placeholder).

## Assumptions

- A arte da moto olha naturalmente para a esquerda; inimigos entram no caminho
  indo para a direita, portanto o estado inicial padrão é espelhado.
- O caminho é o `PATH` de waypoints já existente; a orientação é derivada do
  vetor entre o ponto atual e o próximo waypoint (sentido do deslocamento).
- O contrato de fallback (sprite quando a textura existe; caso contrário,
  círculo + emoji) segue o mesmo padrão já adotado para as torres.
- A grade da sheet é uniforme (8×2, frames de 221×443 px numa imagem de
  1774×887 px), permitindo fatiar por índice de frame sem metadados externos.
- O dimensionamento visual (largura ≈ 2,6× o raio) é uma escolha de apresentação
  e não afeta o raio de colisão definido nos dados.
- Comportamento de tiro/dano do inimigo está fora de escopo; apenas a animação
  "atirar" é registrada para uso futuro.
- Sprites de outros inimigos estão fora de escopo nesta feature.
- A orientação combina espelhamento horizontal (por sentido) com inclinação
  discreta em 3 estados (subindo/plano/descendo, ~±15°), decidido na
  clarificação de 2026-07-11 (FR-009). Rotação livre 360° está fora de escopo. O
  espelhamento horizontal, sozinho, já satisfaz o critério de "nunca andar de ré"
  (FR-007); a inclinação é refinamento de apresentação sobre esse baseline.
- Os limiares (thresholds) que separam subindo/plano/descendo e o que conta como
  "componente horizontal significativa" são detalhes de tunning de apresentação,
  a definir no plano, sem impacto nas regras de gameplay.
