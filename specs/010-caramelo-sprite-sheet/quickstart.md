# Quickstart — Validação da sheet animada do Caramelo

## Prerequisites

```bash
npm install
python3 -m pip install Pillow
```

## 1. Preparar o asset final

Fonte bruta confirmada: `PNG RGB 1774x887`, grade visual `8x4`.

```bash
npm run adjust:sprite-sheet -- \
  "ChatGPT Image Jul 12, 2026, 01_14_06 AM.png" \
  src/assets/towers/vira-lata-caramelo-sheet.png \
  --source-cols 8 \
  --source-rows 4 \
  --frame-width 256 \
  --frame-height 256 \
  --output-cols 8 \
  --transparent-checkerboard \
  --extract-mode main-component \
  --component-frame-padding 18 \
  --preview-grid /tmp/caramelo-grid.png \
  --validate-frame-edges \
  --edge-margin 1
```

Expected outcome: final PNG `src/assets/towers/vira-lata-caramelo-sheet.png`
em `RGBA 2048x1024`, 32 frames de `256x256`, alpha real, preview com grade em
`/tmp/caramelo-grid.png` sem cachorro cortado nem bleed relevante.

## 2. Verificar contratos automatizados

```bash
npm run check
npm run build
```

Expected outcome: typecheck e Vitest verdes; build de produção concluído.

## 3. Validar em jogo

```bash
npm run dev
```

No navegador:

1. Construir um Vira-lata Caramelo perto do caminho.
2. Iniciar a partida.
3. Observar um ciclo completo: idle/alerta, preparação, corrida com 6+ frames,
   mordida com deixa visual, retorno ou encadeamento.
4. Pausar com o cachorro fora da base e retomar: animação/posição retomam sem
   salto visível.
5. Reiniciar a partida: não sobra posição/frame da partida anterior.

## 4. Validar fallback

Temporariamente renomear `src/assets/towers/vira-lata-caramelo-sheet.png` e rodar:

```bash
npm run check
npm run dev
```

Expected outcome: erro visível no console de desenvolvimento; a partida continua
jogável com fallback visual; dano, alcance, cadência, alvo e engajamento seguem
os contratos existentes.
