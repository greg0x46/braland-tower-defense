---
name: verify
description: Roda o BR-TD num browser headless e dirige o jogo (construir, iniciar, pausar, matar) para observar comportamento real. Use quando uma mudança tocar gameplay, HUD, cenas ou entidades — `npm run check` cobre só as regras puras.
---

# Verificar o BR-TD de verdade

`npm run check` (typecheck + Vitest) cobre as regras puras em `src/systems/` e os
contratos em `src/data/`. Ele **não** prova que o jogo funciona: cenas, entidades,
EventBus e HUD só existem em runtime, no canvas. Para isso, dirija o jogo.

## Subir

```bash
npm run dev            # anota a porta: 5173 ou 5174 se estiver ocupada
```

## Handle: Playwright + SwiftShader

Phaser usa WebGL. No Chromium headless padrão o contexto quebra
(`Framebuffer Unsupported`) e **os screenshots saem pretos** — um preto que passa
despercebido e produz "evidência" falsa (dois frames pretos comparam como iguais).
Sempre suba com SwiftShader:

```js
const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
});
```

Sempre confira o primeiro screenshot antes de confiar em qualquer comparação.

## Coordenadas

O jogo é 1580×720 (`PLAY_WIDTH` 1280 + sidebar 300) com `Phaser.Scale.FIT`. Com
viewport 1600×760 o canvas fica ~1:1. Converta coordenada de jogo → página:

```js
const box = await page.locator('canvas').boundingBox();
const s = box.width / 1580;
const click = async (gx, gy) => { await page.mouse.click(box.x + gx*s, box.y + gy*s); await page.waitForTimeout(250); };
```

Pontos úteis (coordenadas de jogo):

- card da 1ª torre: `(1430, 144)`
- botão Iniciar/Pausar/Continuar: `(1430, 676)`
- terreno construível **dentro do alcance da pista**: `(300, 560)` e `(430, 580)`

## Gotcha: torre longe da pista não ataca

O alcance do Caramelo é 120 px. Construir em `(300, 500)` deixa a torre a ~136 px
do caminho — ela **nunca ataca** e você conclui, errado, que o combate quebrou.
Use os pontos acima.

## Fluxo que vale dirigir

1. Boot → HUD deve mostrar `💰 150`, `❤️ 20`, `🌊 Onda: — /∞`.
2. Clicar card + campo **antes de iniciar** → constrói (setup permite), dinheiro cai 50.
3. Iniciar → `Onda: 1/∞`, motoboys entram, botão vira `⏸ Pausar`.
4. Deixar ~30 s → abate credita `+8` (dinheiro sobe) e vazamento tira vida.
5. Pausar → gameplay congela e construção trava (dinheiro não muda ao tentar).
6. Continuar → volta a andar.

## Gotcha: pausa não congela o sprite

Pausado, os inimigos **não se movem**, mas a animação Phaser do sprite continua
rodando no lugar. Comparar hashes de frame durante a pausa dá "mudou" mesmo com o
gameplay corretamente congelado. Para provar congelamento, compare a **posição**
(as barras de vida não se deslocam), não o hash da imagem.
