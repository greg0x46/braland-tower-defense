# Feature Specification: Trilha Sonora de Background

**Feature Branch**: `008-trilha-sonora-background`

**Created**: 2026-07-11

**Status**: Draft

**Input**: User description: "Quero adicionar uma trilha sonora de background ao jogo adicionei um arquivo de mp3, pode renomea-lo e movelo para a pasta adequada"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Música ambiente durante a partida (Priority: P1)

O jogador abre o BR-TD e, ao começar a interagir com o jogo, uma trilha sonora de
fundo passa a tocar continuamente em loop, dando ritmo e clima brasileiro à
partida. A música se repete sem cortes audíveis e acompanha o jogador do setup até
a derrota, sem que ele precise configurar nada.

**Why this priority**: É a essência do pedido. Sozinha, essa fatia já entrega o
valor completo — o jogo deixa de ser silencioso e ganha atmosfera — e é
demonstrável sem depender de nenhuma outra história.

**Independent Test**: Abrir o jogo, interagir uma vez e ouvir a música tocando;
deixar a faixa chegar ao fim e confirmar que ela reinicia sem silêncio nem estalo
perceptível.

**Acceptance Scenarios**:

1. **Given** o jogo recém-carregado, **When** o jogador realiza sua primeira
   interação (clique/toque/tecla), **Then** a trilha sonora começa a tocar.
2. **Given** a trilha tocando, **When** a faixa chega ao seu fim, **Then** ela
   recomeça imediatamente em loop, sem intervalo de silêncio perceptível.
3. **Given** a trilha tocando, **When** o jogador constrói torres, inicia ondas e
   sofre dano, **Then** a música continua tocando sem interrupção e sem afetar
   nenhuma regra de gameplay (dano, economia, spawn, alvo).
4. **Given** o jogador perde a partida e reinicia, **When** a nova partida começa,
   **Then** a música segue tocando normalmente, sem duplicar (duas faixas
   sobrepostas) nem parar.

---

### User Story 2 - Controle de áudio pelo jogador (Priority: P2)

O jogador quer poder silenciar o jogo ou baixar a música — por estar em ambiente
compartilhado, por preferir a própria playlist, ou por achar a faixa alta demais. Ele
encontra no HUD um botão de mudo e um controle de volume gradual, e sua escolha é
respeitada imediatamente.

**Why this priority**: Música de fundo sem opção de mudo é uma fonte clássica de
frustração e faz o jogador fechar a aba. Não bloqueia a P1, mas é o que torna a
trilha aceitável a longo prazo.

**Independent Test**: Acionar o mudo e confirmar que a música silencia; acionar de
novo e confirmar que volta no mesmo volume; arrastar o controle de volume e ouvir a
música acompanhar — tudo sem interromper nem alterar a partida.

**Acceptance Scenarios**:

1. **Given** a música tocando, **When** o jogador aciona o controle de mudo, **Then**
   a música silencia imediatamente e o controle passa a indicar o estado "mudo".
2. **Given** o jogo mudo, **When** o jogador aciona o controle novamente, **Then** a
   música volta a tocar no volume que estava antes do mudo, sem que ele precise
   reajustar o volume.
3. **Given** a música tocando, **When** o jogador ajusta o controle de volume,
   **Then** o volume da música acompanha o ajuste imediatamente, do silêncio ao
   máximo.
4. **Given** o jogador levou o controle de volume ao mínimo, **When** ele observa o
   HUD, **Then** o estado do áudio é comunicado de forma coerente com o controle de
   mudo (sem indicar "com som" enquanto nada é audível).
5. **Given** uma partida em andamento, **When** o jogador altera mudo ou volume,
   **Then** a partida não é pausada, reiniciada nem alterada de nenhuma forma.

---

### User Story 3 - Preferência de áudio lembrada entre sessões (Priority: P3)

O jogador que silenciou o jogo ou baixou o volume não quer ser surpreendido pela
música toda vez que volta. Ao reabrir o BR-TD, o estado de mudo e o nível de volume
escolhidos anteriormente são respeitados.

**Why this priority**: Conveniência real, mas o jogo é plenamente jogável e
agradável sem ela. Fatia menor, entregue depois de P1 e P2 estarem validadas.

**Independent Test**: Silenciar o jogo, recarregar a página e confirmar que o jogo
continua mudo, com o controle já indicando esse estado.

**Acceptance Scenarios**:

1. **Given** o jogador silenciou o áudio, **When** ele recarrega o jogo, **Then** o
   jogo inicia mudo e o controle reflete o estado "mudo".
2. **Given** o jogador ajustou o volume para um nível específico, **When** ele
   recarrega o jogo, **Then** a música toca nesse mesmo nível e o controle de volume
   reflete a posição escolhida.
3. **Given** nenhuma preferência salva (primeira visita), **When** o jogador abre o
   jogo, **Then** o áudio inicia habilitado no volume padrão.

---

### Edge Cases

- **Autoplay bloqueado pelo navegador**: navegadores impedem áudio antes de uma
  interação do usuário. O jogo NÃO pode travar, exibir falha nem logar erro fatal
  — deve aguardar silenciosamente a primeira interação e então iniciar a música.
- **Áudio indisponível** (sem saída de som, formato não suportado, falha ao
  carregar o arquivo): o jogo DEVE permanecer 100% jogável em silêncio; a falha é
  registrada de forma observável, nunca engolida em silêncio (Princípio X).
- **Aba em segundo plano**: trocar de aba e voltar não pode acumular faixas
  sobrepostas nem deixar o áudio dessincronizado.
- **Reinício de partida**: reiniciar não pode instanciar uma segunda trilha por
  cima da que já toca.
- **Estado de pausa e setup**: o jogo já nasce pausado (botão "▶ Iniciar") e pode ser
  pausado a qualquer momento. A trilha segue tocando nesses estados (FR-004), então o
  ciclo pausar/retomar repetidas vezes NÃO pode cortar, reiniciar do zero nem duplicar
  a música.
- **Volume no mínimo vs. mudo**: são dois caminhos para o mesmo resultado audível; o
  HUD não pode indicar estados contraditórios (ex.: ícone "com som" com volume zero).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE tocar uma trilha sonora de fundo em loop contínuo
  enquanto o jogo estiver aberto, sem intervalo de silêncio perceptível entre as
  repetições.
- **FR-002**: O sistema DEVE respeitar a política de autoplay do navegador: se o
  áudio não puder tocar antes de uma interação do jogador, a trilha inicia na
  primeira interação, sem erro visível ao jogador.
- **FR-003**: O sistema DEVE garantir que apenas uma instância da trilha toque por
  vez — reiniciar a partida, voltar ao setup ou alternar o mudo NUNCA pode produzir
  duas faixas sobrepostas.
- **FR-004**: A trilha DEVE continuar tocando normalmente quando a partida está
  pausada ou na tela de setup (antes de "▶ Iniciar"). O estado de pausa do jogo NÃO
  interrompe nem atenua a música: a única coisa que silencia o áudio é a escolha
  explícita do jogador (FR-005/FR-006).
- **FR-005**: Os jogadores DEVEM ser capazes de silenciar e reativar o áudio a
  qualquer momento, por um controle visível e sempre acessível no HUD, cujo estado
  atual (com som / mudo) é comunicado visualmente.
- **FR-006**: Os jogadores DEVEM ser capazes de ajustar o volume da trilha de forma
  gradual, por um controle contínuo no HUD, do silêncio ao volume máximo. O controle
  de mudo (FR-005) e o de volume DEVEM ser coerentes entre si: ativar o mudo silencia
  independentemente do volume escolhido, e desativá-lo restaura o volume anterior sem
  que o jogador precise reajustá-lo.
- **FR-007**: O sistema DEVE persistir a preferência de áudio do jogador — estado de
  mudo **e** nível de volume — entre sessões, aplicando-a já no carregamento do jogo.
- **FR-008**: Alternar o estado do áudio NÃO PODE alterar nenhuma regra de
  gameplay — dano, economia, ondas, spawn, seleção de alvo e progressão permanecem
  idênticos com o som ligado ou desligado.
- **FR-009**: O volume padrão da trilha DEVE ser baixo o suficiente para servir de
  fundo, deixando espaço audível para futuros efeitos sonoros de combate, sem
  competir com eles.
- **FR-010**: O jogo DEVE permanecer plenamente jogável caso o áudio falhe ao
  carregar ou o dispositivo não tenha saída de som; a falha DEVE ser registrada de
  forma observável e nunca silenciada.
- **FR-011**: A trilha DEVE ser referenciada por um identificador estável, e sua
  configuração (arquivo, volume, loop) DEVE viver em dados/constantes configuráveis
  — trocar a faixa NÃO PODE exigir alteração de regra de gameplay.

### Key Entities

- **Trilha (Track)**: a peça musical de fundo. Atributos conceituais: identificador
  estável, volume padrão, indicação de loop. Trocável sem impacto no domínio.
- **Preferência de Áudio**: escolha do jogador sobre estar mudo ou com som (e, se
  aplicável, o nível de volume). Persistida entre sessões e aplicada no
  carregamento.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das sessões em que o jogador interagiu com a tela têm trilha
  sonora audível — nenhuma sessão fica silenciosa por falha de autoplay.
- **SC-002**: A trilha repete indefinidamente sem corte, silêncio ou estalo
  perceptível entre repetições, verificado em uma sessão contínua de pelo menos 15
  minutos.
- **SC-003**: O jogador consegue silenciar o jogo em uma única ação, a partir da tela
  de jogo, sem abrir menus e sem interromper a partida; e consegue ajustar o volume
  para qualquer nível entre silêncio e máximo sem sair da partida.
- **SC-004**: As preferências de áudio (mudo e nível de volume) são respeitadas em
  100% dos recarregamentos subsequentes do jogo no mesmo navegador.
- **SC-005**: A adição da trilha não introduz regressão perceptível de performance:
  taxa de quadros e contagem de entidades em uma onda de referência permanecem
  equivalentes às medidas antes da mudança.
- **SC-006**: O jogo permanece completamente jogável, do início ao fim de uma
  partida, com o áudio desligado ou indisponível.

## Assumptions

- A faixa fornecida é **"Sideways Samba" (Audionautix)**, distribuída pela YouTube
  Audio Library como música sem copyright — uso livre no projeto. O arquivo já foi
  renomeado e movido para `src/assets/audio/sideways-samba.mp3`, seguindo a
  organização existente de assets (`src/assets/maps`, `towers`, `enemies`).
- Uma única faixa de fundo atende ao escopo. Playlist com múltiplas músicas, música
  por onda/chefe e transições dinâmicas (ex.: intensificar na onda final) estão
  **fora do escopo**.
- Efeitos sonoros pontuais (tiro, dano, morte, construção, alerta de vida baixa)
  estão **fora do escopo** — esta feature entrega apenas a trilha de fundo, mas DEVE
  deixar espaço de volume e organização de assets para que efeitos sejam adicionados
  depois sem retrabalho.
- Tela de créditos/atribuição da faixa está fora do escopo; a atribuição pode ser
  registrada no README.
- A persistência da preferência de áudio usa armazenamento local do navegador, sem
  backend — coerente com o Princípio VI (não introduzir backend sem necessidade
  concreta do MVP).
- O jogo roda em navegador; o comportamento de autoplay segue as políticas padrão
  dos navegadores modernos (áudio apenas após interação do usuário).
