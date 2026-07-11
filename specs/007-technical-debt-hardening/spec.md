# Feature Specification: Technical Debt Hardening

**Feature Branch**: `[007-technical-debt-hardening]`

**Created**: 2026-07-11

**Status**: Draft

**Input**: User description: "Transformar a revisão técnica atual em uma especificação Spec Kit para reduzir débitos que podem limitar ou impedir a evolução do jogo: verificação automatizada falhando por divergência de balanceamento, contrato de partida/documentação desalinhado, estado/eventos globais pouco confiáveis, combate acoplado à apresentação, UI rígida para novos conteúdos e falta de definição única para mapas/caminhos."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Restaurar Confiança de Entrega (Priority: P1)

Como desenvolvedor do jogo, quero que o estado atual do projeto tenha uma verificação automatizada confiável e verde, para que novas mudanças não fiquem bloqueadas por divergências antigas nem escondam regressões de balanceamento.

**Why this priority**: Sem uma verificação confiável, qualquer evolução fica arriscada: o time não sabe se uma falha representa bug real, teste defasado ou mudança intencional.

**Independent Test**: Pode ser testada validando uma mudança de balanceamento conhecida: quando a mudança é intencional, os critérios esperados acompanham a decisão; quando não é intencional, a verificação aponta a regressão de forma clara.

**Acceptance Scenarios**:

1. **Given** um valor de gameplay alterado em relação ao contrato esperado, **When** a verificação do projeto é executada, **Then** a falha identifica qual métrica divergiu e qual decisão precisa ser tomada.
2. **Given** que o balanceamento atual foi aceito como intencional, **When** a verificação do projeto é executada, **Then** o projeto passa sem falhas relacionadas a esse contrato.

---

### User Story 2 - Alinhar Contrato de Partida (Priority: P1)

Como designer ou desenvolvedor de gameplay, quero que o jogo tenha um contrato claro de progressão e término de partida, para que balanceamento, documentação, HUD e critérios de aceite descrevam o mesmo comportamento.

**Why this priority**: Vitória, derrota, ondas finitas ou modo infinito afetam economia, pacing, UX e testes. Um contrato ambíguo impede planejamento seguro das próximas features.

**Independent Test**: Pode ser testada jogando ou simulando uma partida completa e verificando se o comportamento observado corresponde exatamente ao contrato documentado.

**Acceptance Scenarios**:

1. **Given** uma nova partida, **When** o jogador inicia a progressão, **Then** o jogo comunica claramente se a sessão é finita ou infinita.
2. **Given** que a condição final definida foi atingida, **When** a partida encerra, **Then** o jogador recebe o resultado correto e as interações incompatíveis com esse estado são bloqueadas.
3. **Given** que a documentação descreve como jogar, **When** ela é comparada ao comportamento real, **Then** não há divergência sobre número de ondas, vitória, derrota ou pausa.

---

### User Story 3 - Desacoplar Regras de Combate da Apresentação (Priority: P2)

Como designer de conteúdo, quero adicionar torres com comportamentos de ataque diferentes sem depender da animação visual escolhida, para que novas torres ranged, corpo-a-corpo, em área ou com efeitos possam ser balanceadas sem regras especiais escondidas.

**Why this priority**: O próximo crescimento do jogo depende de novas torres e inimigos. Se a regra de dano depender da animação, cada novo conteúdo aumenta o risco de exceções e regressões.

**Independent Test**: Pode ser testada definindo dois ataques visualmente diferentes que produzem o mesmo resultado de gameplay, e dois ataques visualmente similares que produzem resultados de gameplay diferentes.

**Acceptance Scenarios**:

1. **Given** uma torre com apresentação animada, **When** ela ataca um alvo válido, **Then** o resultado de gameplay segue o comportamento de ataque configurado, não o tipo de asset visual.
2. **Given** uma torre sem asset final disponível, **When** ela ataca, **Then** o gameplay continua funcionando com o mesmo dano, alcance, cadência e efeitos esperados.
3. **Given** uma nova categoria de ataque, **When** ela é adicionada ao conteúdo do jogo, **Then** não exige alterar regras de ataque já existentes.

---

### User Story 4 - Tornar Estado e Eventos Confiáveis (Priority: P2)

Como mantenedor do jogo, quero que estados da partida e eventos de gameplay tenham contratos claros e completos, para evitar estados inválidos, eventos mortos e comunicação ambígua entre HUD, gameplay e sistemas internos.

**Why this priority**: Pausa, fim de partida, ondas, dinheiro, vida, mortes e vazamentos são base para upgrades, estatísticas, efeitos, tutorial e persistência futura.

**Independent Test**: Pode ser testada exercitando os principais ciclos da partida e verificando que cada transição emite exatamente as informações esperadas, sem eventos sem consumidor ou payload ambíguo.

**Acceptance Scenarios**:

1. **Given** uma alteração em dinheiro, vida, onda, pausa ou fim de partida, **When** o estado muda, **Then** os consumidores recebem informações completas e consistentes.
2. **Given** um evento declarado no contrato do jogo, **When** o contrato é revisado, **Then** cada evento tem produtor, consumidor ou justificativa explícita para existir.
3. **Given** uma tentativa de interação em estado incompatível, **When** o jogador age, **Then** o sistema preserva o estado válido e fornece feedback adequado.

---

### User Story 5 - Preparar Expansão de Conteúdo (Priority: P3)

Como criador de conteúdo, quero que UI e mapas aceitem crescimento controlado, para adicionar mais torres, mapas e rotas sem reorganizar a experiência principal a cada feature.

**Why this priority**: O protótipo já valida o loop central; a próxima etapa natural é conteúdo. UI rígida e mapa sem definição única viram retrabalho assim que houver múltiplas opções.

**Independent Test**: Pode ser testada adicionando conteúdo representativo além do mínimo atual e validando que a seleção, apresentação e regras continuam claras.

**Acceptance Scenarios**:

1. **Given** várias torres disponíveis, **When** o jogador abre o menu de construção, **Then** todas permanecem acessíveis, legíveis e com estados de seleção/saldo claros.
2. **Given** uma definição de mapa com visual, caminho e áreas de construção, **When** o jogo carrega essa fase, **Then** movimento, construção e depuração usam o mesmo contrato.
3. **Given** uma segunda fase planejada, **When** seus dados são definidos, **Then** ela não exige reescrever regras já validadas para a primeira fase.

### Edge Cases

- Uma mudança de balanceamento pode ser intencional, mas ainda precisa atualizar o contrato de regressão correspondente.
- O contrato de partida pode escolher modo infinito; nesse caso, vitória não deve ser prometida em HUD, documentação ou critérios de aceite.
- Um evento pode existir para uso futuro, mas deve ser marcado como reservado ou removido até haver consumidor real.
- Um asset de ataque, torre, inimigo ou mapa pode falhar; o jogo deve continuar jogável quando houver fallback previsto.
- Uma lista de torres maior que o espaço visual atual não pode tornar opções inacessíveis ou sobrepostas.
- Um mapa visual pode divergir do caminho de gameplay; a feature deve tornar essa divergência detectável antes de chegar ao jogador.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The project MUST have a reliable verification gate that passes when the current accepted gameplay contracts are satisfied.
- **FR-002**: The project MUST distinguish intentional balance changes from regressions by keeping expected gameplay metrics aligned with accepted design decisions.
- **FR-003**: The game MUST define exactly one active match progression contract: finite with victory, endless without victory, or another explicitly documented mode.
- **FR-004**: The player-facing instructions, in-game feedback, and acceptance criteria MUST describe the same match progression, pause, victory, and defeat behavior.
- **FR-005**: The game MUST prevent incompatible interactions after match-ending states and during states where interaction is intentionally locked.
- **FR-006**: Attack outcomes MUST be defined independently from visual presentation, so damage, cadence, range, target rules, and effects remain valid with or without final assets.
- **FR-007**: The game MUST support multiple attack behavior categories without requiring changes to existing attack behavior contracts.
- **FR-008**: State transitions for money, lives, waves, pause, enemy defeat, enemy leak, victory, and defeat MUST have explicit contracts that include their required data.
- **FR-009**: Declared gameplay events MUST either have an active producer and consumer, or be explicitly marked as reserved with a reason and expected future use.
- **FR-010**: Invalid or impossible game states MUST be prevented by the state model or rejected with a visible, recoverable outcome.
- **FR-011**: The build menu MUST remain usable and legible when the available tower roster grows beyond the current minimum content set.
- **FR-012**: Map presentation, enemy pathing, build restrictions, and debug visualization MUST be governed by a single map contract for each playable map.
- **FR-013**: Adding a new tower, enemy, attack behavior, or map MUST require only bounded changes that are predictable from the relevant content contract.
- **FR-014**: Fallback behavior for missing visual assets MUST preserve gameplay-critical behavior and report the asset failure in a way useful for development.
- **FR-015**: The feature MUST preserve the existing playable loop while reducing the architectural risks identified above.

### Key Entities *(include if feature involves data)*

- **Gameplay Contract**: The accepted behavior for core rules such as balance metrics, attacks, economy, waves, pause, victory, and defeat.
- **Match Progression Contract**: The agreed structure of a session, including start, wave progression, pause, end conditions, and player-facing result.
- **Attack Behavior**: A gameplay definition of how a tower affects targets, independent from animation, sprite, placeholder, or other visual presentation.
- **Game Event Contract**: A named state or gameplay notification with defined producer, consumer, payload, and lifecycle status.
- **Map Contract**: A playable map definition that groups visual presentation, pathing, build restrictions, and debug expectations.
- **Content Roster**: The available set of towers, enemies, maps, and attack behaviors exposed to designers and players.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of automated project verification checks pass after accepted balance contracts are updated or restored.
- **SC-002**: A reviewer can identify the active match progression mode and all end conditions from the specification and player-facing instructions in under 5 minutes.
- **SC-003**: At least 3 distinct attack behavior categories can be specified and validated without relying on visual asset availability.
- **SC-004**: 100% of declared gameplay events have a documented producer, consumer, or reserved status.
- **SC-005**: A content expansion rehearsal with at least 4 tower entries remains fully accessible and legible in the build menu.
- **SC-006**: A map review can verify that visual path, enemy route, build restrictions, and debug route refer to the same map contract with no undocumented divergence.
- **SC-007**: No existing core loop action (build, start, pause, attack, earn money, lose life, restart) regresses during acceptance testing.

## Assumptions

- This feature is an internal stabilization feature intended to unblock future gameplay and content expansion.
- The default scope is to clarify and harden existing contracts before adding large new gameplay content.
- The active match progression mode should be chosen during planning if not already decided by the product owner.
- Existing playable behavior should remain the baseline unless a divergence is explicitly accepted as a design change.
- Visual polish is not the goal of this feature; visual changes are only in scope when needed to preserve usability, feedback, or fallback behavior.
