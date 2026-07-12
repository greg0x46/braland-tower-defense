# Feature Specification: Efeitos Sonoros de Combate

**Feature Branch**: `011-efeitos-sonoros-combate`

**Created**: 2026-07-12

**Status**: Draft

**Input**: User description: "gostaria de implementar efeitos sonoros para as torres e enemies"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Torres soam ao atacar (Priority: P1)

O jogador constrói torres e inicia uma onda. Quando as torres disparam ou aplicam
dano, o jogo emite efeitos curtos e claros, reforçando que a defesa está agindo
sem exigir que o jogador leia números ou acompanhe cada projétil visualmente.

**Why this priority**: O pedido cita torres diretamente, e o som de ataque é o
feedback mais importante para tornar o combate mais legível e satisfatório.

**Independent Test**: Construir uma torre, iniciar uma onda e confirmar que cada
ataque audível corresponde a uma ação real da torre, sem tocar sons quando a torre
está sem alvo ou em recarga.

**Acceptance Scenarios**:

1. **Given** uma torre com inimigo dentro do alcance, **When** a torre realiza um
   ataque, **Then** um efeito sonoro curto de ataque é reproduzido.
2. **Given** uma torre sem inimigos ao alcance, **When** o tempo passa, **Then**
   nenhum som de ataque é reproduzido por essa torre.
3. **Given** várias torres atacando ao mesmo tempo, **When** elas disparam durante
   uma onda intensa, **Then** os sons continuam inteligíveis e não viram uma massa
   excessivamente alta ou incômoda.
4. **Given** o jogador silenciou o áudio do jogo, **When** uma torre ataca, **Then**
   nenhum efeito sonoro é audível.

---

### User Story 2 - Inimigos dão feedback sonoro (Priority: P2)

O jogador acompanha uma onda e ouve sinais curtos quando inimigos recebem dano,
são derrotados ou chegam ao destino, tornando o estado do combate mais fácil de
perceber mesmo em momentos com muitos elementos na tela.

**Why this priority**: O pedido também cita enemies/inimigos. Esses sons completam
o ciclo de combate, mas dependem do feedback de ataque das torres para fazer
sentido.

**Independent Test**: Iniciar uma onda com ao menos um inimigo, causar dano,
derrotar inimigos e deixar um inimigo escapar, confirmando que cada evento tem
feedback audível coerente e sem alterar dano, recompensa ou vida.

**Acceptance Scenarios**:

1. **Given** um inimigo recebe dano, **When** o dano é aplicado, **Then** o jogo
   reproduz um feedback sonoro breve que indica impacto sem esconder a música de
   fundo.
2. **Given** um inimigo é derrotado, **When** sua derrota é confirmada, **Then** o
   jogo reproduz um efeito sonoro de eliminação distinto do som de dano comum.
3. **Given** um inimigo chega ao final do caminho e reduz a vida do jogador,
   **When** essa penalidade ocorre, **Then** o jogo reproduz um alerta sonoro
   reconhecível.
4. **Given** muitos inimigos recebem dano simultaneamente, **When** os eventos se
   acumulam no mesmo instante, **Then** o jogo limita a repetição audível para
   preservar clareza e conforto.

---

### User Story 3 - Mixagem confortável com a trilha (Priority: P3)

O jogador deixa a trilha sonora ligada e joga várias ondas. Os efeitos de torres e
inimigos aparecem como destaques momentâneos, sem competir com a música, sem
assustar pelo volume e sem exigir ajustes frequentes.

**Why this priority**: O jogo já possui trilha de fundo. Sem equilíbrio de volume e
respeito ao mudo, efeitos sonoros podem piorar a experiência em vez de melhorá-la.

**Independent Test**: Jogar uma sessão contínua com música e efeitos ativados,
alternar o mudo/volume e confirmar que a experiência continua confortável e
controlável.

**Acceptance Scenarios**:

1. **Given** a trilha sonora está tocando, **When** torres e inimigos geram efeitos,
   **Then** os efeitos são audíveis sem abafar a trilha ou os alertas importantes.
2. **Given** o jogador altera o estado de mudo ou volume do jogo, **When** novos
   efeitos de combate ocorrem, **Then** eles respeitam imediatamente essa
   preferência.
3. **Given** a partida é pausada ou reiniciada, **When** eventos antigos deixam de
   existir, **Then** nenhum som atrasado ou duplicado é reproduzido depois da pausa
   ou reinício.

---

### Edge Cases

- **Áudio bloqueado ou indisponível**: se o navegador/dispositivo impedir som ou
  um asset falhar, a partida continua totalmente jogável em silêncio, com falha
  observável para depuração.
- **Primeira interação ainda não ocorreu**: eventos de combate antes da permissão de
  áudio não podem gerar erros visíveis nem quebrar a partida; os efeitos passam a
  tocar quando o áudio estiver permitido.
- **Eventos simultâneos em massa**: dano em área, múltiplas torres ou muitos
  inimigos derrotados no mesmo instante não podem causar volume excessivo,
  distorção ou queda perceptível de desempenho.
- **Mudo durante um som**: ao silenciar o jogo, efeitos já iniciados param ou deixam
  de ser audíveis imediatamente, sem esperar o próximo evento.
- **Reinício de partida**: sons pendentes de uma partida anterior não podem tocar
  sobre a nova partida.
- **Tipos de torre/inimigo sem som específico**: quando um conteúdo ainda não tiver
  efeito próprio, o jogo usa um som padrão adequado em vez de falhar ou ficar
  inconsistente.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE reproduzir um efeito sonoro curto sempre que uma torre
  executa um ataque real contra um alvo.
- **FR-002**: O sistema NÃO DEVE reproduzir efeitos de ataque para torres sem alvo,
  ataques cancelados ou eventos que não produziram ação de combate.
- **FR-003**: O sistema DEVE reproduzir feedback sonoro quando inimigos recebem
  dano, são derrotados e quando alcançam o final do caminho causando perda de vida.
- **FR-004**: Os efeitos de dano, derrota e escape DEVEM ser distinguíveis entre si
  por quem joga, mesmo que alguns conteúdos usem sons padrão.
- **FR-005**: Todos os efeitos sonoros DEVERÃO respeitar imediatamente o estado de
  mudo e o volume configurado pelo jogador para o áudio do jogo.
- **FR-006**: Efeitos sonoros NÃO PODEM alterar regras de gameplay, incluindo dano,
  economia, ondas, spawn, seleção de alvo, cooldowns, vida ou recompensas.
- **FR-007**: O sistema DEVE manter a trilha sonora de fundo e os efeitos em uma
  relação de volume confortável, na qual efeitos relevantes sejam perceptíveis sem
  abafar a música nem soar agressivos.
- **FR-008**: O sistema DEVE limitar repetições simultâneas de efeitos iguais ou
  muito frequentes para evitar ruído excessivo em ondas com muitos eventos.
- **FR-009**: O sistema DEVE continuar jogável quando um efeito sonoro estiver
  indisponível, usando fallback adequado quando existir ou registrando a falha de
  forma observável.
- **FR-010**: Cada tipo de torre e inimigo DEVE poder apontar para um efeito sonoro
  específico ou para um padrão compartilhado, sem exigir mudança nas regras de
  combate.
- **FR-011**: O sistema DEVE impedir sons atrasados, duplicados ou pertencentes a
  uma partida anterior após pausa, reinício ou retorno ao setup.
- **FR-012**: A adição dos efeitos sonoros DEVE preservar desempenho perceptível em
  ondas com múltiplas torres e inimigos, sem travamentos causados pelo volume de
  eventos de áudio.

### Key Entities

- **Efeito Sonoro**: som curto associado a um evento de gameplay. Atributos
  conceituais: identificador estável, categoria, volume relativo, duração esperada
  e possibilidade de fallback.
- **Evento de Combate Audível**: acontecimento que pode gerar som, como ataque de
  torre, dano recebido por inimigo, derrota de inimigo ou inimigo escapando.
- **Perfil Sonoro de Conteúdo**: associação entre uma torre ou inimigo e seus sons
  específicos, com fallback para sons padrão quando não houver asset dedicado.
- **Preferência de Áudio do Jogador**: estado de mudo e volume que deve afetar
  música e efeitos de forma coerente durante a sessão e entre sessões quando já
  houver persistência disponível.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em uma sessão de teste com pelo menos 3 torres atacando por 2 minutos,
  100% dos ataques reais amostrados têm feedback sonoro correspondente ou fallback
  intencional documentado.
- **SC-002**: Em uma onda com pelo menos 20 inimigos derrotados, o jogador consegue
  distinguir auditivamente ataque, dano/impacto, derrota e escape em pelo menos 90%
  das tentativas avaliadas.
- **SC-003**: Com música e efeitos ativados, uma sessão contínua de 10 minutos não
  apresenta sons duplicados persistentes, estouros de volume, efeitos atrasados após
  reinício nem queda perceptível de fluidez.
- **SC-004**: O jogador consegue silenciar todos os efeitos de combate em uma única
  ação pelo controle de áudio existente, e nenhum novo efeito fica audível enquanto
  o jogo está mudo.
- **SC-005**: Em ondas intensas, eventos simultâneos são limitados de forma que o
  volume percebido permaneça confortável e nenhum efeito repetitivo domine a trilha
  por mais de 2 segundos contínuos.
- **SC-006**: Se os efeitos sonoros não puderem carregar, 100% do loop principal
  permanece jogável do início ao fim, com a falha disponível para depuração.

## Assumptions

- Esta feature cobre efeitos sonoros pontuais de torres e inimigos. Novas músicas,
  playlist, trilha dinâmica por onda e transições musicais ficam fora do escopo.
- O controle de mudo/volume já previsto para áudio do jogo deve afetar também os
  efeitos sonoros; um controle separado apenas para efeitos fica fora do escopo
  desta primeira entrega, salvo se já existir na experiência atual.
- Sons específicos por tipo de torre/inimigo são desejáveis, mas a entrega pode
  começar com sons padrão por categoria desde que o jogador receba feedback claro.
- Os efeitos são parte da apresentação e do feedback; regras de combate continuam
  independentes dos assets de áudio.
- O jogo roda em navegador e deve respeitar restrições modernas de reprodução de
  áudio após interação do usuário.
