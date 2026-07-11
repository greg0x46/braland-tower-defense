# Contract — Módulo puro de orientação (`src/systems/orientation.ts`)

Interface interna (não é API externa). Contrato testável sem Phaser (Vitest),
consumido por `Enemy`. Determinístico: saída é função apenas do estado anterior
e do vetor de deslocamento.

## Tipos

```ts
export type TiltState = 'up' | 'flat' | 'down';

export interface OrientationState {
  flipX: boolean;   // true = olhando p/ direita (arte olha p/ esquerda)
  tilt: TiltState;  // estado discreto de inclinação
}
```

## Função

```ts
/**
 * Resolve a orientação a partir do estado anterior e do vetor de deslocamento
 * do frame (dx,dy) em coordenadas de tela (y cresce p/ baixo). Aplica deadzone
 * (flip) e histerese (tilt) para não oscilar em fronteiras/segmentos verticais.
 * Vetor nulo ⇒ retorna o estado anterior inalterado.
 */
export function resolveOrientation(
  prev: OrientationState,
  dx: number,
  dy: number,
): OrientationState;
```

## Comportamento (tabela de aceite)

`nx, ny` = componentes de `(dx,dy)` normalizado. Limiares: `flipDeadzone`,
`tiltEnterSin`, `tiltExitSin` (ver data-model). `prev` = estado anterior.

| # | Entrada | Regra | Saída esperada |
|---|---------|-------|----------------|
| C1 | dx>0 forte, dy≈0 | move p/ direita | `flipX = true` |
| C2 | dx<0 forte, dy≈0 | move p/ esquerda | `flipX = false` |
| C3 | dx≈0 (vertical), `prev.flipX=false` | dentro da deadzone | `flipX = false` (preserva) |
| C4 | dx≈0 (vertical), `prev.flipX=true` | dentro da deadzone | `flipX = true` (preserva) |
| C5 | dy<0 forte (sobe) | `ny < -tiltEnterSin` | `tilt = 'up'` |
| C6 | dy>0 forte (desce) | `ny > +tiltEnterSin` | `tilt = 'down'` |
| C7 | movimento horizontal puro | `|ny| ≤ tiltEnterSin` | `tilt = 'flat'` |
| C8 | `prev.tilt='up'`, ny logo abaixo do limiar de entrada mas acima do de saída | histerese | `tilt = 'up'` (não volta a flat) |
| C9 | dx=0 e dy=0 (parado) | vetor nulo | retorna `prev` inalterado |
| C10 | subindo-e-p/-direita vs subindo-e-p/-esquerda | independência flip×tilt | `tilt='up'` em ambos (não inverte com o flip) — FR-009a |

## Invariante central (critério de aceite da feature)

**Nunca andar de ré**: para todo `(dx,dy)` com `|dx| > flipDeadzone`, o `flipX`
retornado corresponde ao sinal de `dx` (direita ⇒ `true`, esquerda ⇒ `false`).
Ou seja, o sprite nunca aponta para o lado horizontal oposto ao deslocamento
(FR-007 / SC-002).

## Fora do contrato

- Conversão `tilt → graus` e o ajuste de sinal por `flipX` são **aplicação** no
  `Enemy` (apresentação Phaser), não parte da função pura — mas a semântica
  "up = subindo" é fixada aqui (C5/C10).
- A função não conhece Phaser, o caminho (`PATH`) nem o `EnemyType`.
