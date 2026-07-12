# Phase 0 Research: Efeitos Sonoros de Combate

## D1 - Origem dos eventos sonoros de combate

**Decision**: Emitir eventos sonoros somente nos pontos em que a acao de gameplay ja
foi confirmada:

- ataque de torre: apos `resolveAttack()` retornar `projectile`, `direct` ou `area`
  para alvo valido;
- dano/impacto: no `Enemy.takeDamage()` chamado para inimigo vivo, ou no impacto
  real do `Projectile`;
- derrota: consumir o evento existente `ENEMY_KILLED`;
- vazamento: consumir o evento existente `ENEMY_LEAKED`.

**Rationale**: A spec exige que som corresponda a acao real e nao toque para torre
sem alvo, recarga ou ataque cancelado. O codigo atual ja separa a decisao de ataque
em `systems/combat.ts` e resolve vazamento/derrota em `GameScene`, entao esses pontos
sao os contratos mais proximos da verdade de gameplay.

**Alternatives considered**:

- Tocar som no inicio da animacao de ataque: rejeitado porque animacao pode existir
  sem dano aplicado, ou falhar sem mudar gameplay.
- Tocar som no `update()` por estado visual: rejeitado por risco de repeticao por
  frame e por misturar apresentacao com regra.
- Fazer `CombatSfxManager` inspecionar torres/inimigos: rejeitado por acoplamento e
  por violar payloads suficientes no EventBus.

## D2 - Modelo de eventos no EventBus

**Decision**: Adicionar eventos tipados de apresentacao para eventos ainda sem
contrato global, mantendo `ENEMY_KILLED` e `ENEMY_LEAKED` como fonte de derrota e
vazamento. O payload deve carregar `eventId`, `category`, `towerTypeId` ou
`enemyTypeId` quando aplicavel, posicao opcional e `occurredAtMs`.

**Rationale**: O `EventBus` ja e o contrato global entre gameplay, HUD e managers. Um
payload completo impede que o manager leia estado global para decidir perfil/fallback
e permite testes de contrato semelhantes aos ja existentes em `EventBus.test.ts`.

**Alternatives considered**:

- Callback direto de `Tower`/`Projectile` para `CombatSfxManager`: rejeitado porque
  criaria dependencia da entidade em audio.
- Reusar apenas `ENEMY_KILLED`/`ENEMY_LEAKED`: insuficiente para ataque e dano.
- Eventos Phaser locais da cena: rejeitado porque o projeto padronizou contratos
  tipados em `core/EventBus.ts`.

## D3 - Catalogo de efeitos e fallback

**Decision**: Estender `src/data/audio.ts` com um catalogo `COMBAT_SFX` contendo
efeitos padrao por categoria e permitir perfis opcionais em `TowerType` e
`EnemyType`. Cada entrada usa `id`, `cacheKey`, `category`, `defaultVolume`,
`cooldownMs`, `maxConcurrent`, `priority` e `fallbackId`.

**Rationale**: A constitution exige assets substituiveis e dados fora do codigo. A
spec tambem pede que tipos sem som especifico usem padrao adequado. Com fallback em
dados, adicionar uma torre ou inimigo novo nao exige mudar o manager.

**Alternatives considered**:

- Hardcodar chaves no manager: rejeitado por duplicar dados e tornar assets menos
  substituiveis.
- Exigir som especifico em todo tipo: rejeitado porque a primeira entrega pode usar
  padroes por categoria.
- Criar arquivo separado `combatAudio.ts`: possivel, mas `data/audio.ts` ja e o
  catalogo de audio. Separar so vale se o arquivo crescer demais.

## D4 - Estrategia de assets SFX

**Decision**: Usar arquivos curtos de SFX carregados pelo `BootScene` junto dos
assets essenciais, com fallback observavel se algum arquivo falhar. O plano aceita
assets iniciais simples e substituiveis, desde que sejam curtos, normalizados e
referenciados por cache key.

**Rationale**: Efeitos curtos tem custo baixo de preload e precisam estar prontos
quando o combate comeca. Diferente da trilha de 6 MB, eles nao devem atrasar
perceptivelmente o boot. Centralizar o load na BootScene mantem a regra atual:
quem enfileira o asset e quem reporta a falha.

**Alternatives considered**:

- Carregar SFX sob demanda no primeiro evento: rejeitado porque o primeiro ataque
  poderia ficar sem feedback e porque repetiria loader logic no manager.
- Sintetizar sons via WebAudio sem arquivo: rejeitado para a entrega principal por
  aumentar diferenca entre motores de audio e dificultar substituicao por arte final.
- Colocar SFX no `MusicManager`: rejeitado porque musica global e SFX de partida tem
  ciclos de vida diferentes.

## D5 - Mixagem, volume e mudo

**Decision**: `CombatSfxManager` consome `AudioSettings.effectiveVolume` via
`AUDIO_SETTINGS_CHANGED` e aplica `effectiveVolume * effect.defaultVolume` no play.
Quando o volume efetivo chega a 0, sons ativos de SFX devem parar ou ficar
inaudiveis imediatamente.

**Rationale**: A feature 008 ja estabeleceu que a regra mudo/volume tem uma unica
fonte de verdade em `systems/audioSettings.ts` e `AudioSettings`. Recalcular mudo no
manager duplicaria logica. Multiplicar por volume relativo resolve mixagem com a
trilha sem UI nova.

**Alternatives considered**:

- Criar controle separado de SFX: fora do escopo da spec e adicionaria UI/persistencia
  sem necessidade.
- Usar volume global do Sound Manager: rejeitado porque afetaria musica e SFX sem
  controle fino de mixagem.
- Ignorar sons ativos ao mutar: rejeitado por FR-005 e edge case "mudo durante um som".

## D6 - Limitacao de repeticao e prioridade

**Decision**: Implementar regra pura em `systems/combatSfx.ts` para decidir se um
evento deve tocar com base em `cooldownMs`, `maxConcurrent`, categoria, prioridade e
tempo atual. Alertas de vazamento tem prioridade maior que impacto/dano repetitivo.

**Rationale**: Ondas intensas podem gerar muitos impactos no mesmo frame. A regra
precisa ser testavel sem Phaser e previsivel. Uma janela por efeito/categoria evita
massa sonora, enquanto prioridade preserva eventos importantes.

**Alternatives considered**:

- Deixar Phaser mixar todos os sons: rejeitado por volume excessivo e possivel
  distorcao/performance ruim.
- Throttle global unico: rejeitado porque um impacto poderia bloquear alerta de
  vazamento.
- Aleatorizar quais sons tocam: rejeitado para a primeira entrega por dificultar
  testes e reprodutibilidade.

## D7 - Pausa, reset e ciclo de vida

**Decision**: `CombatSfxManager` deve parar sons ativos e limpar janelas de throttle
em `MATCH_RESET` e `Scenes.SHUTDOWN`. Durante pausa, nenhum novo evento de combate
deve nascer porque `GameState.advancesGameplay` ja congela o loop; se o jogador mutar
na pausa, o volume efetivo ainda se aplica.

**Rationale**: A spec proibe sons atrasados ou pertencentes a partida anterior. O
codigo atual reinicia `GameScene` e `UIScene`, entao o manager de SFX deve ter ciclo
de vida da cena e destruir listeners explicitamente.

**Alternatives considered**:

- Manter SFX global na BootScene como musica: rejeitado porque efeitos pertencem a
  eventos de partida e devem ser limpos no restart.
- Escutar pausa para pausar/resumir SFX longos: efeitos devem ser curtos; limpar no
  reset e respeitar volume cobre o escopo.
- Deixar sons terminarem naturalmente no reset: rejeitado por FR-011.

## D8 - Observabilidade de falhas

**Decision**: Falha real de carregamento de SFX registra `console.error` com chave,
url e fallback pretendido. Ausencia de audio por autoplay locked nao registra erro;
o play fica naturalmente bloqueado ate o Sound Manager destravar.

**Rationale**: A constitution proibe erro silencioso, mas a feature 008 ja separa
autoplay travado (espera normal) de falha real de asset. O mesmo criterio evita falso
positivo no console.

**Alternatives considered**:

- Silenciar falha de SFX porque gameplay continua: rejeitado por observabilidade.
- Mostrar erro na UI: rejeitado porque audio ausente nao impede jogar e a spec pede
  falha observavel para depuracao, nao interrupcao do jogador.
