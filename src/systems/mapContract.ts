import type { Bounds, MapContract } from '../data/maps';

/**
 * Validação do contrato de mapa — regra pura (Constitution IX).
 *
 * Existe para tornar *detectável* a divergência que hoje só apareceria em jogo:
 * um caminho que sai do campo, uma estrada de largura zero (que não bloqueia
 * construção) ou uma área de construção maior que o mapa.
 */

export interface MapContractError {
  field: string;
  message: string;
}

function contains(outer: Bounds, inner: Bounds): boolean {
  return (
    inner.minX >= outer.minX &&
    inner.maxX <= outer.maxX &&
    inner.minY >= outer.minY &&
    inner.maxY <= outer.maxY
  );
}

function isInside(bounds: Bounds, point: { x: number; y: number }): boolean {
  return (
    point.x >= bounds.minX &&
    point.x <= bounds.maxX &&
    point.y >= bounds.minY &&
    point.y <= bounds.maxY
  );
}

/** Ponto encostado na borda — entrada e saída do caminho podem (e devem) estar. */
function isOnBoundary(bounds: Bounds, point: { x: number; y: number }): boolean {
  return (
    point.x === bounds.minX ||
    point.x === bounds.maxX ||
    point.y === bounds.minY ||
    point.y === bounds.maxY
  );
}

export function validateMapContract(map: MapContract): MapContractError[] {
  const errors: MapContractError[] = [];

  if (map.id.trim() === '') {
    errors.push({ field: 'id', message: 'o mapa precisa de um id estavel' });
  }

  if (map.roadWidth <= 0) {
    errors.push({
      field: 'roadWidth',
      message: `roadWidth deve ser positivo (recebido: ${map.roadWidth}) — ` +
        'largura zero nao bloqueia construcao nem aparece no debug',
    });
  }

  if (!contains(map.playableBounds, map.buildBounds)) {
    errors.push({
      field: 'buildBounds',
      message: 'a area de construcao precisa caber dentro dos limites jogaveis',
    });
  }

  if (map.path.length < 2) {
    errors.push({
      field: 'path',
      message: `o caminho precisa de ao menos 2 waypoints (recebido: ${map.path.length})`,
    });
    return errors;
  }

  // Entrada e saida podem tocar a borda (é por onde o inimigo entra e vaza);
  // os pontos internos, não — um ponto interno fora do campo teleporta o inimigo
  // para fora da tela.
  map.path.forEach((point, index) => {
    const isEndpoint = index === 0 || index === map.path.length - 1;

    if (isInside(map.playableBounds, point)) return;

    if (isEndpoint && isOnBoundary(map.playableBounds, point)) return;

    errors.push({
      field: `path[${index}]`,
      message: isEndpoint
        ? `a ponta (${point.x}, ${point.y}) esta fora dos limites jogaveis`
        : `o ponto interno (${point.x}, ${point.y}) esta fora dos limites jogaveis`,
    });
  });

  return errors;
}

/** Mensagem única para log/erro de boot. */
export function describeMapContractErrors(
  map: MapContract,
  errors: readonly MapContractError[],
): string {
  return [
    `Contrato do mapa "${map.id}" invalido:`,
    ...errors.map((error) => `  - ${error.field}: ${error.message}`),
  ].join('\n');
}
