# Feature Specification: Nitidez dos sprites do inimigo (padrão para os demais)

**Feature Branch**: `006-nitidez-sprites`

**Created**: 2026-07-11

**Status**: Draft

**Input**: User description: "Melhorar a definição/nitidez do sprite do inimigo 'Dois Caras numa Moto' (e servir de padrão para os demais sprites). Agora que a moto é exibida grande, a perda de nitidez ficou visível — fantasma/tremido nas bordas na animação, borrão de sub-pixel em movimento e borrão de upscale em telas HiDPI/Retina. Manter a arte ilustrada (sem serrilhado de pixel art); nenhuma métrica de gameplay muda; fallback continua jogável; padrão reaproveitável pelos próximos inimigos com sheet."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A animação da moto não "fantasma" nem treme nas bordas (Priority: P1) 🎯 MVP

Ao acompanhar uma moto do começo ao fim do caminho, o jogador vê um sprite
animado limpo: cada quadro do ciclo de pilotar mostra **apenas** a moto, sem uma
tira do quadro vizinho aparecendo na borda e sem a borda direita cortada. A
animação não "escorrega" nem tremula ao longo do ciclo.

**Why this priority**: É o defeito de nitidez mais perceptível e o de maior
impacto. Hoje a grade de recorte da folha de sprites não bate com o conteúdo, e
o desalinhamento acumula ao longo dos quadros — some com isso e a moto já parece
muito mais definida, independentemente de tamanho ou tela.

**Independent Test**: Acompanhar uma moto do início ao fim e observar o ciclo de
pilotar quadro a quadro (inclusive com captura/zoom); confirmar que nenhum quadro
exibe conteúdo do quadro adjacente nem corte de borda, e que a animação é estável.

**Acceptance Scenarios**:

1. **Given** uma onda de motos em campo, **When** o ciclo de pilotar roda em loop,
   **Then** nenhum quadro mostra uma faixa do quadro vizinho ou borda cortada.
2. **Given** o sprite parado ou em movimento, **When** observado com zoom,
   **Then** as bordas da arte estão inteiras e alinhadas (sem "fantasma").
3. **Given** o mesmo asset em resolução maior, **When** exibido grande,
   **Then** a moto mantém definição (não pixela nem borra) por ter mais detalhe de origem.

---

### User Story 2 - O sprite fica nítido mesmo em movimento (Priority: P2)

Enquanto a moto se desloca pelo caminho, suas bordas permanecem nítidas — sem o
leve borrão/halo que aparece quando um sprite é desenhado "entre pixels".

**Why this priority**: Ganho de nitidez amplo (vale para todos os sprites) e de
baixo custo, mas menor que corrigir o fantasma da animação. Depende de tratar o
desenho em posições fracionárias, comum a qualquer objeto que se move.

**Independent Test**: Capturar a moto em movimento e comparar com a versão atual;
confirmar bordas mais definidas, sem halo de sub-pixel, mantendo o movimento fluido.

**Acceptance Scenarios**:

1. **Given** a moto se deslocando, **When** observada/capturada em movimento,
   **Then** as bordas estão nítidas, sem borrão de sub-pixel perceptível.
2. **Given** o ajuste de nitidez de movimento ativo, **When** a moto anda,
   **Then** o movimento continua fluido (sem "pulos" perceptíveis).

---

### User Story 3 - Nitidez em telas HiDPI/Retina (Priority: P3)

Em telas de alta densidade (Retina), a moto (e o jogo em geral) aparece tão
nítida quanto numa tela padrão, sem o borrão extra causado por ampliar a imagem
final para preencher a janela.

**Why this priority**: Melhora real, porém depende do dispositivo do jogador e
envolve mais risco (interage com o dimensionamento/escala da tela), por isso vem
por último e pode ser adiada se ameaçar o enquadramento ou as coordenadas.

**Independent Test**: Abrir o jogo numa tela HiDPI/Retina e comparar a nitidez da
moto com a de uma tela padrão; confirmar que não há borrão adicional de ampliação
e que o enquadramento/posicionamento do jogo permanece correto.

**Acceptance Scenarios**:

1. **Given** uma tela HiDPI/Retina, **When** o jogo é exibido,
   **Then** a moto tem nitidez equivalente à de uma tela padrão.
2. **Given** o ajuste de HiDPI ativo, **When** a janela é redimensionada,
   **Then** o campo de jogo continua enquadrado e centralizado, sem cortar conteúdo.

---

### Edge Cases

- **Sheet ainda não substituída**: enquanto o novo asset em resolução exata não
  chega, o jogo DEVE continuar jogável e sem erro — o recorte não pode quebrar.
- **Falha de carregamento do asset**: mantém o fallback (círculo + emoji),
  jogável, com a falha registrada (sem erro silencioso).
- **Proporção do novo asset diferente da atual**: o dimensionamento visual
  preserva a proporção do quadro; nenhuma métrica de gameplay muda.
- **Tela de densidade muito alta (3×) ou janela muito grande**: a nitidez de
  HiDPI não pode degradar o desempenho a ponto de perder fluidez.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A folha de sprites do inimigo DEVE ser recortada em quadros que
  correspondam exatamente à grade da arte (sem sobra/fração), de modo que cada
  quadro contenha apenas o seu conteúdo — eliminando o "fantasma" e o corte de
  borda ao longo da animação.
- **FR-002**: O jogo DEVE consumir uma versão da folha em resolução alta o
  bastante para que a moto, no tamanho de exibição atual, apareça definida (sem
  pixelar nem borrar por falta de detalhe de origem).
- **FR-003**: O sistema DEVE reduzir o borrão de sub-pixel dos sprites em
  movimento (desenho alinhado ao pixel), preservando um movimento fluido.
- **FR-004**: O sistema DEVE oferecer nitidez adequada em telas de alta densidade
  (HiDPI/Retina), sem borrão adicional de ampliação, mantendo o campo de jogo
  corretamente enquadrado e centralizado.
- **FR-005**: A arte DEVE permanecer no estilo ilustrado — a solução NÃO pode
  introduzir aparência de "pixel art"/serrilhado ao ampliar.
- **FR-006**: NENHUMA métrica de gameplay pode mudar: HP, velocidade, recompensa
  e raio de colisão continuam vindo dos dados do inimigo, intocados.
- **FR-007**: A barra de vida e o comportamento de combate permanecem idênticos
  ao atual (posição acima do sprite, dano/morte/recompensa inalterados).
- **FR-008**: O fallback (círculo + emoji) DEVE continuar jogável quando a folha
  não carregar, com a falha registrada (sem erro silencioso).
- **FR-009**: A solução DEVE ser um padrão reaproveitável: adicionar outro
  inimigo com folha de sprites segue o mesmo caminho, sem trabalho de nitidez
  específico por inimigo.
- **FR-010**: As dimensões de recorte da folha DEVEM ser derivadas de forma
  consistente com o asset (sem números "mágicos" que só valem para um arquivo
  específico e silenciosamente desalinham se o asset mudar).

### Key Entities *(include if feature involves data)*

- **Folha de sprites do inimigo (asset)**: imagem em grade de quadros
  (linha "pilotar" + linha "atirar"). Atributo-chave: dimensões que se dividem
  exatamente pela grade, em resolução suficiente para o tamanho de exibição.
- **Configuração de recorte da folha**: dimensão de cada quadro, coerente com o
  asset; fonte de verdade centralizada, sem repetição por inimigo.
- **Configuração de render/escala do jogo**: parâmetros de nitidez (alinhamento
  ao pixel, tratamento de alta densidade) aplicados globalmente, separados da
  lógica de gameplay.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Acompanhando uma moto do início ao fim, **0 quadros** da animação
  exibem faixa do quadro vizinho ou borda cortada.
- **SC-002**: Em captura com zoom, as bordas da moto ficam nítidas (sem halo/
  borrão perceptível) tanto parada quanto em movimento.
- **SC-003**: Em tela HiDPI/Retina, a nitidez da moto é equivalente à de uma tela
  padrão (sem borrão adicional de ampliação), com o campo de jogo enquadrado.
- **SC-004**: **Nenhuma** métrica de gameplay muda — HP, velocidade, recompensa e
  raio de colisão idênticos aos atuais.
- **SC-005**: Adicionar outro inimigo com folha de sprites não exige nenhum ajuste
  de nitidez específico (mesmo caminho da moto).
- **SC-006**: Com a folha indisponível, a partida segue jogável (fallback) e a
  falha aparece registrada.
- **SC-007**: O desempenho permanece fluido (sem regressão perceptível de FPS) com
  o volume de uma onda avançada após os ajustes de nitidez.

## Assumptions

- **Novo asset por conta da arte**: a correção principal (US1/FR-001/FR-002)
  depende de re-exportar a folha em dimensões que se dividem exatamente pela grade
  e em resolução maior. Resolução-alvo recomendada: ~2048×1024 (quadros 256×512),
  ajustável — o mínimo aceitável é qualquer dimensão que divida exatamente a grade.
  Enquanto o novo arquivo não chega, o jogo permanece jogável com o asset atual.
- **Estilo ilustrado mantido**: filtragem suave (linear) permanece; a feature NÃO
  adota renderização "pixel art"/vizinho-mais-próximo.
- **Gameplay data-driven intocado**: raio/hitbox e stats continuam nos dados do
  inimigo; esta é uma feature de apresentação.
- **HiDPI pode ser adiada**: US3 é a de maior risco (interage com o
  dimensionamento da janela) e pode ser entregue depois ou omitida se comprometer
  o enquadramento/coordenadas — sem bloquear US1/US2.
- **Escopo**: foca no inimigo "Dois Caras numa Moto" como caso de referência; os
  ajustes globais (movimento/HiDPI) beneficiam todos os sprites, mas não há
  re-exportação de outros assets nesta feature.
