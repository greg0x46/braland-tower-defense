# Phase 0 — Research: Trilha Sonora de Background

**Feature**: `008-trilha-sonora-background` | **Data**: 2026-07-11

Nenhum `NEEDS CLARIFICATION` sobreviveu à spec (FR-004 e FR-006 foram decididos com
o usuário). As pesquisas abaixo cobrem as escolhas técnicas que a spec deixou em
aberto por design — ela descreve *o quê*, este documento decide *como*.

---

## D1 — Motor de áudio: Sound Manager do Phaser vs. `HTMLAudioElement` próprio

**Decisão**: usar o **Sound Manager global do Phaser** (`this.sound`, que é
`game.sound` exposto em cada cena).

**Rationale**:

- **Resolve FR-003 (instância única) de graça.** O Sound Manager é do *jogo*, não
  da cena. `UIScene.restartGame()` chama `scene.restart()` em GameScene e UIScene —
  um som registrado no manager global **não** é destruído por isso. Um
  `HTMLAudioElement` guardado numa cena seria recriado a cada restart e produziria
  faixas sobrepostas, exatamente o bug que FR-003 proíbe.
- **Já traz o destravamento de autoplay** (ver D3), incluindo o retry na primeira
  interação do jogador.
- **Coerente com o Princípio XI** (assets substituíveis): a trilha é referenciada
  por chave de cache, como já acontece com `TEXTURES`.

**Alternativas consideradas**:

- `HTMLAudioElement` cru: exigiria reimplementar o desbloqueio de autoplay, o
  controle de volume e a sobrevivência ao restart. Mais código, menos garantia.
- Web Audio API direta: poder desnecessário para uma faixa em loop; violaria o
  Princípio VI (não abstrair sem necessidade concreta).

---

## D2 — Onde a trilha nasce: BootScene

**Decisão**: o `MusicManager` é instanciado a partir da **BootScene**, a única cena
que **nunca** é reiniciada.

**Rationale**: `restartGame()` reinicia GameScene e UIScene; a BootScene já foi
encerrada por `scene.start('GameScene')` e não roda de novo. Criar a música ali
significa que ela atravessa derrota → reinício → nova partida sem parar e sem
duplicar — cenário 4 da User Story 1 e FR-003.

**Alternativas consideradas**: criar em GameScene ou UIScene — ambas reiniciam, e
cada restart precisaria de lógica defensiva de "já existe?". Empurrar o problema
para o lugar errado.

---

## D3 — Política de autoplay do navegador (FR-002)

**Decisão**: consultar `this.sound.locked`. Se travado, adiar o `play()` para o
evento `Phaser.Sound.Events.UNLOCKED`; se livre, tocar na hora. Um guard booleano
impede tocar duas vezes se o evento chegar depois de um play já feito.

**Rationale**: navegadores modernos suspendem o contexto de áudio até um gesto do
usuário. O Phaser detecta isso (`locked = true`), instala os listeners de gesto e
emite `UNLOCKED` quando o contexto volta. É o caminho suportado; reimplementar a
detecção de gesto seria frágil e redundante.

**Consequência de projeto**: o jogo **nunca** trata áudio travado como erro. Sem
`console.error`, sem UI de falha — apenas espera. Erro é reservado para falha real
de carregamento (D5).

---

## D4 — Carregamento não bloqueante (Princípio I e III)

**Decisão**: **não** carregar o mp3 no `preload()` da BootScene. O `MusicManager`
dispara um passe de loader próprio (`load.audio(...)` + `load.start()` fora do
preload) e toca no `Loader.Events.COMPLETE`.

**Rationale**: o arquivo tem **6,12 MB**. Colocá-lo no `preload()` faria a
BootScene esperar o download inteiro antes de `create()` — o jogador ficaria olhando
para uma tela vazia por vários segundos numa conexão média, e para sempre numa ruim.
Isso viola frontalmente o Princípio I ("visuais temporários NUNCA bloqueiam o avanço
da gameplay" — e música muito menos) e o Princípio III.

Com o load em segundo plano, o jogo abre e é jogável **imediatamente**, em silêncio,
e a música entra assim que chega. É também o que torna FR-010 (jogo jogável sem
áudio) verdadeiro por construção, e não por um `try/catch` esperançoso.

**Alternativas consideradas**:

- Manter no `preload()` e comprimir o arquivo: reduz o problema, não o elimina —
  conexão ruim continua bloqueando o boot por causa de *música*. Rejeitado como
  solução única.
- Tela de "carregando" com barra de progresso: adia o problema e adiciona UI que a
  spec não pediu.

---

## D5 — Compressão do asset (otimização, não bloqueio)

**Decisão**: tratar a recompressão do mp3 como **tarefa opcional de otimização**,
fora do caminho crítico.

**Rationale**: 6,12 MB é muito para uma faixa de fundo — provavelmente 320 kbps
estéreo, vindo direto da YouTube Audio Library. Um reencode para ~128 kbps
derrubaria o arquivo para cerca de 1/3 do tamanho sem perda audível para música
ambiente sob efeitos de jogo. Mas, com D4 no lugar, o tamanho **não bloqueia mais
nada** — ele só custa banda. Por isso vira otimização medida, não requisito.

**Nota operacional**: não há `ffmpeg`/`ffprobe` na máquina. Se essa tarefa for
executada, ela depende de instalar a ferramenta (`brew install ffmpeg`) — motivo a
mais para mantê-la fora do caminho crítico.

---

## D6 — Mudo e volume: uma fonte de verdade, dois controles (FR-005 + FR-006)

**Decisão**: o estado persistido é `{ muted: boolean; volume: number }`. O valor
aplicado ao som é derivado: `effectiveVolume = muted ? 0 : volume`.

Regras de coerência (o edge case "volume no mínimo vs. mudo" da spec):

- Arrastar o slider **até 0** liga o mudo (`muted = true`), mas **preserva** o
  último `volume > 0` — o ícone e o slider concordam entre si.
- Mexer o slider **acima de 0** desliga o mudo automaticamente.
- Desligar o mudo pelo botão **restaura o `volume` guardado**, sem o jogador
  precisar reajustar (cenário 2 da User Story 2).

**Rationale**: guardar `volume` separado do `muted` é o que permite o "volta como
estava" ao desmutar. Derivar o volume efetivo em vez de sobrescrever `volume` com 0
evita o estado inválido "desmutei e não escuto nada" — Princípio VII (modelar
estados inválidos como impossíveis).

---

## D7 — Persistência (FR-007)

**Decisão**: `localStorage`, chave `br-td:audio`, payload JSON `{ v: 1, muted,
volume }`. Leitura **tolerante**: chave ausente, JSON inválido, tipos errados ou
volume fora de `[0,1]` caem no default e registram um `console.warn` — nunca
quebram o boot.

**Rationale**: sem backend (Princípio VI). O campo `v` permite migrar o formato
depois sem adivinhação. O acesso é isolado atrás de uma interface `PreferenceStorage`
para (a) sobreviver ao `localStorage` que **lança exceção** no Safari em modo
privado, e (b) permitir testar as regras com um storage falso, sem DOM — o Vitest
deste projeto roda em `environment: 'node'`.

---

## D8 — Onde os controles vivem no HUD

**Decisão**: **barra superior**, alinhados à direita (a partir de x ≈ 960, dentro de
`HUD_HEIGHT = 64`).

**Rationale**: dois motivos concretos.

1. **A sidebar não tem espaço.** O botão Iniciar/Pausar ocupa
   `centerY = GAME_HEIGHT - 44` com 52 px de altura — sobram ~18 px até a borda.
   Enfiar áudio ali exigiria mexer em `ROSTER_CONTROL` / `ROSTER_VIEWPORT_BOTTOM`,
   quebrando o layout do roster e seus testes (`rosterLayout.test.ts`) — retrabalho
   gratuito num sistema que acabou de ser endurecido na feature 007.
2. **A barra superior tem espaço de sobra e já é zona segura.** Os stats terminam
   por volta de x ≈ 560 de 1280 disponíveis. E `maps.ts` já define
   `buildBounds.minY = HUD_HEIGHT`: clique na barra superior **não constrói torre**.
   O controle de áudio não vai roubar cliques da gameplay — que é o risco real de
   colocar UI nova sobre o campo.

**Alternativas consideradas**: rodapé da sidebar (rejeitado acima); overlay/menu de
opções (adiciona navegação para uma decisão de um clique — contraria SC-003, que
exige silenciar em **uma única ação**).

---

## D9 — Slider de volume em Phaser

**Decisão**: construir com primitivas (`Rectangle` para trilho e alça) e extrair a
**geometria para uma regra pura** em `src/systems/volumeSlider.ts`:
`volumeFromPointerX(x)` e `handleXFromVolume(v)`, inversas uma da outra.

**Rationale**: o Phaser não tem slider pronto. A parte que pode errar é a
matemática (mapear pixel ↔ 0..1, com clamp nas pontas), e ela é exatamente a parte
testável sem renderizar nada — o mesmo padrão que `rosterLayout.ts` já usa neste
projeto (Princípio IX). O desenho fica burro; a regra fica coberta.

---

## D10 — Pausa não afeta a música (FR-004)

**Decisão**: o `MusicManager` **não escuta** `PAUSE_STATE_CHANGED`. Só a preferência
explícita do jogador altera o áudio.

**Rationale**: decisão do usuário, registrada na spec. A consequência arquitetural é
boa: o áudio não se acopla à máquina de estados da partida, então o ciclo
pausar/retomar não tem como cortar nem reiniciar a faixa.

**Nota**: o Phaser pausa o som quando a aba perde o foco (`pauseOnBlur`, ligado por
padrão) e retoma ao voltar. Isso resolve o edge case da aba em segundo plano sem
código nosso, e não conflita com FR-004 — perder o foco não é "pausar o jogo".
