---

description: "Task list — Trilha Sonora de Background"
---

# Tasks: Trilha Sonora de Background

**Input**: Design documents from `/specs/008-trilha-sonora-background/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: Tarefas de teste **estão incluídas**. Não por hábito de TDD, mas porque a constitution as exige (Princípio IX + "Definição de Concluído": *"tem testes quando envolve regra crítica"*). As três regras puras desta feature — coerência mudo↔volume, parse tolerante das preferências e geometria do slider — são exatamente onde um erro passa despercebido. O resto (Phaser, HUD) é validado à mão pelo [quickstart](./quickstart.md).

**Organization**: Tarefas agrupadas por user story, para cada uma ser implementável e testável de forma independente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: A qual user story a tarefa pertence (US1, US2, US3)

## Path Conventions

Projeto único, jogo frontend. Todo o código em `src/` na raiz do repositório, seguindo a *Arquitetura de Referência* da constitution: `data/` (config), `systems/` (regras puras), `core/` (estado/eventos), `managers/` (cola com o motor), `scenes/` (apresentação).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Configuração e dados. Nenhum comportamento novo ainda.

- [X] T001 [P] Adicionar bloco `AUDIO` em `src/core/constants.ts` com `defaultVolume: 0.35` e `storageKey: 'br-td:audio'` (referência: [data-model.md](./data-model.md) §1 e §3)
- [X] T002 [P] Criar o catálogo de faixas em `src/data/audio.ts` com a entrada `sideways-samba` (`id`, `cacheKey: 'bgm-sideways-samba'`, `defaultVolume`, `loop: true`), tipada como `MusicTrack` — data-driven, sem caminho de arquivo aqui (Princípio V)
- [X] T003 Confirmar que `src/vite-env.d.ts` (`/// <reference types="vite/client" />`) já cobre o import de `.mp3` rodando `npm run typecheck` com um import temporário do asset; nenhuma declaração nova deve ser necessária

**Checkpoint**: A faixa existe como dado configurável. O jogo ainda não toca nada.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: O contrato de preferência de áudio. Bloqueia **todas** as user stories — US1 precisa dele para nascer com o volume correto (contrato C6: uma preferência "mudo" carregada nunca pode deixar escapar um instante de música alta).

**⚠️ CRITICAL**: Nenhuma user story começa antes desta fase terminar.

- [X] T004 Implementar as regras puras em `src/systems/audioSettings.ts`: `clampVolume`, `toggleMute`, `setVolume` e o derivado `effectiveVolume = muted ? 0 : volume`. Sem Phaser, sem DOM, sem `localStorage` (contrato [audio-preferences.md](./contracts/audio-preferences.md) P1–P3)
- [X] T005 Escrever `src/systems/audioSettings.test.ts` cobrindo as tabelas P2/P3 do contrato: `toggleMute` **preserva** o `volume`; `setVolume(0)` colapsa em mudo preservando o volume anterior não-zero; `setVolume(>0)` desmuta; clamp em `[0,1]`; `NaN` não corrompe o estado. Incluir as 4 invariantes de P1
- [X] T006 Adicionar `AUDIO_SETTINGS_CHANGED` em `src/core/EventBus.ts`: entrada em `GameEvents`, payload `{ muted, volume, effectiveVolume }` em `GameEventPayloads` e a entrada correspondente em `EVENT_CATALOG` (status `active`, producer `AudioSettings`, consumers `MusicManager` + `UIScene`) — o catálogo é verificado por `EventBus.test.ts`, então um evento sem consumidor declarado quebra o portão
- [X] T007 Criar o singleton `src/core/AudioSettings.ts` (espelhando o padrão de `GameState`): guarda `{muted, volume}` em memória, delega as decisões às regras puras de T004 e emite `AUDIO_SETTINGS_CHANGED` **apenas quando o estado muda de fato**. Persistência **não** entra aqui — ela é da US3 (P5)

**Checkpoint**: O estado de áudio existe, é testado e é observável por evento. Ainda não sai som.

---

## Phase 3: User Story 1 — Música ambiente durante a partida (Priority: P1) 🎯 MVP

**Goal**: A trilha toca em loop, continuamente, sem o jogador configurar nada. Sozinha, esta fase já entrega o valor inteiro da feature.

**Independent Test**: Abrir o jogo, interagir uma vez, ouvir a música; deixar a faixa terminar e confirmar que reinicia sem corte; perder e reiniciar a partida e confirmar que **não** surge uma segunda faixa sobreposta.

**Nota de sequência**: T008–T012 mexem todas em `src/managers/MusicManager.ts` — são deliberadamente **sequenciais**, sem `[P]`. Estão separadas porque cada uma é um contrato distinto que pode ser verificado sozinho, não porque possam ser paralelizadas.

- [X] T008 [US1] Criar `src/managers/MusicManager.ts` com carregamento **não bloqueante**: `load.audio(...)` + `load.start()` **fora** do `preload()`, tocando no `Phaser.Loader.Events.COMPLETE`. Este módulo é o **único** que importa o `.mp3` (`../assets/audio/sideways-samba.mp3`) e o único que fala com o Phaser Sound (contrato [audio-playback.md](./contracts/audio-playback.md) C2)
- [X] T009 [US1] Em `src/managers/MusicManager.ts`, criar o som com `sound.add(cacheKey, { loop: true, volume: AudioSettings.effectiveVolume })` no Sound Manager **global**, com `start()` **idempotente** — chamar duas vezes não cria um segundo som, não redispara o load e não reinicia a faixa (C1, C6)
- [X] T010 [US1] Em `src/managers/MusicManager.ts`, tratar o autoplay: se `this.sound.locked`, adiar o `play()` para `Phaser.Sound.Events.UNLOCKED`; senão tocar direto. Guard booleano impede tocar duas vezes. **Não registrar erro** — autoplay travado é espera esperada, não falha (C3)
- [X] T011 [US1] Em `src/managers/MusicManager.ts`, registrar `console.error` no `Phaser.Loader.Events.FILE_LOAD_ERROR` da faixa e seguir em silêncio, sem lançar (C4, Princípio X). Cuidado com a distinção que C4 destaca: **C3 é espera silenciosa; C4 é erro registrado** — confundir os dois enche o console de erro falso a cada primeiro load
- [X] T012 [US1] Em `src/managers/MusicManager.ts`, assinar `AUDIO_SETTINGS_CHANGED` e aplicar `sound.setVolume(effectiveVolume)`. O manager **consome** o volume efetivo; não recalcula a regra de mudo (C6). Fazer isso já na US1 mantém a US2 puramente visual
- [X] T013 [US1] Instanciar o `MusicManager` em `src/scenes/BootScene.ts` (dentro de `create()`, **não** em `preload()`). A BootScene é a única cena que nunca reinicia — é isso que faz a trilha atravessar derrota → reinício sem duplicar (C1, decisão D2)
- [X] T014 [US1] Validar os Cenários 1, 4 e 6 do [quickstart](./quickstart.md): loop contínuo sem estalo; reiniciar a partida 2–3× **sem** faixa sobreposta; jogo 100% jogável com o `.mp3` bloqueado no DevTools (com erro no console, mas sem travar)

**Checkpoint**: A feature já é entregável. Música tocando, em loop, sobrevivendo ao reinício, sem bloquear o boot e sem quebrar o jogo se o áudio falhar.

---

## Phase 4: User Story 2 — Controle de áudio pelo jogador (Priority: P2)

**Goal**: Botão de mudo e slider de volume no HUD, coerentes entre si, com efeito imediato.

**Independent Test**: Mutar e desmutar (o som volta no mesmo volume, sem reajustar); arrastar o slider e ouvir o volume acompanhar; levar o slider ao mínimo e ver o ícone virar 🔇; fazer tudo isso com uma onda rodando, sem a partida sofrer nada.

**Por que a UI é fina aqui**: o `MusicManager` já reage a `AUDIO_SETTINGS_CHANGED` (T012) e o `AudioSettings` já aplica as regras de coerência (T004/T007). Esta fase só liga botões a chamadas — é o retorno do investimento feito nas fases anteriores.

- [X] T015 [P] [US2] Criar `src/systems/volumeSlider.ts` com a geometria pura do slider: `AUDIO_HUD_LAYOUT` (posição/dimensões do trilho, derivadas de `PLAY_WIDTH`/`HUD_HEIGHT` — nada de coordenada mágica, Princípio XIII) e as funções inversas `volumeFromPointerX(x, layout)` e `handleXFromVolume(v, layout)`, com clamp nas duas pontas. Mesmo padrão de `rosterLayout.ts` (decisão D9)
- [X] T016 [US2] Escrever `src/systems/volumeSlider.test.ts` com a **invariante de ida e volta** — `volumeFromPointerX(handleXFromVolume(v)) === v` para todo `v ∈ [0,1]` — mais o clamp nas pontas (arrastar para fora do trilho satura em 0 ou 1, não extrapola). É o teste que pega o erro clássico de esquecer a meia-largura da alça em um dos lados
- [X] T017 [US2] Adicionar o botão de mudo (🔊/🔇) na **barra superior** de `src/scenes/UIScene.ts`, alinhado à direita (a partir de x ≈ 960, dentro de `HUD_HEIGHT`), chamando `AudioSettings.toggleMute()`. Reaproveitar o helper `makeButton`/`pressFeedback` já existente na cena (decisão D8)
- [X] T018 [US2] Adicionar o slider de volume em `src/scenes/UIScene.ts` (trilho + alça com `Rectangle`, arrastável), traduzindo pointer → volume com `volumeFromPointerX` e chamando `AudioSettings.setVolume(...)`. O desenho é burro; a matemática vive na regra pura de T015
- [X] T019 [US2] Em `src/scenes/UIScene.ts`, assinar `AUDIO_SETTINGS_CHANGED` para atualizar o ícone (via `muted`) e a posição da alça (via `handleXFromVolume(volume)`), e **desassinar no `onShutdown()`** junto com os outros `offGameEvent` — a cena reinicia a cada partida, e listener vazado aqui empilha silenciosamente
- [X] T020 [US2] Validar os Cenários 2 e 7 do [quickstart](./quickstart.md): mudo/desmute preservando volume; slider no mínimo ⇒ ícone 🔇 (sem HUD mentiroso); controles operados **durante uma onda** sem afetar a partida; clique no controle de áudio **não constrói torre** (a barra superior já é zona não-construível, `buildBounds.minY = HUD_HEIGHT`)

**Checkpoint**: US1 e US2 funcionam independentemente. O jogador pode silenciar em um clique (SC-003).

---

## Phase 5: User Story 3 — Preferência lembrada entre sessões (Priority: P3)

**Goal**: Mudo e volume sobrevivem ao recarregamento da página.

**Independent Test**: Silenciar (ou escolher um volume distinto), recarregar com F5, e o jogo iniciar já naquele estado — com ícone e alça refletindo, e sem nenhum instante de música alta antes de silenciar.

- [X] T021 [P] [US3] Criar `src/systems/audioPreferencesCodec.ts`: `serialize({muted, volume}) → { v: 1, muted, volume }` e `parse(raw) → AudioPreferences` **tolerante por contrato** — JSON inválido, `v` desconhecido, campo faltando, tipo errado ou volume fora de `[0,1]` **nunca lançam**; caem no default e registram `console.warn` (P4)
- [X] T022 [P] [US3] Criar o adaptador `src/core/preferenceStorage.ts` atrás de uma interface `PreferenceStorage`, com `try/catch` em leitura **e** escrita (o `localStorage` **lança exceção** no Safari em modo privado). Falha registra `warn` e o jogo segue no default — perder a persistência é aborrecimento, travar a partida por causa dela seria bug (P4)
- [X] T023 [US3] Escrever `src/systems/audioPreferencesCodec.test.ts` cobrindo a tabela P4 inteira (chave ausente ⇒ default **sem** warn, pois não é anomalia; lixo/JSON inválido/versão desconhecida/tipo errado ⇒ default + warn; volume fora da faixa ⇒ clamp) e a ida e volta `serialize`/`parse`. Usar um storage falso — o Vitest roda em `environment: 'node'`, sem DOM
- [X] T024 [US3] Ligar a persistência em `src/core/AudioSettings.ts`: `load()` no boot (aplicando a preferência **antes** de o som ser criado, para honrar C6) e `save()` a cada mudança de estado. Emitir `AUDIO_SETTINGS_CHANGED` uma vez após o load, para o HUD nascer sincronizado (P5)
- [X] T025 [US3] Validar o Cenário 3 do [quickstart](./quickstart.md): silenciar → F5 → jogo abre mudo, com ícone e alça corretos, sem vazar música alta antes de silenciar

**Checkpoint**: As três user stories funcionam de forma independente.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T026 Rodar o portão completo: `npm run check` (`tsc --noEmit && vitest run`). Confirmar que `EventBus.test.ts` valida a nova entrada do `EVENT_CATALOG` sem ajuste manual
- [X] T027 Validar os Cenários 5 e 8 do [quickstart](./quickstart.md): pausar/continuar várias vezes **sem** cortar, reiniciar ou duplicar a faixa (FR-004/C5); e medir FPS + contagem de entidades numa onda densa contra o commit anterior — o áudio não roda no `update()`, então qualquer queda perceptível indica que algo foi parar no game loop (SC-005)
- [X] T028 Percorrer o *Checklist de Definição de Concluído* no fim do [quickstart](./quickstart.md) (Constitution XIV) — os 11 itens, incluindo a distinção C3 vs. C4 no console
- [X] T029 [P] Registrar a atribuição da faixa no `README.md`: **"Sideways Samba" — Audionautix**, YouTube Audio Library, música sem copyright
- [X] T030 [P] **Feito** (o usuário instalou o `ffmpeg`): `.mp3` recomprimido de **256 kbps (5,84 MB) para 128 kbps (2,92 MB)** — metade do tamanho. Duração idêntica (191,32 s, então o loop não muda) e RMS praticamente igual (−14,30 → −14,75 dB). Cenários 1 e 2 revalidados no browser com o arquivo novo: carrega, toca em loop, mudo/slider respondem, zero erro no console. Original de 256 kbps guardado fora do repo (ver relatório); a faixa também é re-baixável da YouTube Audio Library (decisão D5)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências
- **Foundational (Phase 2)**: depende do Setup — **BLOQUEIA todas as user stories**
- **US1 (Phase 3)**: depende da Phase 2
- **US2 (Phase 4)**: depende da Phase 2. Roda sem a US1 no sentido do código, mas **só é audível** com a US1 pronta (sem trilha, não há o que mutar) — na prática, entregue depois
- **US3 (Phase 5)**: depende da Phase 2. Independente da US2 no código; a preferência de volume só é *ajustável* pelo jogador com a US2, mas a de mudo já é persistível sem ela
- **Polish (Phase 6)**: depende das stories desejadas

### Within Each User Story

- Regra pura e seu teste antes do consumo pela cena/manager
- `AudioSettings` antes do `MusicManager` (o som nasce com o volume efetivo — C6)
- `MusicManager` antes da UI (a UI só mexe em estado; quem soa é o manager)

### Parallel Opportunities

- **Phase 1**: T001 e T002 em paralelo (arquivos diferentes)
- **Phase 2**: T004 e T006 tocam arquivos diferentes e poderiam ir juntas, mas T007 depende das duas — o ganho é pequeno; sequencial é mais seguro aqui
- **Phase 3**: **nenhuma**. T008–T013 mexem todas em `MusicManager.ts` / `BootScene.ts`. Paralelizar aqui só geraria conflito
- **Phase 4**: T015 (regra pura) em paralelo com nada mais desta fase — T017–T019 são todas na `UIScene.ts`
- **Phase 5**: T021 e T022 em paralelo (arquivos diferentes, sem dependência entre si)
- **Phase 6**: T029 e T030 em paralelo

**Observação honesta**: esta é uma feature pequena e concentrada em poucos arquivos. As oportunidades reais de paralelismo são poucas — marcar `[P]` em tarefas que mexem no mesmo arquivo seria mentira útil para ninguém.

---

## Parallel Example: Phase 5 (US3)

```bash
# Duas peças independentes da persistência, em arquivos diferentes:
Task: "Criar codec tolerante em src/systems/audioPreferencesCodec.ts"
Task: "Criar adaptador de storage em src/core/preferenceStorage.ts"
# Depois, sequencialmente: T023 (teste) → T024 (ligar no AudioSettings)
```

---

## Implementation Strategy

### MVP (só a User Story 1)

1. Phase 1 (Setup) → 2. Phase 2 (Foundational) → 3. Phase 3 (US1)
4. **PARE e VALIDE**: Cenários 1, 4 e 6 do quickstart
5. Neste ponto o pedido original já está atendido: **o jogo tem trilha sonora**

O MVP entrega o valor inteiro do pedido do usuário. US2 e US3 são o que tornam a trilha *suportável a longo prazo* (poder calar) e *educada* (lembrar a escolha) — importantes, mas não são o pedido.

### Entrega incremental

1. Setup + Foundational → base pronta
2. + US1 → **música tocando** (MVP, demonstrável)
3. + US2 → jogador pode calar e ajustar
4. + US3 → a escolha sobrevive ao F5
5. Polish → portão verde, atribuição no README, otimização opcional

---

## Notes

- `[P]` = arquivos diferentes, sem dependência pendente
- O maior risco desta feature é a **faixa duplicada após reiniciar a partida** (T014, Cenário 4). O som "dobrado" é inconfundível — se aparecer, o som não está no Sound Manager global ou o `start()` não é idempotente
- O segundo maior risco é **encher o console de erro falso** confundindo autoplay travado (espera normal) com falha de load (erro real) — T010 vs. T011
- Commit após cada tarefa ou grupo lógico; `npm run check` verde antes de considerar qualquer fase concluída
