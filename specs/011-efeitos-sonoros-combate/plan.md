# Implementation Plan: Efeitos Sonoros de Combate

**Branch**: `011-efeitos-sonoros-combate` | **Date**: 2026-07-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-efeitos-sonoros-combate/spec.md`

**Note**: Este plano termina na Phase 1 (design). As tarefas de implementação sao
geradas depois por `/speckit-tasks`.

## Summary

Adicionar efeitos sonoros curtos para ataques de torres, dano/impacto em inimigos,
derrota de inimigos e inimigos que vazam ate a base, respeitando o controle de
mudo/volume existente e mantendo a trilha sonora confortavel.

A abordagem tecnica em uma frase: **SFX e feedback de combate sao apresentacao
acionada por eventos tipados, nunca regra de combate**. O dano, cooldown, economia e
progressao continuam onde estao (`systems/combat.ts`, `systems/engagement.ts`,
`Projectile`, `Enemy`, `GameState`). A feature adiciona um catalogo de efeitos em
`src/data/audio.ts`, perfis sonoros opcionais nos dados de torres/inimigos, eventos
de audio de combate no `EventBus`, regras puras de limitacao de repeticao em
`src/systems/combatSfx.ts` e um `CombatSfxManager` que e a unica cola entre esses
eventos e o Sound Manager do Phaser.

Decisao central: o som de ataque nasce no mesmo ponto em que a acao real e
confirmada. Torre sem alvo ou strike cancelado nao emite evento. Dano de projetil
toca no impacto real do projetil. Dano direto/area toca quando `takeDamage()` e
chamado para alvo vivo. Derrota e vazamento reutilizam os eventos ja existentes
`ENEMY_KILLED` e `ENEMY_LEAKED`, adicionando o `CombatSfxManager` como consumidor, e
nao como dono de recompensa ou dano.

## Technical Context

**Language/Version**: TypeScript 5.6.3, `strict: true`

**Primary Dependencies**: Phaser 3.88.2 (Sound Manager / WebAudio), Vite 5.4.10,
eventemitter3

**Storage**: `localStorage` do navegador ja usado por `AudioSettings` para mudo e
volume (`br-td:audio`); sem nova persistencia

**Testing**: Vitest 2.1.8 em `environment: 'node'` para regras puras; `npm run check`
como portao; validacao manual com navegador para audibilidade e restricoes de
autoplay

**Target Platform**: Navegador (canvas)

**Project Type**: Jogo frontend de projeto unico

**Performance Goals**: Zero alocacao por frame no `update()` por causa de audio;
limitacao de repeticao para ondas com dezenas de inimigos; nenhuma queda perceptivel
de fluidez em sessao de 10 minutos (SC-003, SC-005)

**Constraints**: Audio nao altera gameplay (FR-006); todos os efeitos respeitam
`AudioSettings.effectiveVolume` imediatamente (FR-005); falha de asset registra e o
jogo segue jogavel (FR-009); pausa/reinicio nao deixam sons atrasados (FR-011)

**Scale/Scope**: 4 categorias de evento audivel (`tower-attack`, `enemy-damaged`,
`enemy-killed`, `enemy-leaked`), efeitos padrao por categoria, perfis opcionais por
tipo de torre/inimigo, 1 manager Phaser novo, 1 modulo puro de throttling/mixagem,
eventos tipados novos no `EventBus`

## Constitution Check

*GATE: Deve passar antes da Phase 0. Reavaliado apos a Phase 1.*

| Principio | Status | Notas |
|-----------|--------|-------|
| I. Gameplay em Primeiro Lugar | PASS | Efeitos sao feedback imediato de combate; ausencia/falha de audio nao bloqueia jogar. |
| II. Responsividade e Sensacao de Controle | PASS | Ataque, impacto, derrota e vazamento ganham feedback audivel no evento real. |
| III. Performance desde o Inicio | PASS | Audio nao roda regras no game loop; throttling puro limita sons simultaneos. |
| IV. Arquitetura Desacoplada | PASS | Gameplay emite eventos tipados; `CombatSfxManager` consome. Nenhuma regra consulta som. |
| V. Separacao entre Dados, Logica e Apresentacao | PASS | Catalogo/perfis em `src/data/audio.ts`; regras puras em `systems/`; Phaser em manager. |
| VI. Evolucao Incremental | PASS | Comeca com padroes por categoria e perfis opcionais; sem playlist, backend ou mixer separado. |
| VII. TypeScript Rigoroso | PASS | IDs e categorias modelados por unioes/records; sem `any`; payloads no `EventBus`. |
| VIII. Determinismo e Consistencia | PASS | Throttling e resolucao de fallback dependem de relogio/evento controlado e sao testaveis. |
| IX. Testabilidade | PASS | Resolucao de perfil, volume efetivo e limitacao de repeticao sao exercitaveis sem Phaser. |
| X. Observabilidade e Depuracao | PASS | Falha real de asset registra erro/warn com chave do efeito; autoplay travado nao e erro. |
| XI. Assets Substituiveis | PASS | Efeitos sao referenciados por `cacheKey`/id estavel, nunca por caminho na regra de combate. |
| XII. Qualidade de Codigo | PASS | Cada modulo novo tem responsabilidade unica: catalogo, regra pura, manager, contrato. |
| XIII. Compatibilidade e Escalabilidade Visual | PASS | Sem impacto em layout/resolucao; controles de audio existentes continuam sendo a unica UI. |
| XIV. Definicao de Concluido | PASS | Quickstart cobre loop, mudo, falha, pausa/reinicio, conforto e `npm run check`. |

**Resultado do gate: PASS, sem violacoes.** A secao *Complexity Tracking* fica vazia.

### Reavaliacao pos-Phase 1

Mantido **PASS**. Os artefatos de design preservam a regra principal: efeitos sonoros
sao substituiveis e acionados por contratos tipados. A unica nova peca acoplada ao
Phaser e `CombatSfxManager`, espelhando o papel de `MusicManager`. O modulo puro
`combatSfx.ts` existe porque ha uma regra concreta que pode errar e precisa de teste:
limitar repeticao simultanea sem perder alertas importantes.

Ponto de atencao aceito: a feature adiciona novos eventos de apresentacao ao
`EventBus`. Isso e preferivel a fazer `Tower`, `Projectile` ou `Enemy` conhecerem o
Sound Manager. Os eventos devem ter payload suficiente para resolver perfil/fallback
sem o consumidor ler estado global.

## Project Structure

### Documentation (this feature)

```text
specs/011-efeitos-sonoros-combate/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── combat-audio-events.md
│   └── combat-sfx-playback.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 - gerado por /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── assets/
│   └── audio/
│       ├── combat-attack-default.*       # [NOVO] efeito curto padrao de ataque
│       ├── combat-impact-default.*       # [NOVO] efeito curto de dano/impacto
│       ├── combat-kill-default.*         # [NOVO] efeito de derrota
│       └── combat-leak-default.*         # [NOVO] alerta de vazamento
├── core/
│   ├── constants.ts                      # [MOD] limites de SFX, volumes base, chaves
│   └── EventBus.ts                       # [MOD] eventos de audio de combate + catalogo
├── data/
│   ├── audio.ts                          # [MOD] catalogo de musicas + SFX
│   ├── towers.ts                         # [MOD] perfil sonoro opcional por torre
│   └── enemies.ts                        # [MOD] perfil sonoro opcional por inimigo
├── systems/
│   ├── combatSfx.ts                      # [NOVO] regra pura: fallback, prioridade, throttle
│   └── combatSfx.test.ts                 # [NOVO]
├── managers/
│   └── CombatSfxManager.ts               # [NOVO] cola Phaser: preload/play/volume/reset
├── entities/
│   ├── Tower.ts                          # [MOD] emite ataque audivel apos strike real
│   ├── Projectile.ts                     # [MOD] informa impacto real antes de aplicar dano
│   └── Enemy.ts                          # [MOD] retorna resultado de dano sem tocar em audio
└── scenes/
    ├── BootScene.ts                      # [MOD] carrega/valida assets SFX ou fallback
    └── GameScene.ts                      # [MOD] instancia manager e emite eventos de combate
```

**Structure Decision**: nenhuma camada nova. O desenho segue a arquitetura atual:
dados configuraveis em `data/`, regras puras em `systems/`, evento/estado global em
`core/`, cola com Phaser em `managers/`, coordenacao em `scenes/` e entidades sem
dependencia no motor de audio. `CombatSfxManager` e deliberadamente separado de
`MusicManager`: musica tem ciclo de vida global na BootScene; efeitos de combate tem
ciclo de vida da partida/cena e devem parar no pause/reset/shutdown.

## Fluxo em uma passada

```text
BootScene.preload()
   └─ enfileira assets SFX padrao e registra falhas observaveis

GameScene.create()
   └─ CombatSfxManager.start()
        ├─ escuta AUDIO_SETTINGS_CHANGED para effectiveVolume
        ├─ escuta COMBAT_AUDIO_EVENT / ENEMY_KILLED / ENEMY_LEAKED
        └─ reseta throttles em MATCH_RESET e shutdown

Tower.update()
   └─ stepEngagement() gera strike real
        └─ Tower.applyOutcome()
             ├─ emite tower-attack quando outcome != none e alvo valido
             ├─ dano direto/area chama Enemy.takeDamage()
             └─ projeteis emitem impacto quando atingem alvo vivo

CombatSfxManager
   └─ resolve perfil/fallback + aplica throttling + play(soundKey, effectiveVolume * relativeVolume)
```

## Riscos e mitigacoes

| Risco | Mitigacao |
|-------|-----------|
| Sons duplicados em ondas intensas | `combatSfx.ts` limita repeticao por chave/categoria e preserva prioridade de `enemy-leaked`. |
| Som tocar para ataque sem alvo | Evento emitido apenas depois de `resolveAttack()` retornar efeito real e validado. |
| Audio alterar regras de dano/economia | Payloads sao somente leitura; manager nao importa `GameState`, `Tower`, `Enemy` nem `Projectile`. |
| Mudo durante efeito ja tocando | `CombatSfxManager` aplica `effectiveVolume` em sons ativos e para/silencia grupo SFX ao receber volume 0. |
| Reinicio deixar sons pendentes | Manager limpa sons ativos e janelas de throttle em `MATCH_RESET` e `Scenes.SHUTDOWN`. |
| Asset SFX faltando | Catalogo tem fallback por categoria; falha registra chave e jogo segue em silencio ou com fallback disponivel. |
| Mixagem competir com a trilha | Volumes relativos baixos por padrao, limite por janela e quickstart com validacao de 10 minutos. |

## Complexity Tracking

Sem violacoes da constitution. Nada a justificar.
