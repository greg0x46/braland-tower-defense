import { describe, it, expect } from 'vitest';
import { resolveOrientation } from './orientation';
import type { OrientationState } from './orientation';
import { ORIENTATION } from '../core/constants';

const { tiltEnterSin, tiltExitSin, flipDeadzone } = ORIENTATION;

const RIGHT: OrientationState = { flipX: true, tilt: 'flat' };
const LEFT: OrientationState = { flipX: false, tilt: 'flat' };

describe('resolveOrientation — flip horizontal (nunca de ré)', () => {
  it('C1: dx>0 forte, dy≈0 ⇒ flipX = true (olha p/ direita)', () => {
    expect(resolveOrientation(LEFT, 10, 0).flipX).toBe(true);
  });

  it('C2: dx<0 forte, dy≈0 ⇒ flipX = false (olha p/ esquerda)', () => {
    expect(resolveOrientation(RIGHT, -10, 0).flipX).toBe(false);
  });

  it('C3: segmento vertical dentro da deadzone preserva flipX=false', () => {
    // dx≈0: nx bem abaixo de flipDeadzone ⇒ mantém o sentido anterior.
    expect(resolveOrientation(LEFT, 0, 10).flipX).toBe(false);
    expect(resolveOrientation(LEFT, 0, -10).flipX).toBe(false);
  });

  it('C4: segmento vertical dentro da deadzone preserva flipX=true', () => {
    expect(resolveOrientation(RIGHT, 0, 10).flipX).toBe(true);
    expect(resolveOrientation(RIGHT, 0, -10).flipX).toBe(true);
  });
});

describe('resolveOrientation — tilt discreto (3 estados)', () => {
  it('C5: dy<0 forte (sobe) ⇒ tilt = up', () => {
    expect(resolveOrientation(RIGHT, 1, -10).tilt).toBe('up');
  });

  it('C6: dy>0 forte (desce) ⇒ tilt = down', () => {
    expect(resolveOrientation(RIGHT, 1, 10).tilt).toBe('down');
  });

  it('C7: movimento horizontal puro ⇒ tilt = flat', () => {
    expect(resolveOrientation(RIGHT, 10, 0).tilt).toBe('flat');
  });

  it('C8: histerese — logo abaixo do limiar de entrada mas acima do de saída mantém up', () => {
    // ny entre -tiltEnterSin e -tiltExitSin: com prev=up, não volta a flat.
    const nyMid = -(tiltEnterSin + tiltExitSin) / 2; // dentro da banda de histerese
    const dy = nyMid;
    const dx = Math.sqrt(1 - nyMid * nyMid); // vetor unitário p/ direita+subindo
    const prevUp: OrientationState = { flipX: true, tilt: 'up' };
    expect(resolveOrientation(prevUp, dx, dy).tilt).toBe('up');
    // Já a partir de flat, a mesma entrada permanece flat (não entrou ainda).
    expect(resolveOrientation(RIGHT, dx, dy).tilt).toBe('flat');
  });

  it('histerese — abaixo do limiar de saída volta a flat', () => {
    const ny = -(tiltExitSin * 0.5); // acima (menos íngreme) do limiar de saída
    const dx = Math.sqrt(1 - ny * ny);
    const prevUp: OrientationState = { flipX: true, tilt: 'up' };
    expect(resolveOrientation(prevUp, dx, ny).tilt).toBe('flat');
  });
});

describe('resolveOrientation — casos de borda', () => {
  it('C9: vetor nulo (parado) retorna prev inalterado', () => {
    const prev: OrientationState = { flipX: false, tilt: 'down' };
    expect(resolveOrientation(prev, 0, 0)).toEqual(prev);
  });

  it('C10: independência flip×tilt — subindo p/ ambos os lados dá tilt=up (FR-009a)', () => {
    const up = -20;
    const rightUp = resolveOrientation(RIGHT, 10, up);
    const leftUp = resolveOrientation(LEFT, -10, up);
    expect(rightUp.tilt).toBe('up');
    expect(leftUp.tilt).toBe('up');
    // e o flip acompanha o sentido horizontal, sem inverter o tilt.
    expect(rightUp.flipX).toBe(true);
    expect(leftUp.flipX).toBe(false);
  });
});

describe('invariante central — nunca andar de ré', () => {
  it('para todo vetor com |nx| > flipDeadzone, flipX segue o sinal de dx', () => {
    for (let deg = 0; deg < 360; deg += 3) {
      const rad = (deg * Math.PI) / 180;
      const dx = Math.cos(rad);
      const dy = Math.sin(rad);
      // nx = dx (vetor já unitário). Só afirmamos fora da deadzone.
      if (Math.abs(dx) <= flipDeadzone) continue;
      const out = resolveOrientation({ flipX: dx < 0, tilt: 'flat' }, dx, dy);
      expect(out.flipX).toBe(dx > 0);
    }
  });
});
