# Quickstart - Validacao da nitidez dos sprites

Guia para validar a feature de ponta a ponta apos implementacao. Nao contem
codigo de solucao; detalhes de implementacao pertencem a `/speckit-tasks` e aos
commits.

## Prerequisites

- Node/dependencias instaladas (`npm install` se necessario).
- Sheet da moto em `src/assets/enemies/dois-caras-numa-moto-sheet.png`.
- Para validar HiDPI, usar uma tela Retina/HiDPI ou DevTools simulando DPR alto.

## 1. Checks automatizados

```bash
npm run check
```

Validation status: executado em 2026-07-11; `tsc --noEmit` e Vitest passaram
com 9 arquivos de teste / 61 testes.

Expected:

- TypeScript strict passa.
- Vitest passa.
- Testes de validacao de sheet/config confirmam grade exata (`8x2`) e frames
  inteiros.
- Teste/regressao confirma que HP, velocidade, recompensa e raio da moto nao
  mudaram.

## 2. Validar asset corrigido

Verificar dimensoes da sheet:

```bash
file src/assets/enemies/dois-caras-numa-moto-sheet.png
```

Expected:

- A largura e divisivel por `8`.
- A altura e divisivel por `2`.
- Recomendado: `2048 x 1024` (`256 x 512` por frame), mas qualquer grade exata
  com detalhe suficiente e aceitavel.

Validation status: executado em 2026-07-11 com `file`; a sheet atual esta em
`2048 x 1024`, RGBA, nao entrelacada.

Se a sheet ainda estiver irregular, usar o utilitario documentado no `README.md`
como caminho de normalizacao offline:

```bash
npm run fix:sprite-sheet -- \
  src/assets/enemies/dois-caras-numa-moto-sheet.png \
  src/assets/enemies/dois-caras-numa-moto-sheet-fixed.png \
  --source-cols 8 \
  --source-rows 2 \
  --frame-width 256 \
  --frame-height 512 \
  --output-cols 8
```

Expected:

- A imagem gerada tem dimensoes exatas para a grade (`2048 x 1024` no exemplo).
- A imagem pode substituir o asset do jogo depois da revisao visual.
- A implementacao continua validando dimensoes no carregamento; o utilitario e
  apenas um caminho para preparar o asset, nao uma compensacao de runtime.

## 3. Rodar o jogo

```bash
npm run dev
```

Abrir a URL do Vite e acompanhar uma moto do inicio ao fim do caminho.

Validation status: executado em Chrome headless via Vite local
(`http://127.0.0.1:5174/`). A onda iniciou, a sheet publica foi usada pelo
`Enemy` e a moto renderizou como sprite animado em vez de fallback.

Expected:

- O ciclo de pilotar roda em loop sem mostrar faixa do frame vizinho.
- Nenhum frame corta borda direita/esquerda da moto.
- A moto preserva a arte ilustrada, sem aparencia serrilhada de pixel art.
- HP, velocidade, recompensa, colisao e barra de vida se comportam como antes.

## 4. Captura/zoom de movimento

Com uma moto em movimento, capturar tela ou gravacao curta e inspecionar com
zoom.

Validation status: executado por captura headless apos iniciar a onda. A captura
mostrou a moto usando frames da sheet corrigida, sem faixa vizinha ou fallback
visivel; os helpers puros de snap visual estao cobertos por Vitest. Caveat:
validacao perceptual final de halo/sub-pixel ainda deve ser repetida em um
navegador visivel com zoom manual ou gravacao curta.

Expected:

- Bordas da moto permanecem nitidas em movimento.
- Nao ha halo/borrao perceptivel de sub-pixel.
- Movimento continua fluido, sem saltos perceptiveis causados por snap visual.

## 5. Validar HiDPI/Retina

Abrir o jogo em tela HiDPI/Retina ou simular DPR alto. Redimensionar a janela.

Validation status: executado por Chrome headless com a configuracao de
apresentacao aplicando `zoom` limitado a `2`, `pixelArt: false`, `roundPixels:
true`, `FIT` e `CENTER_BOTH`. O campo e a sidebar permaneceram enquadrados na
captura. Caveat: repetir em tela Retina/HiDPI real para validar percepcao de
nitidez e fluidez com o compositor do dispositivo.

Expected:

- O canvas nao apresenta borrao extra de upscale.
- O campo de jogo permanece centralizado e enquadrado.
- Em janela grande/DPR alto, uma onda avancada continua fluida.

## 6. Validar fallback

Renomear temporariamente a sheet ou simular falha de carregamento, entao
recarregar o jogo.

Validation status: fallback observado em execucao headless quando a chave
publica da textura estava indisponivel; a onda continuou jogavel usando circulo
+ emoji. O caminho de codigo tambem deixa a chave publica indisponivel quando a
sheet crua falta ou falha validacao. Caveat: uma simulacao por bloqueio de
request no Chrome nao isolou bem o import de asset do Vite; repetir manualmente
por renome temporario da sheet em navegador visivel continua recomendado antes
de release.

Expected:

- O inimigo volta para circulo + emoji.
- A partida continua jogavel.
- O console registra a falha do asset ou da validacao de dimensao.

Restaurar a sheet ao final do teste.

## Traceability

| Requirement | Validation |
|-------------|------------|
| FR-001, SC-001 | Passos 2 e 3: grade exata, sem frame vizinho/corte. |
| FR-002, SC-002 | Passos 2, 3 e 4: asset com detalhe suficiente e bordas nitidas. |
| FR-003 | Passo 4: movimento sem halo e sem saltos perceptiveis. |
| FR-004, SC-003 | Passo 5: HiDPI sem borrao extra e com enquadramento correto. |
| FR-005 | Passo 3: arte ilustrada, sem pixel-art/serrilhado. |
| FR-006, FR-007, SC-004 | Passos 1 e 3: gameplay e barra de vida inalterados. |
| FR-008, SC-006 | Passo 6: fallback jogavel com log. |
| FR-009, SC-005 | Revisao de contrato/data model: padrao reutilizavel por sheet. |
| FR-010 | Passos 1 e 2: dimensoes derivadas/validadas sem numeros magicos silenciosos. |
