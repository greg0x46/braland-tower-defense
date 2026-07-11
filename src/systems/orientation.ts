import { ORIENTATION } from '../core/constants';

/**
 * Regra pura de orientação do sprite do inimigo — sem dependência de Phaser,
 * testável sem renderização (Constitution IX/IV, precedente `geometry.ts`).
 *
 * Mapeia o vetor de deslocamento do frame (dx,dy) em coordenadas de tela
 * (y cresce p/ baixo) para `{ flipX, tilt }`, aplicando deadzone (flip) e
 * histerese (tilt) para não oscilar em fronteiras/segmentos verticais. É
 * determinística: a saída é função apenas do estado anterior e do vetor.
 *
 * A conversão `tilt → graus` e o ajuste de sinal por `flipX` são apresentação
 * (aplicada no `Enemy`); aqui fixamos apenas a semântica `up = subindo`.
 */

export type TiltState = 'up' | 'flat' | 'down';

export interface OrientationState {
  /** true = olhando p/ direita (a arte-base olha p/ esquerda). */
  flipX: boolean;
  /** Estado discreto de inclinação. */
  tilt: TiltState;
}

/**
 * Resolve a orientação a partir do estado anterior e do vetor de deslocamento.
 * Vetor nulo (parado) ⇒ retorna `prev` inalterado.
 */
export function resolveOrientation(
  prev: OrientationState,
  dx: number,
  dy: number,
): OrientationState {
  const len = Math.hypot(dx, dy);
  if (len === 0) return prev;

  const nx = dx / len;
  const ny = dy / len;

  const { tiltEnterSin, tiltExitSin, flipDeadzone } = ORIENTATION;

  // Flip com deadzone: dentro da zona neutra preserva o sentido anterior.
  let flipX = prev.flipX;
  if (nx > flipDeadzone) flipX = true;
  else if (nx < -flipDeadzone) flipX = false;

  // Tilt com histerese (limiar de saída < de entrada, evita flicker):
  // ny < 0 sobe (nariz p/ cima), ny > 0 desce.
  let tilt: TiltState;
  if (ny <= -tiltEnterSin) {
    tilt = 'up';
  } else if (ny >= tiltEnterSin) {
    tilt = 'down';
  } else if (prev.tilt === 'up' && ny < -tiltExitSin) {
    tilt = 'up'; // ainda não cruzou o limiar de saída
  } else if (prev.tilt === 'down' && ny > tiltExitSin) {
    tilt = 'down';
  } else {
    tilt = 'flat';
  }

  return { flipX, tilt };
}

/** Graus de rotação semântica por estado (nariz p/ cima ao subir). */
export function tiltToDegrees(tilt: TiltState): number {
  switch (tilt) {
    case 'up':
      return -ORIENTATION.tiltDeg;
    case 'down':
      return ORIENTATION.tiltDeg;
    case 'flat':
      return 0;
  }
}
