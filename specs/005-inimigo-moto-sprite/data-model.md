# Phase 1 — Data Model

Feature de apresentação: não há persistência nem entidades de domínio novas. Os
"modelos" abaixo são estruturas em memória (estado de orientação) e a extensão
data-driven já existente do inimigo. Nada aqui altera regra de gameplay.

## Entidade: OrientationState (novo, em memória)

Estado de orientação derivado do movimento, consumido/atualizado a cada frame.
Vive junto do `Enemy` (uma instância por inimigo) e é a saída da função pura.

| Campo | Tipo | Descrição | Regras |
|-------|------|-----------|--------|
| `flipX` | `boolean` | Espelhamento horizontal do sprite | `true` = olhando p/ direita (arte olha p/ esquerda). Muda só fora da deadzone; senão preserva o valor anterior (FR-006/FR-008). |
| `tilt` | `'up' \| 'flat' \| 'down'` | Estado discreto de inclinação | Derivado da componente vertical normalizada com histerese (FR-009). `up` ao subir, `down` ao descer, `flat` no meio. |

Derivados de apresentação (calculados a partir de `tilt`):

- `tiltDeg`: `up → -15`, `flat → 0`, `down → +15` (nariz p/ cima ao subir).
- Sinal aplicado ao Sprite pode considerar `flipX` para manter a semântica
  "nariz p/ cima ao subir" nos dois sentidos (ver contrato/research D3).

**Transições de estado** (histerese — depende do estado anterior):

- `flipX`: `→ true` quando `nx > +flipDeadzone`; `→ false` quando
  `nx < -flipDeadzone`; caso contrário **inalterado**.
- `tilt`: `flat → up` quando `ny < -tiltEnterSin`; `flat → down` quando
  `ny > +tiltEnterSin`; `up/down → flat` só quando `|ny| < tiltExitSin`
  (`tiltExitSin < tiltEnterSin`, evita flicker na fronteira).

Onde `nx, ny` são componentes do vetor de deslocamento **normalizado** do frame
(tela: `y` cresce p/ baixo). Vetor nulo (parado) ⇒ estado **inalterado**.

## Entidade: EnemyType (existente — sem mudança de esquema)

Já é data-driven em `src/data/enemies.ts`. Campos relevantes à feature:

| Campo | Tipo | Papel na feature |
|-------|------|------------------|
| `radius` | `number` | Base do dimensionamento visual (largura ≈ 2,6×) e da colisão — **não** muda. |
| `spriteKey?` | `string` | Chave estável da textura; presente ⇒ sprite animado, ausente ⇒ fallback (FR-010/FR-011). |
| `emoji`, `color` | `string`/`number` | Fallback (círculo + emoji). |
| `maxHp`, `speed`, `reward` | `number` | Gameplay — **intocados** (FR-002). |

Adicionar um novo inimigo com sheet = nova entrada aqui + chaves em `TEXTURES`/
`ANIMS` + registro em `BootScene` — **sem** código novo por inimigo (FR-014).

## Constantes de orientação (apresentação — novo)

Centralizadas (research D7). Não pertencem a `src/data/` (gameplay).

| Constante | Tipo | Valor inicial | Papel |
|-----------|------|---------------|-------|
| `tiltDeg` | `number` | `15` | Magnitude da inclinação discreta |
| `tiltEnterSin` | `number` | `Math.sin(Phaser.Math.DegToRad(20))` | Limiar p/ entrar em inclinado |
| `tiltExitSin` | `number` | `Math.sin(Phaser.Math.DegToRad(17))` | Limiar p/ voltar a plano (histerese) |
| `flipDeadzone` | `number` | `0.15` | Zona neutra horizontal do flip |

## Presentation binding (Enemy ↔ Sprite)

Não é dado persistido, mas o contrato de aplicação:

- `Enemy` guarda o `OrientationState` atual (inicial: `flipX = true`, `tilt =
  'flat'`, coerente com entrada indo p/ a direita).
- A cada `step()` com movimento: `next = resolveOrientation(prev, dx, dy)`; se
  `next.flipX !== prev.flipX` ⇒ `sprite.setFlipX(next.flipX)`; se
  `next.tilt !== prev.tilt` ⇒ `sprite.setRotation(...)`. Sem set redundante.
- Barra de vida permanece **fora** da rotação (mesmo container, sem tilt),
  acima do sprite (FR-003).
