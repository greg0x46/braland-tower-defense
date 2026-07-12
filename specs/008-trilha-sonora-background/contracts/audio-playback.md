# Contrato: Reprodução da Trilha (Audio Playback)

**Feature**: `008-trilha-sonora-background` | **Dono**: `src/managers/MusicManager.ts`

O `MusicManager` é o **único** módulo do projeto que importa o Phaser para áudio e o
único que conhece o caminho do arquivo `.mp3` — mesma disciplina que a BootScene
aplica às texturas (contrato C1 da feature 007). Nada fora dele sabe que existe um
Sound Manager.

---

## C1 — Instância única, dona global

**Regra**: existe **no máximo um** som de trilha vivo em todo o jogo, registrado no
Sound Manager **global** (`game.sound`), criado a partir da **BootScene**.

**Por quê a BootScene**: `UIScene.restartGame()` chama `scene.restart()` em GameScene
e UIScene. A BootScene já foi encerrada por `scene.start('GameScene')` e não roda de
novo. Um som criado ali sobrevive a derrota → reinício → nova partida sem parar e sem
duplicar.

**Garantias**:

- `MusicManager.start()` é **idempotente**: chamar duas vezes não cria um segundo som,
  não redispara o load e não reinicia a faixa.
- Reiniciar a partida (`🔁 Jogar novamente`) NÃO para, NÃO reinicia e NÃO duplica a
  trilha.
- Alternar mudo/volume NUNCA cria uma nova instância — apenas ajusta o volume da
  existente.

**Proibido**: criar o som em GameScene ou UIScene; chamar `sound.add()` fora do
`MusicManager`; usar `this.sound.play(key)` (que instancia um som novo a cada chamada).

---

## C2 — Carregamento não bloqueante

**Regra**: o `.mp3` NÃO é carregado no `preload()`. O `MusicManager` dispara um passe
de loader próprio e reage a `Phaser.Loader.Events.COMPLETE`.

**Garantias**:

- O jogo abre e é **jogável** antes de a música existir. O tempo até o primeiro frame
  jogável é **independente** do tamanho do arquivo de áudio.
- Enquanto a faixa não chega, o jogo roda em silêncio. Isso não é um estado de erro.
- Construir, iniciar onda, combater e perder funcionam normalmente durante o download.

**Racional**: o arquivo tem 6,12 MB. No `preload()`, ele seguraria o boot inteiro —
música atrasando gameplay é exatamente o que o Princípio I proíbe.

---

## C3 — Autoplay travado é espera, não erro

**Regra**: se `sound.locked` for `true` no momento de tocar, o `play()` é adiado para
o evento `Phaser.Sound.Events.UNLOCKED`. Um guard impede tocar duas vezes.

**Garantias**:

- Áudio travado por política de autoplay **não** gera `console.error`, **não** exibe
  UI de falha e **não** deixa o jogo em estado degradado.
- A música começa na primeira interação real do jogador (clique, toque ou tecla) —
  incluindo o próprio clique em "▶ Iniciar".
- Se a faixa já estiver tocando quando `UNLOCKED` chegar, o handler é inerte.

**Proibido**: tratar `locked` como falha; tentar "forçar" o play em loop; registrar
erro por algo que é comportamento esperado do navegador.

---

## C4 — Falha real de áudio é visível, mas nunca fatal

**Regra**: falha de **carregamento** (`Phaser.Loader.Events.FILE_LOAD_ERROR`), formato
não suportado ou ausência de saída de som registram `console.error` e deixam o jogo
seguir em silêncio.

**Garantias**:

- Uma partida completa (construir → onda → combate → derrota → reiniciar) é jogável do
  início ao fim sem áudio nenhum (FR-010, SC-006).
- Nenhuma regra de gameplay consulta o estado do áudio para decidir qualquer coisa.
- Nenhum caminho de falha é engolido em silêncio (Princípio X).

**Distinção que importa** (e é fácil de errar): **C3 é espera silenciosa; C4 é erro
registrado.** Confundir os dois enche o console de erro falso em todo primeiro load —
ou, pior, esconde uma falha real de asset atrás de "ah, deve ser o autoplay".

---

## C5 — A pausa da partida não toca no áudio

**Regra**: o `MusicManager` **não escuta** `PAUSE_STATE_CHANGED`. A trilha segue
tocando durante o setup, a pausa e a tela de derrota.

**Garantias**:

- Só a preferência explícita do jogador (mudo/volume) altera o que se ouve.
- Pausar e retomar N vezes não corta, não reinicia do zero e não duplica a faixa.

**Racional**: decisão do usuário registrada em FR-004. O efeito arquitetural é
desejável: o áudio não se acopla à máquina de estados `matchProgression`.

**Fora do contrato (e tudo bem)**: o Phaser pausa o som quando a **aba perde o foco**
(`pauseOnBlur`, ligado por padrão) e retoma ao voltar. Perder o foco não é "pausar o
jogo", então isso não conflita com C5 — e resolve o edge case da aba em segundo plano
sem uma linha de código nossa.

---

## C6 — O volume aplicado é sempre o efetivo

**Regra**: o único valor que chega ao som é o `effectiveVolume` (`muted ? 0 : volume`),
recebido via `AUDIO_SETTINGS_CHANGED`. O `MusicManager` **não** recalcula essa regra —
ele a consome.

**Garantias**:

- A regra de coerência mudo↔volume tem **uma única fonte de verdade** (`systems/audioSettings.ts`),
  testada sem DOM.
- O som nasce já com o volume correto: o som criado em C1 usa o `effectiveVolume` atual
  no `sound.add(...)`, então uma preferência "mudo" carregada do storage **nunca** deixa
  escapar um instante de música alta antes de silenciar.

**Proibido**: `MusicManager` ler `localStorage`, aplicar clamp de volume ou decidir se
está mudo. Isso é responsabilidade de `AudioSettings` + regras puras.
