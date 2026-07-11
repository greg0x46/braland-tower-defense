# Feature Specification: Ondas Automáticas, Infinitas e Pausa

**Feature Branch**: `004-endless-waves-pause`

**Created**: 2026-07-11

**Status**: Draft

**Input**: User description: "Quero alterar o funcionamento das ondas do jogo. As ondas devem começar automaticamente. Quando todos os inimigos de uma onda forem derrotados, o jogo deve esperar alguns segundos e iniciar a próxima sem que o jogador precise clicar em nenhum botão. As ondas devem ser infinitas e ficar gradualmente mais difíceis, aumentando a quantidade e a variedade de inimigos conforme o jogador avança. O botão atual de 'Próxima onda' deve ser substituído por um botão de 'Pausar'. Ao pausar, todos os movimentos, ataques, inimigos, torres e contagens do jogo devem parar. O botão deve mudar para 'Continuar' enquanto o jogo estiver pausado."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ondas automáticas e infinitas (Priority: P1)

O jogador entra na partida e as ondas passam a fluir sozinhas: a primeira onda começa automaticamente, e sempre que todos os inimigos de uma onda são derrotados o jogo aguarda alguns segundos e inicia a próxima — indefinidamente — sem exigir nenhum clique. O jogador foca em posicionar torres e defender, não em disparar cada onda manualmente.

**Why this priority**: É o coração do pedido e redefine o loop central do jogo (construir → onda → dano/dinheiro). Sem isto, nenhuma das demais partes faz sentido. Entregue sozinha, já muda a experiência para um fluxo contínuo de defesa.

**Independent Test**: Iniciar uma partida sem tocar em nenhum botão e observar que a onda 1 começa sozinha, que ao limpar todos os inimigos há uma pausa curta e a onda 2 inicia automaticamente, e que esse ciclo se repete além do número de ondas antes fixo (ex.: passar da onda 10, 20...) sem tela de vitória.

**Acceptance Scenarios**:

1. **Given** uma partida recém-iniciada, **When** o jogador não interage com nenhum botão, **Then** a primeira onda começa automaticamente após um breve intervalo inicial.
2. **Given** uma onda em andamento, **When** o último inimigo daquela onda é derrotado (nenhum inimigo vivo e nada mais a nascer), **Then** o jogo aguarda um curto intervalo e inicia a próxima onda sozinho.
3. **Given** o jogador chegou à última onda que antes existia, **When** essa onda é limpa, **Then** o jogo continua gerando novas ondas em vez de exibir tela de vitória.
4. **Given** um intervalo entre ondas em contagem, **When** o intervalo termina, **Then** os inimigos da próxima onda começam a nascer e o contador de onda avança em 1.

---

### User Story 2 - Dificuldade progressiva e infinita (Priority: P2)

Conforme o jogador avança, cada nova onda é mais desafiadora que a anterior: mais inimigos, nascendo em ritmo mais intenso e mais resistentes. A progressão nunca "acaba" nem estabiliza — o desafio cresce continuamente, fazendo com que o objetivo passe a ser "quão longe você chega".

**Why this priority**: Ondas infinitas sem escalada de dificuldade viram monótonas e triviais. A escalada é o que dá sentido ao modo infinito, mas depende do loop automático (P1) já existir.

**Independent Test**: Comparar ondas distantes entre si (ex.: onda 1 vs. onda 8 vs. onda 15) e verificar, de forma mensurável, que a quantidade de inimigos e a resistência total da onda aumentam de forma monotônica conforme o índice da onda cresce.

**Acceptance Scenarios**:

1. **Given** duas ondas quaisquer A e B com B mais avançada que A, **When** ambas são comparadas, **Then** B contém pelo menos tantos inimigos quanto A e uma dificuldade total (quantidade e/ou resistência) estritamente maior ao longo da progressão.
2. **Given** ondas avançando, **When** o índice da onda aumenta, **Then** o ritmo de surgimento dos inimigos se intensifica e/ou a resistência dos inimigos cresce, sem depender de novos dados escritos à mão para cada onda.
3. **Given** um novo tipo de inimigo passe a existir no jogo no futuro, **When** as ondas são geradas, **Then** o motor de progressão o incorpora automaticamente à variedade das ondas mais avançadas, sem reescrever a lógica de escalada.

---

### User Story 3 - Botão de Pausar / Continuar (Priority: P3)

No lugar do antigo botão de disparar a próxima onda, o jogador tem um botão de "Pausar". Ao pausá-lo, o jogo congela por completo — inimigos, torres, projéteis, movimentos, ataques e todas as contagens param. O botão passa a exibir "Continuar", e ao acioná-lo o jogo retoma exatamente do ponto em que parou.

**Why this priority**: Como as ondas agora fluem sozinhas, o antigo botão perde função; o jogador precisa de um jeito de parar a ação para respirar ou planejar. É valioso e independente, mas secundário em relação ao loop automático e à escalada.

**Independent Test**: Durante uma onda ativa, clicar em "Pausar" e verificar que absolutamente todo movimento, ataque e contagem congela e o rótulo muda para "Continuar"; clicar em "Continuar" e verificar que tudo retoma sem perda de estado.

**Acceptance Scenarios**:

1. **Given** uma partida em andamento, **When** o jogador aciona "Pausar", **Then** inimigos param de se mover, torres param de atacar, projéteis param, o intervalo entre ondas para de contar e o rótulo do botão muda para "Continuar".
2. **Given** o jogo pausado, **When** o jogador aciona "Continuar", **Then** todo movimento, ataque e contagem retoma do exato ponto anterior e o rótulo volta a "Pausar".
3. **Given** o jogo pausado, **When** o jogador tenta interagir com o campo (posicionar/selecionar torres) ou o tempo passa, **Then** nada avança nem muda de estado até que "Continuar" seja acionado.
4. **Given** o jogo pausado durante o intervalo entre ondas, **When** o jogador aciona "Continuar", **Then** a contagem regressiva retoma de onde parou (não reinicia).

---

### Edge Cases

- **Pausar no exato momento da transição de onda**: se o jogador pausa enquanto o intervalo entre ondas está contando, a contagem congela e retoma no mesmo ponto ao continuar; nenhuma onda é pulada ou duplicada.
- **Derrota durante o jogo**: quando as vidas chegam a zero, a partida termina em derrota normalmente; o loop automático de ondas para e o botão de pausa deixa de ter efeito.
- **Pausar após a derrota**: com a partida encerrada, o botão de Pausar/Continuar fica inerte (não há o que pausar).
- **Última onda antes infinita**: não existe mais condição de vitória por "limpar todas as ondas"; a única forma de a partida terminar é a derrota.
- **Escalada sem transbordo**: mesmo em ondas muito avançadas, a quantidade e a intensidade continuam crescendo de forma controlada, sem travar o jogo nem gerar inimigos de forma instantânea/ilimitada em um único instante.
- **Pausar/Continuar em sequência rápida**: alternar o botão repetidamente não corrompe o estado nem acelera/atrasa o jogo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O jogo DEVE iniciar a primeira onda automaticamente ao começar a partida, após um breve intervalo inicial, sem exigir clique do jogador.
- **FR-002**: O jogo DEVE detectar o fim de uma onda quando não houver mais inimigos a nascer nem inimigos vivos no campo.
- **FR-003**: Ao fim de uma onda, o jogo DEVE aguardar um intervalo curto e configurável (padrão assumido: alguns segundos) antes de iniciar a próxima onda automaticamente.
- **FR-004**: As ondas DEVEM ser infinitas — o jogo NÃO DEVE apresentar condição de vitória por esgotamento das ondas; a partida só termina por derrota.
- **FR-005**: Cada nova onda DEVE ser gerada por um motor de progressão que aumenta a dificuldade de forma monotônica conforme o índice da onda cresce, por meio de maior quantidade de inimigos, ritmo de surgimento mais intenso e/ou maior resistência dos inimigos.
- **FR-006**: O motor de progressão DEVE ser data-driven e capaz de incorporar automaticamente novos tipos de inimigo à variedade das ondas quando esses tipos existirem, sem reescrita da lógica de escalada. (Projetar/adicionar novos tipos de inimigo NÃO faz parte desta feature.)
- **FR-007**: O antigo botão de disparar a próxima onda ("Iniciar/Próxima Onda") DEVE ser removido e substituído por um botão de "Pausar".
- **FR-008**: Acionar "Pausar" DEVE congelar por completo o estado do jogo: movimento de inimigos, ataques e disparos de torres, projéteis, o contador do intervalo entre ondas e quaisquer outras contagens/temporizadores de gameplay.
- **FR-009**: Enquanto pausado, o botão DEVE exibir "Continuar"; acioná-lo DEVE retomar o jogo exatamente do ponto congelado, sem perda nem reinício de estado, e o rótulo DEVE voltar a "Pausar".
- **FR-010**: Enquanto pausado, o jogo DEVE bloquear a evolução de qualquer estado de gameplay, inclusive a construção/seleção/gerência de torres (congelamento total), até que "Continuar" seja acionado.
- **FR-011**: O indicador de onda no HUD DEVE refletir o índice da onda atual à medida que as ondas avançam indefinidamente.
- **FR-012**: A escalada de dificuldade DEVE permanecer controlada em ondas muito avançadas, sem gerar picos instantâneos de inimigos que travem ou quebrem a experiência.
- **FR-013**: Pausar e continuar NÃO DEVEM pular, duplicar ou reiniciar ondas, nem alterar o tempo restante do intervalo entre ondas.

### Key Entities *(include if feature involves data)*

- **Onda (Wave)**: uma leva de inimigos identificada por um índice crescente (1, 2, 3, … infinitamente). Deriva sua composição (quantidade, tipos e ritmo de surgimento) do motor de progressão em vez de uma lista fixa.
- **Perfil de Progressão / Dificuldade**: regra que, dado o índice da onda, determina de forma mensurável a quantidade de inimigos, o ritmo de surgimento e a resistência, além de quais tipos de inimigo participam. Cresce monotonicamente com o índice.
- **Estado de Pausa**: condição global da partida (jogando vs. pausado) que determina se movimentos, ataques e contagens avançam ou permanecem congelados.
- **Intervalo entre Ondas**: contagem regressiva curta entre o fim de uma onda e o início da próxima, sujeita ao Estado de Pausa.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um jogador consegue jogar uma partida completa do início até uma derrota sem precisar clicar em nenhum botão para iniciar ou avançar ondas (0 cliques obrigatórios de "iniciar onda").
- **SC-002**: Após o último inimigo de uma onda ser derrotado, a próxima onda inicia automaticamente dentro do intervalo definido, com variação inferior a 1 segundo em relação ao alvo configurado.
- **SC-003**: O jogo sustenta ondas indefinidamente — em teste, é possível ultrapassar ao menos o dobro do número de ondas antes fixo (≥ 20 ondas) sem tela de vitória e sem degradação perceptível de desempenho.
- **SC-004**: Para qualquer par de ondas comparadas, a onda mais avançada apresenta dificuldade total (quantidade e/ou resistência agregada) igual ou maior, e estritamente maior ao longo da progressão — verificável sem inspecionar a implementação.
- **SC-005**: Ao acionar "Pausar", 100% dos elementos de gameplay (inimigos, torres, projéteis, contadores) ficam imóveis/estáticos, confirmável por observação, e o rótulo do botão muda para "Continuar" imediatamente.
- **SC-006**: Ao acionar "Continuar" após qualquer duração de pausa, o jogo retoma sem qualquer perda de estado (mesmas posições, vidas, dinheiro, onda e tempo restante de intervalo).
- **SC-007**: Alternar Pausar/Continuar múltiplas vezes durante uma partida não produz ondas puladas, duplicadas nem alteração no total de inimigos derrotados/gerados.

## Assumptions

- "Alguns segundos" de espera entre ondas é interpretado como um intervalo curto e configurável (padrão sugerido ~3 segundos), passível de ajuste posterior sem mudança de comportamento observável.
- A primeira onda começa automaticamente após um breve intervalo inicial ao entrar na partida (o jogador não precisa disparar nada).
- A "variedade" de inimigos cresce à medida que novos tipos de inimigo passam a existir no jogo; **esta feature entrega apenas o motor de progressão** que os incorpora automaticamente. Com o único tipo de inimigo atual, a escalada de variedade fica limitada até que novos tipos sejam adicionados por uma feature de conteúdo separada.
- Não existe mais condição de vitória: a partida termina exclusivamente por derrota (vidas zeradas). Qualquer fluxo antes associado à "vitória por limpar todas as ondas" é removido.
- A pausa é um congelamento total: nenhuma interação de gameplay (inclusive construção de torres) avança enquanto pausado.
- O botão de Pausar/Continuar ocupa o espaço antes usado pelo botão de iniciar onda no HUD lateral.
- Reiniciar a partida (fluxo já existente após a derrota) começa novamente da onda 1 com o loop automático.
