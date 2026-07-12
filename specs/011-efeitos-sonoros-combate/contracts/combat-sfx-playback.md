# Contrato: Reproducao de SFX de Combate

**Feature**: `011-efeitos-sonoros-combate` | **Dono**: `src/managers/CombatSfxManager.ts`

O `CombatSfxManager` e o unico modulo que fala com o Sound Manager do Phaser para
efeitos de combate. Ele consome eventos tipados, resolve o efeito em dados e toca ou
suprime o som de acordo com volume e throttling.

## P1 - Resolucao data-driven

**Regra**: todo som toca a partir de uma entrada do catalogo `COMBAT_SFX`, nunca de
caminho hardcoded no gameplay.

**Garantias**:

- Tipo de torre/inimigo pode declarar efeito especifico.
- Se o tipo nao declarar efeito, usa padrao da categoria.
- Se o efeito especifico falhar/nao existir, tenta `fallbackId`.
- Se nenhum fallback existir, registra falha e segue em silencio.

**Proibido**: `Tower`, `Enemy`, `Projectile` ou `GameScene` conhecerem caminho de
arquivo de audio.

## P2 - Volume efetivo

**Regra**: volume final = `AudioSettings.effectiveVolume * effect.defaultVolume`.

**Garantias**:

- Mudo deixa novos efeitos inaudiveis imediatamente.
- Alterar volume afeta novos efeitos sem reiniciar cena.
- Ao receber `effectiveVolume = 0`, efeitos ativos param ou ficam inaudiveis
  imediatamente.
- O manager nao recalcula a regra `muted ? 0 : volume`; ele so consome o payload.

## P3 - Throttling e prioridade

**Regra**: antes de tocar, o manager chama a regra pura de elegibilidade de SFX.

**Garantias**:

- Mesmo efeito respeita `cooldownMs`.
- Mesmo efeito respeita `maxConcurrent`.
- Eventos de baixa prioridade podem ser suprimidos em ondas intensas.
- `enemy-leaked` tem prioridade suficiente para nao sumir atras de impactos comuns.
- Eventos suprimidos nao afetam gameplay nem emitem erro.

**Proibido**: tocar todos os impactos simultaneos sem limite.

## P4 - Falhas observaveis e nao fatais

**Regra**: falha real de asset registra erro com chave do efeito e fallback tentado;
falha nao impede a partida.

**Garantias**:

- Asset ausente nao quebra boot.
- Uma partida completa continua jogavel sem SFX.
- Autoplay locked nao e registrado como erro.
- Erros de asset nao sao registrados mais de uma vez por chave em rajadas repetidas.

## P5 - Ciclo de vida da partida

**Regra**: SFX de combate pertence ao ciclo de vida da `GameScene`, nao ao ciclo
global da `BootScene`.

**Garantias**:

- Reiniciar partida para sons ativos e limpa throttles.
- Shutdown remove listeners.
- Pausa nao gera novos sons porque gameplay nao avanca.
- O manager nao pausa nem reinicia a trilha sonora; isso continua sendo
  responsabilidade de `MusicManager`.

## P6 - Sem efeito colateral de gameplay

**Regra**: `CombatSfxManager` nao importa nem altera `GameState`, `Tower`, `Enemy`,
`Projectile`, `WaveManager` ou `BuildManager`.

**Garantias**:

- Dano, recompensa, vida, cooldown, mira e spawn sao identicos com ou sem SFX.
- Testes de gameplay existentes continuam validos sem inicializar Phaser audio.
- Remover todos os assets de SFX degrada apenas a apresentacao.
