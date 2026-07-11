# Data Model — Sprite da torre Vira-lata Caramelo

Fase 1. Entidades e alterações de dados. O modelo é deliberadamente mínimo:
uma extensão opcional na configuração de torre + um registro de textura.

## Entidade: Chave de textura (Asset registry)

Identificador estável que a gameplay usa para referenciar o recurso visual,
desacoplado do caminho do arquivo (Constitution V / FR-005).

- **Local**: `src/core/constants.ts`, dentro do objeto `TEXTURES` já existente.
- **Novo campo**: `towerCaramelo: 'tower-vira-lata-caramelo'`
- **Regras**:
  - O valor é uma string estável; não muda ao trocar a arte.
  - Nenhuma dimensão ou caminho é embutido aqui.

```ts
export const TEXTURES = {
  circle: 'tex-circle',
  projectile: 'tex-projectile',
  towerCaramelo: 'tower-vira-lata-caramelo', // NOVO
} as const;
```

## Entidade: Arquivo de asset

O recurso físico e seu mapeamento único para uma URL empacotada.

- **Local do arquivo**: `src/assets/towers/vira-lata-caramelo.png`
  (movido/renomeado da raiz — FR-004, SC-004).
- **Mapeamento**: `import caramelUrl from '../assets/towers/vira-lata-caramelo.png'`
  em `BootScene` (único ponto que conhece o caminho).
- **Vínculo chave↔arquivo**: `this.load.image(TEXTURES.towerCaramelo, caramelUrl)`.
- **Regras**:
  - O caminho literal aparece **apenas** neste import.
  - A imagem não reside mais na raiz do repositório após a mudança.

## Entidade: TowerType (alteração)

Configuração data-driven do tipo de torre (`src/data/towers.ts`). Ganha uma
referência **opcional** ao sprite; toda a apresentação é desacoplada das métricas.

- **Novo campo**: `spriteKey?: string`
  - Opcional: torres sem `spriteKey` continuam com o placeholder (círculo + emoji).
  - Preenchido na `vira-lata-caramelo` com `TEXTURES.towerCaramelo`.
- **Campos existentes inalterados**: `id, name, emoji, color, cost, range,
  damage, fireRate, projectileSpeed, radius`. **Nenhum** valor de gameplay muda.

| Campo | Tipo | Papel | Muda nesta feature? |
|---|---|---|---|
| `spriteKey?` | `string` | Chave de textura da apresentação | **Novo (opcional)** |
| `emoji` | `string` | Fallback visual quando sem sprite | Mantido |
| `color` | `number` | Fallback do corpo/anel | Mantido |
| `radius` | `number` | Colisão/hitbox e base da escala visual | Mantido |
| `range` | `number` | Alcance (anel + alvo) | Mantido |
| `cost/damage/fireRate/projectileSpeed` | `number` | Regras de combate/economia | Mantido |

```ts
export interface TowerType {
  id: string;
  name: string;
  emoji: string;
  color: number;
  cost: number;
  range: number;
  damage: number;
  fireRate: number;
  projectileSpeed: number;
  radius: number;
  /** Chave de textura da apresentação. Ausente ⇒ usa fallback (círculo+emoji). */
  spriteKey?: string; // NOVO
}
```

## Constante de apresentação (não é dado de gameplay)

Fator de escala visual do sprite relativo ao `radius`. Vive na camada de
apresentação, separado das métricas (Constitution XI / XIII).

- **Local sugerido**: `src/entities/Tower.ts` (constante de módulo) ou
  `constants.ts` se reutilizado pelo card/preview.
- **Ex.**: `TOWER_SPRITE_SCALE = 3.0` → largura de exibição ≈ `radius * 3` (~60px),
  altura proporcional ao aspecto 832/1280. Ajustável sem tocar em regra.

## Relacionamentos e invariantes

```
TowerType.spriteKey ──refere──▶ TEXTURES.towerCaramelo ──carrega──▶ arquivo .png
        │                                   │
        └── se textura ausente ────────────▶ fallback (emoji + color)
```

- **INV-1**: Colisão/interatividade da torre = `Circle(0,0,radius)`,
  independente de existir ou não sprite (FR-002, FR-003).
- **INV-2**: `range` e o anel de alcance independem das dimensões do sprite.
- **INV-3**: Depth da torre = `DEPTH.tower`, aplicado externamente; sprite não
  altera camada (FR-008).
- **INV-4**: Ausência da textura ⇒ fallback funcional + log (FR-007), nunca crash.

## Transições de estado (carregamento do asset)

```
[boot] preload dispara load.image(key, url)
   ├── sucesso → textures.exists(key) = true → torre/card renderizam Image
   └── erro    → FILE_LOAD_ERROR logado → textures.exists(key) = false
                 → torre/card renderizam fallback (círculo/emoji)
```
