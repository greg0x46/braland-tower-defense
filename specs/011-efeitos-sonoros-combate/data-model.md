# Data Model: Efeitos Sonoros de Combate

## Efeito Sonoro de Combate

Representa um som curto associado a um evento de combate.

**Campos**:

- `id: CombatSfxId` - identificador estavel de dominio, usado em perfis/fallback.
- `cacheKey: string` - chave no cache de audio do Phaser.
- `category: CombatSfxCategory` - `tower-attack`, `enemy-damaged`, `enemy-killed` ou
  `enemy-leaked`.
- `defaultVolume: number` - volume relativo em `[0,1]`, multiplicado por
  `AudioSettings.effectiveVolume`.
- `cooldownMs: number` - janela minima antes do mesmo efeito tocar novamente.
- `maxConcurrent: number` - limite de instancias ativas do mesmo efeito.
- `priority: number` - prioridade para desempate quando eventos competem na mesma
  janela; vazamento deve ter prioridade maior que impacto repetitivo.
- `fallbackId?: CombatSfxId` - efeito alternativo quando o efeito especifico nao
  existir/carregar.

**Validacao**:

- `id` e `cacheKey` nao podem ser vazios.
- `defaultVolume` deve estar em `[0,1]`.
- `cooldownMs` deve ser `>= 0`.
- `maxConcurrent` deve ser inteiro positivo.
- `fallbackId`, quando presente, deve apontar para um efeito existente e nao criar
  ciclo de fallback.
- O catalogo deve conter pelo menos um efeito padrao para cada categoria.

## Evento de Combate Audivel

Contrato de evento produzido por gameplay e consumido por `CombatSfxManager`.

**Campos**:

- `eventId: string` - identificador unico ou monotonicamente gerado para deduplicar
  eventos dentro de um frame/ciclo.
- `category: CombatSfxCategory` - categoria audivel do acontecimento.
- `towerTypeId?: string` - presente para ataque de torre.
- `enemyTypeId?: string` - presente para dano, derrota ou vazamento.
- `effectId?: CombatSfxId` - override especifico quando o produtor ja conhece o
  efeito; normalmente ausente e resolvido por perfil.
- `x?: number`, `y?: number` - posicao opcional para pan/volume futuro; nao usada por
  regra de gameplay.
- `occurredAtMs: number` - tempo usado pela regra pura de throttling.

**Validacao**:

- `tower-attack` exige `towerTypeId`.
- `enemy-damaged`, `enemy-killed` e `enemy-leaked` exigem `enemyTypeId`.
- Eventos nunca carregam dano, recompensa ou vida como fonte de verdade de audio.
- `occurredAtMs` deve vir de relogio controlado pela cena/manager, nao de `Date.now()`
  espalhado em entidades.

## Perfil Sonoro de Torre

Associa uma torre aos efeitos que ela pode usar.

**Campos**:

- `attack?: CombatSfxId` - som especifico de ataque.
- `impact?: CombatSfxId` - som especifico de impacto quando aplicavel.

**Relacionamentos**:

- Pertence a `TowerType`.
- Resolve para `COMBAT_SFX.defaults.towerAttack` quando ausente.

**Validacao**:

- IDs devem existir no catalogo.
- Perfil nao altera `damage`, `range`, `fireRate`, `attack.kind` ou
  `visualCuePolicy`.

## Perfil Sonoro de Inimigo

Associa um inimigo aos efeitos que ele pode usar.

**Campos**:

- `damaged?: CombatSfxId` - impacto/dano recebido.
- `killed?: CombatSfxId` - derrota.
- `leaked?: CombatSfxId` - vazamento/alerta.

**Relacionamentos**:

- Pertence a `EnemyType`.
- Resolve para padroes por categoria quando ausente.

**Validacao**:

- IDs devem existir no catalogo.
- Perfil nao altera `maxHp`, `speed`, `reward`, `radius` ou status do inimigo.

## Preferencia de Audio do Jogador

Entidade existente controlada por `AudioSettings`.

**Campos existentes relevantes**:

- `muted: boolean`
- `volume: number`
- `effectiveVolume: number` derivado (`muted ? 0 : volume`)

**Relacionamentos**:

- `CombatSfxManager` consome `AUDIO_SETTINGS_CHANGED` e aplica somente
  `effectiveVolume`.
- Nenhum efeito de combate persiste preferencia propria nesta feature.

## Estado de Throttling de SFX

Estado interno e testavel que evita repeticao excessiva.

**Campos**:

- `lastPlayedAtByEffect: Record<CombatSfxId, number>`
- `activeCountByEffect: Record<CombatSfxId, number>`
- `lastPlayedAtByCategory: Partial<Record<CombatSfxCategory, number>>`

**Transicoes**:

- `eligible` -> `played`: quando cooldown e concorrencia permitem tocar.
- `eligible` -> `suppressed`: quando limite/cooldown bloqueia evento de baixa
  prioridade.
- `played` -> `released`: quando o som termina ou e parado.
- qualquer estado -> `cleared`: em `MATCH_RESET` ou shutdown da cena.

**Validacao**:

- Vazamento pode ultrapassar janela de impacto, mas ainda respeita limite proprio.
- Reset limpa todos os mapas de estado.
- A regra pura deve ser deterministica para a mesma sequencia de eventos e tempos.
