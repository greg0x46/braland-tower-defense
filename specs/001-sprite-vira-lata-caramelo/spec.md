# Feature Specification: Sprite da torre Vira-lata Caramelo

**Feature Branch**: `001-sprite-vira-lata-caramelo`

**Created**: 2026-07-11

**Status**: Draft

**Input**: User description: "Queremos atualizar o sprite da torre do vira lata caremelo com essa imagem 2d-game-tower-defense-sprite-of-a-caramel-colored-.png, ela pode ser renomeada e movida para o local adequeado."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver a torre Vira-lata Caramelo com sua arte no campo (Priority: P1)

Ao construir uma torre Vira-lata Caramelo no mapa, o jogador vê a ilustração
do cachorro caramelo no lugar do placeholder atual (círculo colorido + emoji
🐕). A torre continua se comportando exatamente como antes — mesmo alcance,
mesma cadência, mesmo dano, mesma área de colisão/interação.

**Why this priority**: É a essência do pedido e entrega valor sozinha. Dar
identidade visual à primeira torre reforça o tema brasileiro do jogo e é o
mínimo demonstrável que satisfaz a solicitação.

**Independent Test**: Construir uma Vira-lata Caramelo em uma partida e
confirmar que a arte do cachorro aparece na posição da torre, sem alterar
nenhuma métrica de gameplay observável.

**Acceptance Scenarios**:

1. **Given** o jogador tem saldo suficiente e selecionou a Vira-lata Caramelo,
   **When** posiciona a torre em um local válido do mapa,
   **Then** a torre aparece renderizada com a ilustração do cachorro caramelo
   no lugar do círculo + emoji.
2. **Given** uma Vira-lata Caramelo já construída,
   **When** o jogador passa o mouse sobre ela,
   **Then** o anel de alcance continua sendo exibido corretamente, centrado na
   torre, com o mesmo raio de antes.
3. **Given** uma onda em andamento,
   **When** a Vira-lata Caramelo dispara,
   **Then** os projéteis saem da posição da torre e o comportamento de combate
   (alvo, cadência, dano) é idêntico ao da versão com placeholder.

---

### User Story 2 - Reconhecer a torre no menu de construção (Priority: P2)

No menu lateral de torres (HUD), o card da Vira-lata Caramelo exibe a mesma
identidade visual da torre, de modo que o jogador associe o card à unidade que
verá no campo.

**Why this priority**: Melhora a coesão visual e o reconhecimento, mas é
secundário: o jogo permanece jogável e temático mesmo se o card mantiver o
emoji por ora.

**Independent Test**: Abrir o jogo e verificar que o card da Vira-lata
Caramelo na sidebar apresenta uma representação visual consistente com a torre
construída no campo.

**Acceptance Scenarios**:

1. **Given** o jogo iniciado,
   **When** o jogador observa a sidebar de torres,
   **Then** o card da Vira-lata Caramelo mostra uma representação visual
   coerente com a arte da torre.

---

### Edge Cases

- **Proporção da imagem difere do espaço da torre**: a ilustração original é
  retangular/alta e inclui a base de pedra; ela precisa ser ajustada
  (escala/enquadramento) ao espaço visual da torre sem distorção evidente e sem
  alterar a área de colisão/interação, que permanece definida pelos dados da
  torre, não pelas dimensões da imagem.
- **Falha ao carregar a imagem**: se o asset não puder ser carregado, o jogo
  não deve travar silenciosamente; a torre deve permanecer funcional (com um
  visual de fallback) e a falha deve ser registrada/visível.
- **Sobreposição visual com inimigos/caminho**: a arte da torre deve respeitar
  a mesma ordem de profundidade (depth) da versão atual, para não cobrir
  indevidamente a UI nem ficar atrás do caminho.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A torre Vira-lata Caramelo, quando construída no mapa, MUST ser
  representada visualmente pela ilustração fornecida no lugar do placeholder
  atual (círculo colorido + emoji).
- **FR-002**: A troca de visual MUST NOT alterar qualquer regra ou métrica de
  gameplay da torre (custo, alcance, dano, cadência, velocidade de projétil e
  raio de colisão/interação permanecem os definidos nos dados da torre).
- **FR-003**: O anel de alcance e a interação de hover MUST continuar
  funcionando, centrados na torre e com o mesmo raio, independentemente das
  dimensões da imagem.
- **FR-004**: A imagem original MUST ser renomeada para um nome estável e
  descritivo e movida para o local adequado de assets do projeto, deixando de
  residir na raiz do repositório.
- **FR-005**: O asset MUST ser referenciado por um identificador estável, e não
  por caminho ou dimensões embutidos na lógica de gameplay.
- **FR-006**: O carregamento do novo asset MUST ocorrer de forma centralizada
  (no ponto de carregamento de assets do jogo), de modo que a torre já esteja
  pronta para renderizar quando construída.
- **FR-007**: Caso o carregamento do asset falhe, o sistema MUST manter a torre
  funcional com um fallback visual e registrar/exibir a falha, sem erro
  silencioso.
- **FR-008**: A ordem de profundidade (depth) da torre renderizada MUST
  permanecer consistente com a atual (torres acima do caminho e dos inimigos,
  conforme a camada de profundidade já usada).

### Key Entities

- **Asset da torre (sprite Vira-lata Caramelo)**: recurso visual que
  representa a torre no campo, associado ao tipo de torre por um identificador
  estável; substituível sem impacto nas regras de gameplay.
- **Tipo de torre "Vira-lata Caramelo"**: configuração data-driven que define
  as métricas de gameplay da torre; a apresentação (emoji/forma hoje, sprite
  agora) é referenciada por identificador e desacoplada dessas métricas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das torres Vira-lata Caramelo construídas em uma partida
  aparecem com a arte do cachorro caramelo (nenhuma exibe o placeholder antigo).
- **SC-002**: Nenhuma métrica de gameplay observável da torre muda após a troca
  — alcance, dano, cadência, custo e comportamento de alvo permanecem idênticos
  aos anteriores (verificável pelos testes de regra existentes, que continuam
  passando).
- **SC-003**: Um observador consegue identificar a torre como o "vira-lata
  caramelo" a partir da arte em menos de 2 segundos, sem depender do emoji.
- **SC-004**: A imagem não existe mais na raiz do repositório e passa a residir
  no diretório de assets do projeto com nome descritivo estável.
- **SC-005**: A verificação de tipos do projeto (`npm run build`) continua
  passando após a mudança.

## Assumptions

- O escopo é **visual**: substituir a apresentação da torre Vira-lata Caramelo;
  nenhuma mudança de balanceamento ou de mecânica é pretendida.
- Apenas a torre Vira-lata Caramelo é afetada; as demais torres previstas no
  roadmap (Motoboy, Faria Limer etc.) não fazem parte desta fatia.
- A ilustração fornecida inclui uma base de pedra decorativa; assume-se que ela
  será usada como está (enquadrada/escalada ao espaço da torre), sem exigir
  recorte manual do cachorro, salvo se o enquadramento ficar visualmente ruim.
- O jogo continua sem animações para esta torre nesta fatia — trata-se de uma
  imagem estática substituindo o placeholder estático.
- O card da sidebar (User Story 2) é desejável, mas pode ser entregue de forma
  mínima (ex.: reutilizando a mesma arte); não requer redesenho do layout do
  HUD.
- A área de colisão/interação continua derivada do raio definido nos dados da
  torre, nunca das dimensões em pixels da imagem.
