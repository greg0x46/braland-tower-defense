# Quickstart — Validacao da animacao de ataque

Guia para validar a implementacao desta feature de ponta a ponta. Detalhes de modelo estao em [data-model.md](./data-model.md) e contratos internos em [contracts/attack-animation.md](./contracts/attack-animation.md).

## Prerequisitos

- Node/npm instalados.
- Dependencias do projeto instaladas:

```bash
npm install
```

## Verificacoes automatizadas

Rode:

```bash
npm run check
```

Resultado esperado:

- TypeScript sem erros.
- Testes Vitest existentes verdes.
- Nenhum teste puro passa a depender de Phaser/renderizacao.

## Validacao manual principal

1. Inicie o jogo:

```bash
npm run dev
```

2. Abra `http://localhost:5173`.
3. Construa uma torre **Vira-lata Caramelo**.
4. Inicie uma onda.
5. Observe o primeiro ataque contra um inimigo valido.

Resultado esperado:

- O cachorro executa preparacao antes de correr.
- A corrida se desloca visualmente em direcao ao inimigo.
- A corrida usa loop de frames enquanto o deslocamento visual ainda nao terminou.
- A etapa de ataque aparece perto do momento em que o dano e aplicado, sem projetil visual para o Vira-lata Caramelo.
- Ao terminar, a torre retorna ao visual idle/pronto.
- Dano, alcance, custo, selecao de alvo e ritmo geral continuam equivalentes ao comportamento anterior.

## Cenarios de aceite

### 1. Alvo perto

- Construa a torre perto do caminho.
- Inicie onda e observe ataque contra inimigo em curta distancia.

Esperado: preparacao e ataque continuam perceptiveis; a corrida pode ser curta, mas nao congela nem pula para estado incoerente.

### 2. Alvo distante dentro do alcance

- Posicione a torre onde o inimigo entre no alcance mais longe da torre.
- Observe a etapa de corrida.

Esperado: sprites de corrida repetem ate a chegada visual; a animacao transiciona limpo para ataque.

### 3. Ataques consecutivos

- Deixe varios inimigos no alcance da mesma torre.
- Observe pelo menos tres ataques seguidos.

Esperado: nao ha sobreposicao incoerente, mais de um cachorro visual por torre, nem residuos fora da origem depois de cada ataque.

### 4. Fallback com etapa incompleta

- Temporariamente configure uma etapa com apenas um frame valido.
- Rode o jogo e observe um ataque.

Esperado: a etapa ainda aparece; se for corrida, o frame unico repete. O combate continua funcionando.

### 5. Fallback com sprite ausente

- Temporariamente referencie uma chave de textura inexistente em uma etapa ou remova um preload de asset.
- Rode o jogo e observe console + ataque.

Esperado: ha log/sinalizacao util da falha; a torre continua construivel e atacando com fallback visual. A partida nao trava.

### 6. Alvo invalido antes do cue

- Em uma situacao com varios tiros/projeteis, observe quando um alvo morre antes da animacao chegar ao ataque.

Esperado: a animacao cancela/retorna ao idle ou escolhe fluxo coerente definido pela implementacao; nao dispara dano invalido, nao fica em corrida infinita e nao deixa visual fora da torre.

## Debug recomendado

Durante `npm run dev`, tecle backtick (`` ` ``) para abrir o overlay de debug.

Use o overlay para confirmar:

- range da torre continua centrado na torre;
- alvo atual segue a regra de `pickMostAdvancedInRange`;
- o container/hitbox da torre nao se move junto com o cachorro visual;
- FPS permanece estavel durante ataques.

## Criterios de conclusao

- `npm run check` passa.
- Todos os cenarios P1 passam: preparacao, corrida em loop e ataque em ordem.
- Adicionar um frame a uma etapa exige alterar apenas a definicao visual/preload do asset correspondente.
- Falha de sprite nao impede iniciar partida, construir torre ou atacar.
- Nenhuma regra de gameplay le dimensao, offset ou caminho fisico de sprite.

## Notas de validacao da implementacao — 2026-07-11

- `npm run check`: PASS (`tsc --noEmit` + 23 testes Vitest).
- `npm run build`: PASS; os novos PNGs da animacao foram empacotados pelo Vite.
- Smoke HTTP em `http://127.0.0.1:5174/`: PASS para HTML, modulo principal e asset de preparacao.
- Smoke headless Chrome: PASS; canvas renderizou, Vira-lata Caramelo foi construido em `(180, 180)`, onda 1 iniciou, inimigos entraram no alcance e dinheiro subiu para `108` apos recompensas de combate.
- Ajuste posterior: ataque animado do Vira-lata Caramelo aplica dano direto no cue de ataque e nao cria projetil visual.
- Evidencias locais: `/private/tmp/br-td-smoke.png` e `/private/tmp/br-td-gameplay-smoke.png`.
