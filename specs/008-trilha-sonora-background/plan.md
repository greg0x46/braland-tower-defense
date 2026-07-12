# Implementation Plan: Trilha Sonora de Background

**Branch**: `008-trilha-sonora-background` | **Date**: 2026-07-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-trilha-sonora-background/spec.md`

**Note**: Este plano termina na Phase 1 (design). As tarefas de implementação são geradas depois por `/speckit-tasks`.

## Summary

Adicionar uma trilha sonora de fundo em loop, com botão de mudo e controle de volume
gradual no HUD, e preferências persistidas entre sessões.

A abordagem técnica em uma frase: **o áudio é uma camada de apresentação que nunca
toca no domínio**. A trilha vive no Sound Manager *global* do Phaser (criada na
BootScene, a única cena que não reinicia), o que faz "instância única através do
restart" cair de graça em vez de virar lógica defensiva. As regras que podem errar —
coerência mudo↔volume, parse das preferências persistidas, geometria do slider — são
extraídas para módulos puros em `src/systems/`, testáveis sem DOM, no mesmo padrão de
`rosterLayout.ts`. O `MusicManager` fica sendo só a cola com o Phaser.

Duas decisões merecem destaque porque mudam o desenho:

1. **O mp3 (6,12 MB) não entra no `preload()`.** Ele é carregado em segundo plano,
   fora do caminho de boot. Música não pode atrasar o jogo abrir (Princípio I). O
   efeito colateral é que "o jogo continua jogável se o áudio falhar" (FR-010) passa
   a ser verdade por construção, não por `try/catch`.
2. **Os controles ficam na barra superior, não na sidebar.** A sidebar não tem espaço
   sob o botão Iniciar/Pausar sem quebrar o layout do roster (e seus testes); a barra
   superior tem espaço sobrando e já é zona não-construível (`buildBounds.minY =
   HUD_HEIGHT`), então nenhum clique de áudio vira torre por acidente.

## Technical Context

**Language/Version**: TypeScript 5.6.3, `strict: true`

**Primary Dependencies**: Phaser 3.88.2 (Sound Manager / WebAudio), Vite 5.4.10, eventemitter3

**Storage**: `localStorage` do navegador (chave `br-td:audio`) — apenas preferências de áudio; sem backend (Princípio VI)

**Testing**: Vitest 2.1.8 em `environment: 'node'` — regras puras sem DOM; `npm run check` como portão

**Target Platform**: Navegador (canvas)

**Project Type**: Jogo frontend de projeto único

**Performance Goals**: Nenhuma alocação nova no game loop; o áudio não roda no `update()`. Manter o loop estável com dezenas de inimigos/projéteis (SC-005)

**Constraints**: O boot do jogo NÃO pode esperar o download da música; nenhuma regra de gameplay pode depender do estado do áudio (FR-008); falha de áudio nunca é silenciosa (Princípio X)

**Scale/Scope**: 1 faixa, 2 controles de HUD (mudo + slider), 1 evento novo no EventBus, 3 módulos puros novos, 1 manager novo

## Constitution Check

*GATE: Deve passar antes da Phase 0. Reavaliado após a Phase 1.*

| Princípio | Status | Notas |
|-----------|--------|-------|
| I. Gameplay em Primeiro Lugar | PASS | O carregamento não bloqueante (D4) garante que a música jamais atrase o jogo abrir ou jogar. |
| II. Responsividade e Sensação de Controle | PASS | Mudo e volume aplicam efeito imediato; a spec trata áudio como parte da mecânica, não decoração. |
| III. Performance desde o Início | PASS | Áudio fica fora do `update()`; zero alocação por frame. SC-005 exige medição antes/depois. |
| IV. Arquitetura Desacoplada | PASS | `MusicManager` (Phaser) ↔ `AudioSettings` (estado) ↔ `systems/*` (regras puras) se falam por evento tipado. Nenhuma regra de gameplay conhece áudio. |
| V. Separação entre Dados, Lógica e Apresentação | PASS | A faixa é uma entrada em `src/data/audio.ts` (id estável, volume, loop); trocar a música não toca em código. |
| VI. Evolução Incremental | PASS | Uma faixa, sem playlist, sem sistema de SFX, sem backend. As abstrações introduzidas têm uso concreto **agora**. |
| VII. TypeScript Rigoroso | PASS | `{muted, volume}` com `effectiveVolume` derivado torna "desmutado e inaudível" irrepresentável (D6). Sem `any`/`as`. |
| VIII. Determinismo e Consistência | PASS | Regras puras e determinísticas; nenhum timer de gameplay envolvido. |
| IX. Testabilidade | PASS | Coerência mudo/volume, parse de preferências e geometria do slider são puros e testados sem DOM. |
| X. Observabilidade e Depuração | PASS | Falha de load e `localStorage` indisponível registram log. **Autoplay travado não é erro** — é espera esperada (D3). |
| XI. Assets Substituíveis | PASS | Faixa referenciada por chave de cache; nenhuma regra depende do arquivo. Sem áudio, o jogo roda em silêncio. |
| XII. Qualidade de Código | PASS | Cada módulo novo tem uma responsabilidade nomeável em uma frase. |
| XIII. Compatibilidade e Escalabilidade Visual | PASS | Controles posicionados por constantes derivadas de `PLAY_WIDTH`/`HUD_HEIGHT`, não por coordenadas mágicas. |
| XIV. Definição de Concluído | PASS | Coberto pelo checklist do quickstart + `npm run check`. |

**Resultado do gate: PASS, sem violações.** A seção *Complexity Tracking* fica vazia.

### Reavaliação pós-Phase 1

Mantido **PASS**. O design da Phase 1 não introduziu nenhuma abstração especulativa:
os três módulos puros existem porque há uma regra concreta que pode errar em cada um
(coerência, parse, geometria), e o `MusicManager` existe porque alguém precisa falar
com o Phaser. Nenhum deles tem "um único uso hipotético".

Um ponto de atenção honesto, registrado e aceito: `AudioSettings` é um **segundo
singleton de estado** ao lado de `GameState`. Isso é deliberado — juntar preferência
de áudio ao estado da partida acoplaria o áudio à máquina de progressão
(`matchProgression`) e ao `reset()`, que é exatamente o que FR-004 (a música ignora a
pausa) e FR-007 (a preferência sobrevive à partida) proíbem. Preferência de áudio tem
ciclo de vida *maior* que o da partida; misturá-los seria o erro.

## Project Structure

### Documentation (this feature)

```text
specs/008-trilha-sonora-background/
├── plan.md              # Este arquivo
├── research.md          # Phase 0 — decisões técnicas D1..D10
├── data-model.md        # Phase 1 — entidades e estados
├── quickstart.md        # Phase 1 — roteiro de validação
├── contracts/
│   ├── audio-playback.md      # Ciclo de vida da trilha
│   └── audio-preferences.md   # Mudo, volume, persistência, evento
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 — gerado por /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── assets/
│   └── audio/
│       └── sideways-samba.mp3        # [JÁ MOVIDO] a faixa
├── core/
│   ├── constants.ts                  # [MOD] + AUDIO (volume padrão, chave, layout)
│   ├── EventBus.ts                   # [MOD] + AUDIO_SETTINGS_CHANGED (+ EVENT_CATALOG)
│   ├── AudioSettings.ts              # [NOVO] singleton de preferência (mudo/volume)
│   └── preferenceStorage.ts          # [NOVO] adaptador localStorage tolerante a falha
├── data/
│   └── audio.ts                      # [NOVO] catálogo da(s) faixa(s) — data-driven
├── systems/
│   ├── audioSettings.ts              # [NOVO] regra pura: coerência mudo↔volume
│   ├── audioSettings.test.ts         # [NOVO]
│   ├── audioPreferencesCodec.ts      # [NOVO] regra pura: parse/serialize tolerante
│   ├── audioPreferencesCodec.test.ts # [NOVO]
│   ├── volumeSlider.ts               # [NOVO] regra pura: geometria do slider
│   └── volumeSlider.test.ts          # [NOVO]
├── managers/
│   └── MusicManager.ts               # [NOVO] cola com o Phaser: load, unlock, play, volume
└── scenes/
    ├── BootScene.ts                  # [MOD] instancia o MusicManager (load não bloqueante)
    └── UIScene.ts                    # [MOD] botão de mudo + slider na barra superior
```

**Structure Decision**: nenhuma camada nova. Cada peça entra numa camada que a
*Arquitetura de Referência* da constitution já define: dados em `data/`, regras puras
em `systems/`, estado + eventos em `core/`, cola com o motor em `managers/`,
apresentação em `scenes/`. O `MusicManager` é o **único** módulo que importa Phaser e
o único que conhece o caminho do arquivo — mesma disciplina que a BootScene já aplica
às texturas (contrato C1).

## Fluxo em uma passada

```text
BootScene.create()
   └─ MusicManager.start()
        ├─ AudioSettings.load()            → lê localStorage (tolerante) → {muted, volume}
        ├─ load.audio(...) em background   → NÃO bloqueia o boot; jogo já é jogável
        └─ on(COMPLETE):
             ├─ sound.add(track, {loop:true, volume: effectiveVolume})
             └─ sound.locked ? esperar UNLOCKED → play()   :   play()

UIScene (barra superior, à direita)
   ├─ 🔊/🔇  → AudioSettings.toggleMute()
   └─ slider → AudioSettings.setVolume(volumeFromPointerX(x))
                     │
                     ├─ aplica a regra pura de coerência (mudo↔volume)
                     ├─ persiste em localStorage
                     └─ emite AUDIO_SETTINGS_CHANGED { muted, volume, effectiveVolume }
                              ├─ MusicManager → sound.setVolume(effectiveVolume)
                              └─ UIScene      → atualiza ícone + posição da alça
```

O gameplay não aparece nesse diagrama — é o ponto. Nenhuma seta cruza para
`GameState`, `WaveManager` ou `BuildManager` (FR-008).

## Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Faixa duplicada após reiniciar a partida (FR-003) | Som criado na BootScene, que não reinicia, no Sound Manager **global**. O `MusicManager` guarda uma instância única e é idempotente. Cenário explícito no quickstart. |
| 6,12 MB atrasando o boot | Load fora do `preload()` (D4). Recompressão fica como otimização opcional, não bloqueante (D5). |
| Autoplay bloqueado virar "erro" no console | `sound.locked` é caminho **esperado**, tratado com `UNLOCKED`, sem log de erro (D3). Erro fica reservado a falha real de load. |
| `localStorage` lançando exceção (Safari privado) | Acesso isolado atrás de `preferenceStorage` com `try/catch` + `warn`; o jogo cai no default e segue. |
| Clique no controle de áudio construir uma torre | Controles na barra superior, que já é zona não-construível (`buildBounds.minY = HUD_HEIGHT`). Verificado no quickstart. |
| Regressão de performance (SC-005) | Áudio fora do `update()`; medição de FPS antes/depois no quickstart. |

## Complexity Tracking

Sem violações da constitution. Nada a justificar.
