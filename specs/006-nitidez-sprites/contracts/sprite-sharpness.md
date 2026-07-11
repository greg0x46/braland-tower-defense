# Contract - Sprite sheet sharpness and rendering

Contrato interno de apresentacao para sprites animados de inimigos. Nao e API
externa. Deve ser testavel em partes sem Phaser e validavel visualmente no jogo.

## 1. Sheet contract

Para cada inimigo com sheet:

```ts
interface SpriteSheetSpec {
  rawTextureKey: string;
  textureKey: string;
  columns: number;
  rows: number;
  animations: SpriteAnimationSpec[];
  visualScale: VisualScaleSpec;
}

interface SpriteAnimationSpec {
  key: string;
  start: number;
  end: number;
  frameRate: number;
  repeat: number;
}
```

Required behavior:

- Load deve derivar `frameWidth` e `frameHeight` de `imageWidth / columns` e
  `imageHeight / rows`, ou validar esses valores antes de chamar
  `load.spritesheet`.
- Se `imageWidth % columns !== 0` ou `imageHeight % rows !== 0`, a falha deve
  ser registrada. O jogo nao pode quebrar nem falhar silenciosamente.
- O contrato da moto e `columns = 8`, `rows = 2`, `ride = 0..7`,
  `shoot = 8..15`.
- O asset cru deve ser carregado por `rawTextureKey`; a chave publica
  `textureKey` so existe apos validacao e materializacao do sprite sheet.
- Novos inimigos com sheet devem adicionar uma nova entrada tipada no modulo de
  contrato de sheets e reaproveitar a mesma validacao de dimensoes/animacoes.
- Cada frame renderizado deve conter apenas seu proprio conteudo; zero faixa de
  frame vizinho e zero corte de borda.

## 2. Visual sizing contract

Required behavior for `Enemy` sprite presentation:

- O sprite e dimensionado usando `frameWidth/frameHeight`, nao a imagem inteira
  da sheet.
- A proporcao do frame e preservada.
- A largura visual continua derivada de `EnemyType.radius` para manter o tamanho
  percebido atual, mas `radius` segue sendo colisao/gameplay.
- Barra de vida continua acima do inimigo e nao muda regras de dano/morte.

Forbidden:

- Ler dimensao do sprite para alterar HP, velocidade, recompensa, raio de
  colisao, targeting ou path.
- Compensar asset ruim mudando stats de `src/data/enemies.ts`.

## 3. Movement sharpness contract

Required behavior:

- Posicao logica do inimigo pode continuar fracionaria para movimento fluido.
- Desenho visual de sprites texturizados deve ser alinhado ao pixel quando isso
  reduzir borrao de sub-pixel.
- Snap visual nao pode alterar `distanceTravelled`, segment index, status,
  targeting ou projeteis.
- Movimento deve permanecer fluido, sem "pulos" perceptiveis.

Acceptance checks:

- Moto em movimento nao apresenta halo/borrao perceptivel nas bordas.
- Captura com zoom mostra bordas consistentes parada e em movimento.

## 4. HiDPI contract

Required behavior:

- Canvas/render deve considerar `devicePixelRatio` ate um limite configurado.
- `Phaser.Scale.FIT` e `CENTER_BOTH` continuam preservando enquadramento e
  centralizacao.
- `pixelArt`/nearest-neighbor permanece desabilitado para manter arte ilustrada.
- Redimensionar a janela nao corta o campo de jogo.

Acceptance checks:

- Em tela HiDPI/Retina, nao ha borrao extra de upscale da imagem final.
- Em DPR muito alto ou janela grande, a partida segue fluida com uma onda
  avancada.

## 5. Fallback contract

Required behavior:

- Asset ausente ou falha de carregamento: usar circulo + emoji, manter partida
  jogavel e registrar erro.
- Asset com dimensao invalida: registrar inconsistencia. Durante a transicao, o
  fallback ou caminho legado deve ser explicito; nunca silencioso.
- O fallback nao precisa ter sprite sharpness, mas nao pode impedir jogar.

## 6. Regression invariants

These values/behaviors must not change as part of this feature:

- `ENEMY_TYPES['dois-caras-moto'].maxHp`
- `ENEMY_TYPES['dois-caras-moto'].speed`
- `ENEMY_TYPES['dois-caras-moto'].reward`
- `ENEMY_TYPES['dois-caras-moto'].radius`
- Dano, morte, recompensa, vazamento e barra de vida
- Chaves publicas existentes de textura/animacao, salvo migracao explicita no
  mesmo contrato
