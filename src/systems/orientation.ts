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
 * A conversão para `Sprite.flipX`/rotação é apresentação; aqui fixamos a
 * semântica `flipX=true` como "olhando para direita" e `up = subindo`.
 */

export type TiltState = 'up' | 'flat' | 'down';

export interface OrientationState {
  /** true = olhando p/ direita. */
  flipX: boolean;
  /** Estado discreto de inclinação. */
  tilt: TiltState;
}

export interface HeadingPoint {
  x: number;
  y: number;
}

export interface HeadingVector {
  dx: number;
  dy: number;
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

/**
 * Calcula o vetor visual do inimigo para o próximo waypoint ativo. Diferente do
 * deslocamento líquido do frame, isso continua correto quando um step cruza uma
 * curva e já entra no segmento seguinte.
 */
export function headingVectorToNextWaypoint(
  path: readonly HeadingPoint[],
  segmentIndex: number,
  x: number,
  y: number,
): HeadingVector {
  for (let i = segmentIndex + 1; i < path.length; i++) {
    const dx = path[i].x - x;
    const dy = path[i].y - y;
    if (dx !== 0 || dy !== 0) return { dx, dy };
  }

  return { dx: 0, dy: 0 };
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

/**
 * A sheet atual da moto já olha para a direita; logo o flip visual do Phaser só
 * deve ser ligado quando o estado semântico olha para a esquerda.
 */
export function spriteFlipXForOrientation(state: OrientationState): boolean {
  return !state.flipX;
}

/**
 * Rotação visual em graus para a sheet atual. Ao espelhar para a esquerda, o
 * sinal da rotação também precisa inverter para manter "up = subindo".
 */
export function rotationDegreesForOrientation(state: OrientationState): number {
  const degrees = tiltToDegrees(state.tilt);
  return state.flipX ? degrees : -degrees;
}
