# Phase 0 - Research: Nitidez dos sprites

Contexto: a spec nao deixou clarificacoes pendentes, mas a implementacao precisa
decidir como corrigir sheet, movimento e HiDPI sem alterar gameplay.

## D1 - Fonte da perda de nitidez/fantasma

- **Decision**: tratar a causa primaria como incompatibilidade entre asset e
  grade de recorte. A sheet atual tem `1774x887`; para uma grade `8x2`, os
  quadros seriam `221.75x443.5`, mas o load atual usa `221x443`. A nova sheet
  deve ter dimensoes divisiveis exatamente pela grade.
- **Rationale**: FR-001/SC-001 exigem 0 quadros com faixa do vizinho ou borda
  cortada. Phaser `spritesheet` recorta por inteiros; se o asset nao fecha na
  grade, o erro aparece como acumulacao/fantasma.
- **Alternatives considered**: manter `221x443` e ajustar offsets manualmente -
  rejeitado por ser fragil e especifico do arquivo; cortar a sheet em imagens
  individuais - rejeitado porque perde o padrao reutilizavel por sheet.

## D2 - Contrato da sheet corrigida

- **Decision**: manter grade uniforme `8 colunas x 2 linhas`, linha 0 = pilotar,
  linha 1 = atirar. A sheet corrigida deve declarar/derivar `frameWidth =
  imageWidth / 8` e `frameHeight = imageHeight / 2`, ambos inteiros. Alvo
  recomendado: `2048x1024` (`256x512` por frame), aceitando qualquer dimensao
  que divida exatamente a grade e tenha detalhe suficiente.
- **Rationale**: permite reexportar arte sem mudar gameplay; `256x512` melhora a
  origem do detalhe para exibicao grande e continua simples de validar.
- **Alternatives considered**: exigir somente `2048x1024` - rejeitado por
  acoplar a feature a uma exportacao especifica; aceitar dimensoes fracionarias -
  rejeitado por ser justamente a causa do defeito.

## D2a - Utilitario de normalizacao de sprite sheet

- **Decision**: registrar o utilitario existente `npm run fix:sprite-sheet`,
  documentado no `README.md`, como um caminho valido para corrigir imagens
  geradas em tamanho irregular antes de substituir o asset usado pelo jogo.
- **Rationale**: o utilitario usa a sheet irregular como fonte bruta e gera uma
  sheet limpa com frames finais inteiros (por exemplo `2048x1024`, 16 frames de
  `256x512` para uma grade `8x2`), preservando o padrao de sheet uniforme sem
  exigir recortes manuais frageis.
- **Alternatives considered**: depender apenas de reexportacao manual da arte -
  aceitavel, mas mais sujeito a erro; compensar no codigo de runtime - rejeitado
  porque manteria numeros magicos e risco de desalinhamento silencioso.

## D3 - Onde centralizar metadados de sprite

- **Decision**: criar/usar configuracao tipada de apresentacao para sheets
  (chave, asset, colunas, linhas, animacoes por intervalo, escala visual),
  centralizada perto de `core/constants.ts` ou em modulo dedicado de assets se a
  implementacao crescer.
- **Rationale**: FR-009/FR-010 pedem padrao reaproveitavel e sem numeros magicos
  silenciosos. `BootScene` continua o unico ponto que conhece caminhos de assets,
  mas a grade nao deve ficar duplicada.
- **Alternatives considered**: deixar `frameWidth/frameHeight` inline no
  `BootScene` - rejeitado por repetir o problema atual; mover stats para a config
  visual - rejeitado porque violaria separacao dados/logica/apresentacao.

## D4 - Fallback para asset ausente ou invalido

- **Decision**: se a sheet nao carregar, manter fallback atual (circulo + emoji)
  com `console.error`. Se a sheet carregar mas nao satisfizer a grade exata,
  registrar a inconsistencia e escolher explicitamente entre fallback visual ou
  uso legado apenas durante transicao, sem falha silenciosa.
- **Rationale**: FR-008 e Edge Cases exigem partida jogavel. A falha de dimensao
  precisa ficar visivel porque senao o defeito volta como tremor/borda cortada.
- **Alternatives considered**: lancar erro fatal - rejeitado porque bloquearia o
  jogo quando o asset ainda nao foi substituido; ignorar validacao - rejeitado
  por permitir regressao silenciosa.

## D5 - Dimensionamento do sprite

- **Decision**: calcular o tamanho exibido a partir das dimensoes do frame, nao
  da imagem fonte completa. Preservar proporcao do frame e manter escala visual
  ancorada no `radius` do inimigo, sem ler sprite para colisao/hitbox.
- **Rationale**: o codigo atual usa `sprite.texture.getSourceImage()`; em uma
  sheet isso representa a imagem inteira, nao o frame. O contrato correto e
  "frame visual escala para o tamanho desejado"; gameplay continua vindo de
  `EnemyType.radius`.
- **Alternatives considered**: ajustar `radius` para compensar visual - rejeitado
  por alterar gameplay; usar display height fixo - rejeitado por reduzir
  reutilizacao para outros inimigos.

## D6 - Sub-pixel em movimento

- **Decision**: preservar posicao logica fracionaria para movimento fluido e
  alinhar apenas a apresentacao do sprite ao pixel quando desenhar/aplicar
  transform. Preferir `roundPixels`/camera ou um wrapper visual com coordenadas
  arredondadas; a barra de vida deve permanecer coerente acima do inimigo.
- **Rationale**: FR-003 exige reduzir halo sem transformar movimento em "pulos".
  Separar logica de apresentacao atende determinismo e evita mexer em path,
  velocidade ou colisao.
- **Alternatives considered**: arredondar `Enemy.x/y` diretamente - rejeitado por
  alterar movimento e possivelmente targeting/projeteis; nearest-neighbor -
  rejeitado por criar aparencia de pixel art.

## D7 - HiDPI/Retina

- **Decision**: configurar render/scale para considerar `window.devicePixelRatio`
  com limite pratico (por exemplo `Math.min(devicePixelRatio, 2)`) e manter
  `Phaser.Scale.FIT` + `CENTER_BOTH`. Validar redimensionamento e performance
  antes de considerar DPR 3 completo.
- **Rationale**: FR-004 pede nitidez em HiDPI, mas Edge Case alerta sobre telas
  3x/janelas grandes. Um limite evita aumentar area de render sem controle.
- **Alternatives considered**: ignorar DPR - rejeitado por manter borrao de
  upscale; sempre usar DPR nativo sem limite - rejeitado por risco de performance.

## D8 - Filtragem visual

- **Decision**: manter antialias/linear filtering para arte ilustrada e nao
  habilitar `pixelArt`/nearest-neighbor. O ajuste de nitidez vem de asset correto,
  resolucao suficiente, frame exato, HiDPI e snap visual.
- **Rationale**: FR-005 proibe aparencia serrilhada de pixel art. A arte deve
  ficar limpa, nao "quadrada".
- **Alternatives considered**: `pixelArt: true` - rejeitado por mudar estilo.

## D9 - Testes e validacao

- **Decision**: cobrir por teste puro a validacao de grade/dimensoes e por
  verificacao de regressao que stats de `ENEMY_TYPES['dois-caras-moto']` nao
  mudaram. Validacao visual manual cobre fantasma, sub-pixel e HiDPI.
- **Rationale**: erro de recorte e regressao de gameplay sao detectaveis sem
  renderizacao; nitidez final exige observacao/captura do canvas.
- **Alternatives considered**: depender apenas de captura manual - rejeitado por
  nao proteger contrato de dimensoes; automatizar canvas pixel-perfect agora -
  rejeitado por custo alto para esta fase.

Nenhuma clarificacao remanescente.
