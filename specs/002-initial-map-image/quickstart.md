# Quickstart — Validar mapa inicial com imagem

Guia de validação da feature após implementação. Referências:
[plan.md](./plan.md), [data-model.md](./data-model.md) e
[contracts/map-presentation.md](./contracts/map-presentation.md).

## Pré-requisitos

- Dependências instaladas (`npm install`, se necessário).
- `image.png` movido/renomeado para `src/assets/maps/initial-map.png`.
- `.specify/feature.json` apontando para `specs/002-initial-map-image`.

## 1. Gate automatizado

```bash
npm run check
```

**Esperado**: `tsc --noEmit` e `vitest run` passam. As regras puras de
geometria, placement, targeting e waves continuam verdes.

## 2. Rodar o jogo

```bash
npm run dev
```

Abra a URL indicada pelo Vite, normalmente `http://localhost:5173`.

## 3. Cenários de aceite visuais

### Mapa no campo jogável

1. Inicie o jogo.
2. Verifique que a imagem aparece como fundo do campo.
3. Verifique que a imagem termina no limite da área jogável e não cobre a
   sidebar.
4. Verifique que HUD, dinheiro, vidas, onda, cards e botão de iniciar continuam
   visíveis e interativos.

**Esperado**: mapa em 100% da área jogável, sem invadir sidebar/HUD.

### Trilha antiga removida

1. Observe o mapa com debug desligado.
2. Procure por linhas ou faixas desenhadas por código sobre a estrada.

**Esperado**: nenhuma trilha antiga aparece no modo normal; apenas a estrada da
imagem é visível.

### Inimigos alinhados à estrada

1. Inicie uma onda.
2. Observe os inimigos percorrendo o mapa.
3. Ative o debug overlay com a tecla de depuração existente.

**Esperado**: inimigos seguem visualmente a estrada da imagem; com debug ligado,
a linha central real aparece sobre essa estrada.

### Construção bloqueada na estrada

1. Selecione uma torre.
2. Tente posicioná-la sobre a estrada/asfalto.
3. Tente posicioná-la em áreas verdes ou praças claramente livres.

**Esperado**: construção sobre estrada é rejeitada; construção em áreas livres é
permitida quando há dinheiro e demais regras são satisfeitas.

## 4. Fallback de asset

Simule falha do mapa, por exemplo renomeando temporariamente o arquivo ou
apontando o import para um caminho inválido durante desenvolvimento.

1. Recarregue o jogo.
2. Inicie uma onda.
3. Posicione uma torre em área válida.
4. Ative o debug overlay.

**Esperado**: o jogo não trava; um fundo simples aparece, o erro é registrado ou
sinalizado, ondas/construção/HUD funcionam e o caminho real ainda aparece no
debug.

Reverta a simulação ao final.

## 5. Higiene do repositório

```bash
test -f src/assets/maps/initial-map.png
test ! -f image.png
```

**Esperado**: o asset está no diretório de mapas e não permanece na raiz do
repositório.

## Resultado da validação — 2026-07-11

- `npm run check` passou com `tsc --noEmit` e 23 testes Vitest verdes.
- Renderização normal validada em Chrome headless em `http://127.0.0.1:5173/`:
  mapa preenche `PLAY_WIDTH x GAME_HEIGHT`, a sidebar/HUD continuam visíveis e
  a trilha antiga não aparece no modo normal.
- Onda 1 iniciada no navegador; o inimigo usa o `PATH` revisado sobre a estrada
  da imagem.
- Debug overlay validado no navegador: faixa de bloqueio, linha central e
  métricas aparecem acima do mapa.
- Fallback validado apontando temporariamente o loader para uma URL inexistente
  e restaurando o asset em seguida: a partida renderiza fundo simples, HUD,
  sidebar e onda sem travar.
- Higiene validada: `src/assets/maps/initial-map.png` existe e `image.png` não
  permanece na raiz.

## Checklist de Definição de Concluído

- [x] Mapa renderiza somente em `PLAY_WIDTH x GAME_HEIGHT`.
- [x] Sidebar e HUD permanecem visíveis/interativos.
- [x] Trilha antiga não aparece no jogo normal.
- [x] Inimigos seguem a estrada da imagem.
- [x] Construção é bloqueada na estrada e permitida em áreas livres.
- [x] Debug overlay mostra o caminho real sobre mapa/fallback.
- [x] Falha de asset mantém o jogo jogável e registra/sinaliza erro.
- [x] Nenhum sistema completo de múltiplos mapas foi criado.
- [x] `npm run check` passa.
