# Feature Specification: Mapa inicial com imagem

**Feature Branch**: `002-initial-map-image`

**Created**: 2026-07-11

**Status**: Draft

**Input**: User description: "Usar image.png como o mapa visual inicial do jogo, substituindo o fundo e a trilha desenhados por código, mantendo inimigos e validação de construção baseados no caminho de gameplay existente. A imagem deve ocupar apenas a área jogável, preservar HUD/sidebar, ajustar caminho e largura da estrada, oferecer fallback visual se falhar ao carregar, evitar um sistema completo de múltiplos mapas agora e deixar a solução preparada para evoluir futuramente para uma definição de mapa."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver o mapa ilustrado ao iniciar a partida (Priority: P1)

Ao iniciar o jogo, o jogador vê a arte do mapa como fundo da área jogável,
sem a trilha visual antiga sobreposta e sem que a imagem invada a sidebar ou
oculte o HUD.

**Why this priority**: Esta é a entrega central da feature. Sem a arte do mapa
ocupando corretamente o campo de jogo, a mudança não entrega valor visual nem
preserva a usabilidade atual.

**Independent Test**: Iniciar uma partida e confirmar visualmente que a imagem
preenche a área jogável de forma proporcional, enquanto HUD e sidebar continuam
visíveis e funcionais.

**Acceptance Scenarios**:

1. **Given** o jogo iniciado com a arte do mapa disponível, **When** a área de
   jogo é exibida, **Then** a imagem aparece como fundo do campo jogável e não
   cobre a sidebar.
2. **Given** a imagem de mapa renderizada, **When** o jogador observa o caminho
   no campo, **Then** a trilha antiga desenhada por formas simples não aparece
   por cima da arte.
3. **Given** o HUD e a sidebar existentes, **When** o mapa ilustrado é exibido,
   **Then** os controles, informações de vida/dinheiro/onda e interações
   existentes permanecem visíveis e utilizáveis.

---

### User Story 2 - Jogar com inimigos e construção alinhados à estrada (Priority: P1)

Durante a partida, os inimigos seguem a estrada desenhada na imagem de maneira
visualmente coerente, e o jogador não consegue construir torres sobre essa
estrada, mas consegue construir em áreas livres.

**Why this priority**: A arte só funciona como mapa se o comportamento de
movimento e construção continuar coerente com o que o jogador vê.

**Independent Test**: Iniciar uma onda, observar o percurso dos inimigos sobre
a estrada da imagem e tentar construir torres em pontos sobre e fora da estrada.

**Acceptance Scenarios**:

1. **Given** uma onda em andamento, **When** os inimigos percorrem o mapa,
   **Then** sua rota acompanha a estrada ilustrada com desalinhamento visual
   mínimo e sem atravessar áreas que pareçam bloqueadas.
2. **Given** o jogador tenta posicionar uma torre sobre a estrada, **When** a
   posição é avaliada, **Then** a construção é rejeitada.
3. **Given** o jogador tenta posicionar uma torre em uma área livre fora da
   estrada, **When** a posição é avaliada e demais regras de construção são
   satisfeitas, **Then** a construção é permitida.

---

### User Story 3 - Continuar jogável quando a arte falhar (Priority: P2)

Se a arte do mapa não puder ser carregada, o jogo continua jogável com um fundo
simples de fallback, mantendo o caminho real, a construção, os inimigos e a UI
funcionando.

**Why this priority**: A constitution do projeto exige que assets sejam
substituíveis e que falhas não deixem o jogo inutilizável ou silenciosamente
quebrado.

**Independent Test**: Simular ausência ou falha da arte do mapa e iniciar uma
partida, verificando que ainda é possível jogar e depurar o caminho.

**Acceptance Scenarios**:

1. **Given** a arte do mapa indisponível, **When** o jogo inicia, **Then** um
   fundo simples aparece na área jogável e a partida continua funcional.
2. **Given** a arte do mapa indisponível, **When** a falha ocorre, **Then** a
   falha é registrada ou sinalizada de forma útil para desenvolvimento.
3. **Given** o fallback visual ativo, **When** uma onda é iniciada e torres são
   posicionadas, **Then** movimento, construção e HUD continuam funcionando.

---

### User Story 4 - Depurar o caminho real sobre o mapa (Priority: P3)

Em modo de depuração, o desenvolvedor consegue visualizar o caminho real usado
pelo gameplay sobre a imagem do mapa ou sobre o fallback, facilitando ajustes de
alinhamento e largura da estrada.

**Why this priority**: É importante para manter a solução ajustável e testável,
mas não é necessária para o jogador final completar uma partida.

**Independent Test**: Ativar a visualização de depuração e confirmar que o
caminho de gameplay aparece sobre o mapa sem se tornar parte do visual normal do
jogo.

**Acceptance Scenarios**:

1. **Given** a depuração ativada, **When** o mapa é exibido, **Then** o caminho
   real usado por inimigos e validação de construção fica visível sobre o mapa.
2. **Given** a depuração desativada, **When** o mapa é exibido, **Then** nenhum
   overlay de caminho aparece no visual normal da partida.

### Edge Cases

- **Falha de carregamento da arte do mapa**: o jogo deve continuar jogável com
  um fallback visual simples e a falha deve ser perceptível para desenvolvimento.
- **Proporção da imagem diferente da área jogável**: a imagem deve ser ajustada
  proporcionalmente para preencher a área jogável sem invadir sidebar/HUD nem
  distorcer de forma perceptível a estrada.
- **Áreas livres próximas da estrada**: a largura efetiva usada para bloquear
  construção deve ser ampla o suficiente para evitar torres visualmente sobre a
  estrada, mas não tão ampla a ponto de bloquear áreas claramente livres.
- **Caminho real fora da arte visível**: pontos do caminho devem permanecer
  dentro da área jogável e visualmente relacionados à estrada da imagem.
- **Fallback com depuração**: mesmo sem a arte do mapa, o caminho real deve
  continuar visível quando a depuração estiver ativada.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O jogo MUST exibir a arte fornecida como mapa visual inicial da
  área jogável quando essa arte estiver disponível.
- **FR-002**: A arte do mapa MUST ficar restrita ao campo jogável e MUST NOT
  cobrir ou deslocar a sidebar, o HUD ou controles existentes.
- **FR-003**: A arte do mapa MUST preencher a área jogável mantendo proporção
  visual aceitável, sem distorção perceptível da estrada.
- **FR-004**: O visual antigo de fundo e trilha desenhados por formas simples
  MUST NOT aparecer sobre a arte do mapa durante o jogo normal.
- **FR-005**: Inimigos MUST continuar usando um caminho de gameplay separado da
  arte visual para determinar sua movimentação.
- **FR-006**: O caminho de gameplay MUST ser ajustado para acompanhar a estrada
  desenhada na arte do mapa com coerência visual.
- **FR-007**: A validação de construção MUST continuar usando o mesmo caminho de
  gameplay para impedir torres sobre a estrada.
- **FR-008**: A largura efetiva da estrada usada pelas regras de construção MUST
  ser revisada para combinar com a estrada visível na arte do mapa.
- **FR-009**: O jogador MUST ser impedido de construir torres sobre a estrada
  visível e MUST conseguir construir torres em áreas livres quando as demais
  regras de construção forem satisfeitas.
- **FR-010**: Se a arte do mapa falhar ao carregar, o jogo MUST continuar
  jogável com um fallback visual simples para a área jogável.
- **FR-011**: Falhas de carregamento da arte do mapa MUST ser registradas ou
  sinalizadas de forma útil para desenvolvimento, sem erro silencioso.
- **FR-012**: A visualização de depuração MUST continuar capaz de mostrar o
  caminho real usado pelo gameplay sobre o mapa ou sobre o fallback.
- **FR-013**: A solução MUST permanecer limitada a um único mapa inicial nesta
  fatia e MUST NOT introduzir um sistema completo de seleção ou múltiplos mapas.
- **FR-014**: As referências ao mapa visual, dimensões relevantes e caminho de
  gameplay MUST ter fonte clara e única, evitando duplicação de constantes ou
  valores espalhados.
- **FR-015**: A mudança MUST preservar as regras de gameplay existentes fora dos
  ajustes necessários de alinhamento do caminho e largura da estrada.

### Key Entities

- **Mapa visual inicial**: arte exibida como fundo do campo jogável; representa
  o terreno, a estrada e o contexto visual da partida inicial.
- **Caminho de gameplay**: sequência de pontos usada para movimentação dos
  inimigos e validação de construção; permanece separado da imagem e testável
  como regra de jogo.
- **Largura efetiva da estrada**: medida usada pelas regras para determinar a
  área onde construção deve ser bloqueada ao redor do caminho de gameplay.
- **Fallback visual do mapa**: apresentação simples da área jogável usada quando
  a arte principal não está disponível.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% das inicializações com a arte disponível, o mapa ilustrado
  aparece apenas na área jogável e não cobre sidebar ou HUD.
- **SC-002**: Em 100% das partidas observadas, a trilha visual antiga não aparece
  por cima da arte do mapa durante o jogo normal.
- **SC-003**: Pelo menos 90% do percurso dos inimigos fica visualmente alinhado
  ao centro da estrada ilustrada, aceitando pequenos desvios apenas onde a arte
  exigir transições suaves.
- **SC-004**: Tentativas de construção em pontos sobre a estrada são rejeitadas
  em 100% dos casos de teste definidos, enquanto pontos claramente livres fora
  da estrada permanecem construíveis quando as demais regras permitem.
- **SC-005**: Uma falha simulada da arte do mapa ainda permite iniciar partida,
  começar uma onda e construir uma torre válida sem travar o jogo.
- **SC-006**: A visualização de depuração permite identificar o caminho real em
  menos de 5 segundos após ser ativada.
- **SC-007**: As verificações existentes do projeto continuam passando após a
  mudança.

## Assumptions

- A imagem fornecida é a arte oficial temporária do mapa inicial para esta
  fatia, mesmo que possa ser substituída futuramente.
- A área jogável existente continua tendo sidebar e HUD separados; a feature não
  altera layout, fluxo de ondas, tipos de torres, inimigos ou economia.
- O mapa permanece único nesta fase; a preparação para uma definição de mapa
  futura significa organizar nomes e fontes de verdade, não criar seleção de
  mapas ou editor.
- O caminho de gameplay é a autoridade para movimento e construção; a imagem é
  apenas a representação visual que deve ser alinhada a essa autoridade.
- Pequenos ajustes de balanceamento visual de caminho/largura são permitidos
  apenas para alinhar a estrada e a construção à imagem; demais balanceamentos
  permanecem fora de escopo.
