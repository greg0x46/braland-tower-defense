# Contrato: Progressão e Relógio de Ondas

Interfaces dos módulos puros (sem Phaser) que substituem a lista fixa `WAVES` e o
agendamento por timers. Exercitáveis por Vitest sem instanciar cena (Constituição IX).

## `generateWave` — `src/systems/waves.ts`

```text
generateWave(
  waveIndex: number,               // 0-based
  profile: ProgressionProfile,     // de src/data/waves.ts
  roster: EnemyType[],             // Object.values(ENEMY_TYPES)
): Wave
```

**Contrato de comportamento:**

- **Determinístico**: mesma entrada → mesma `Wave` (SC-004, Constituição VIII). Se usar
  aleatoriedade para variedade, DEVE aceitar seed derivada do `waveIndex`.
- **Monotonicidade (SC-004)**: para `b > a`, `dificuldadeTotal(generateWave(b)) ≥
  dificuldadeTotal(generateWave(a))`, e estritamente crescente ao longo da progressão,
  onde dificuldade agrega quantidade e resistência. Nunca decresce.
- **Ritmo**: o `interval` efetivo não aumenta com o índice e respeita
  `profile.minIntervalSec` (piso anti-transbordo, FR-012).
- **Variedade data-driven (FR-006)**: os tipos usados saem de `roster`; ao existirem
  novos `EnemyType`, ondas avançadas passam a incluí-los conforme `varietyStep`, sem
  alterar esta função. Com roster de 1 tipo, a variedade fica nesse único tipo.
- **Estrutura de saída**: um `Wave` com `groups: SpawnGroup[]` compatível com
  `buildSpawnSchedule` / `totalSpawnCount` (reuso, sem novo pipeline).

**Função auxiliar de teste (recomendada):**

```text
waveDifficulty(wave: Wave, roster): number   // Σ (count × maxHp) por grupo
```
Usada nos testes para verificar monotonicidade sem inspecionar a implementação (SC-004).

## `WaveClock` — `src/systems/waveClock.ts`

Máquina de estados pura do timing de ondas. Não conhece Phaser, spawn real nem HUD.

```text
new WaveClock(config: {
  timing: { initialDelaySec; interWaveSec };
  generate: (waveIndex: number) => Wave;   // injeta generateWave(..., profile, roster)
})

clock.tick(dt: number, aliveEnemyCount: number): WaveTickResult
clock.phase: WaveClockPhase                 // leitura (debug/teste)
```

`WaveTickResult`:

```text
{
  spawns: string[];                 // enemyTypeIds a instanciar neste tick
  waveStarted?: number;             // índice 1-based da onda iniciada agora (→ HUD)
}
```

**Contrato de comportamento:**

- **Auto-início (FR-001)**: começa em `initial-delay`; após `initialDelaySec` acumulado
  em `dt`, entra em `spawning` da onda 1 e retorna `waveStarted: 1`.
- **Agendamento por delta (FR-002, SC-002)**: em `spawning`, acumula `elapsedSec += dt`
  e retorna em `spawns` cada inimigo cujo `atSeconds ≤ elapsedSec` ainda não emitido.
  Sem timers externos.
- **Fim de onda (FR-002)**: quando todos os spawns foram emitidos E
  `aliveEnemyCount === 0`, transita para `interval`.
- **Intervalo entre ondas (FR-003)**: acumula `dt` por `interWaveSec`; ao zerar, inicia
  a próxima onda (`waveStarted: n+1`). Infinito — nunca termina por esgotamento (FR-004).
- **Pausa (FR-008, FR-013)**: a pausa é implementada **não chamando `tick`**. Como todo
  o progresso vive no estado interno, congelar = não avançar; retomar = seguir do mesmo
  ponto. Nenhuma onda pulada/duplicada/reiniciada; `remainingSec` do intervalo é
  preservado (SC-006, SC-007).
- **Determinístico**: a mesma sequência de `(dt, aliveEnemyCount)` gera a mesma
  sequência de resultados.

## Adaptação em `WaveManager` — `src/managers/WaveManager.ts`

O `WaveManager` deixa de agendar `scene.time.delayedCall` e passa a ser um **adaptador
fino** do `WaveClock`:

```text
update(dt: number): void   // chamado por GameScene.update quando NÃO pausado
  const result = this.clock.tick(dt, this.getEnemyCount());
  for (const id of result.spawns) this.spawnEnemy(id);
  if (result.waveStarted !== undefined) GameState.setWave(result.waveStarted, 0);
```

- Remove `REQUEST_START_WAVE`, `startNextWave`, `hasMoreWaves`, `GAME_WON` e o array de
  `timers`. `destroy()` deixa de remover timers do Phaser.
- `GameScene.update` passa a repassar `dt` a `waveManager.update(dt)` (hoje chama sem
  argumento) e a não chamar quando pausado ou encerrado.

## Invariantes de performance (Constituição III, FR-012)

- Nenhuma alocação por frame no caminho comum do `tick` (retornar array vazio
  reutilizável ou pré-alocado quando não há spawn).
- A quantidade de spawns por tick é limitada pelo schedule; sem laço que gere N
  inimigos num único instante.
