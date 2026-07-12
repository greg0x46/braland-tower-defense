# Contrato: Eventos de Audio de Combate

**Feature**: `011-efeitos-sonoros-combate` | **Dono**: `src/core/EventBus.ts`

Este contrato define quando o gameplay pode anunciar um evento audivel. Ele nao
define como o som toca; isso pertence a [combat-sfx-playback.md](./combat-sfx-playback.md).

## C1 - Evento so nasce de acao real

**Regra**: produtores emitem eventos de audio apenas depois que a acao de combate e
confirmada.

**Garantias**:

- Torre sem alvo nao emite `tower-attack`.
- Torre em recarga nao emite `tower-attack`.
- Strike cancelado por alvo invalido nao emite `tower-attack`.
- Projetil que expira sem acertar alvo vivo nao emite `enemy-damaged`.
- Inimigo que ja morreu/vazou nao emite novo dano.

**Proibido**: emitir evento audivel a partir de animacao visual, hover, selecao de
torre ou mero estado "tentando atacar".

## C2 - Payload suficiente e somente leitura

**Regra**: cada evento carrega informacao suficiente para resolver perfil/fallback
sem ler estado global.

```ts
type CombatAudioCategory =
  | 'tower-attack'
  | 'enemy-damaged'
  | 'enemy-killed'
  | 'enemy-leaked';

interface CombatAudioEventPayload {
  eventId: string;
  category: CombatAudioCategory;
  towerTypeId?: string;
  enemyTypeId?: string;
  effectId?: string;
  x?: number;
  y?: number;
  occurredAtMs: number;
}
```

**Garantias**:

- `tower-attack` sempre tem `towerTypeId`.
- Eventos de inimigo sempre tem `enemyTypeId`.
- O payload nao e fonte de verdade de dano, recompensa, vida ou cooldown.
- O consumidor pode resolver som sem importar `GameScene`, `Tower`, `Enemy` ou
  `Projectile`.

## C3 - Eventos existentes continuam valendo

**Regra**: `ENEMY_KILLED` e `ENEMY_LEAKED` continuam sendo os eventos de dominio para
recompensa e dano a base. `CombatSfxManager` pode consumi-los para tocar som, mas nao
altera o payload nem a ordem esperada por `GameState`.

**Garantias**:

- `GameState` continua creditando recompensa em `ENEMY_KILLED`.
- `GameState` continua aplicando dano a base em `ENEMY_LEAKED`.
- Som de derrota/vazamento e efeito colateral de apresentacao; falha no som nao
  bloqueia economia nem vida.

**Proibido**: mover recompensa, dano da base ou derrota para o manager de audio.

## C4 - Ordem de emissao

**Regra**: quando um unico acontecimento gera mais de um feedback, a ordem deve ser
deterministica.

**Ordem esperada**:

1. Ataque confirmado (`tower-attack`).
2. Dano/impacto (`enemy-damaged`) quando dano e aplicado.
3. Derrota (`ENEMY_KILLED`) se o dano zerou HP.
4. Vazamento (`ENEMY_LEAKED`) quando inimigo chega ao fim do caminho.

**Garantias**:

- Um inimigo derrotado pelo impacto nao vaza no mesmo frame.
- Um inimigo vazado nao recebe dano posterior.
- O manager de SFX pode priorizar `enemy-killed` sobre `enemy-damaged` sem depender
  de ordem acidental do array.

## C5 - Ciclo de vida de listeners

**Regra**: consumidores de audio registrados pela `GameScene` sao removidos em
`Scenes.SHUTDOWN`.

**Garantias**:

- Reiniciar a partida nao duplica listeners.
- Eventos de uma partida anterior nao tocam na nova partida.
- `MATCH_RESET` limpa estado interno de throttling antes da proxima onda.
