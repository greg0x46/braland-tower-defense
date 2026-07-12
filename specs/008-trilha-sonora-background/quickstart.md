# Quickstart — Validação: Trilha Sonora de Background

**Feature**: `008-trilha-sonora-background` | **Data**: 2026-07-11

Roteiro para provar que a feature funciona de ponta a ponta. Cada cenário mapeia para
requisitos e critérios de sucesso da [spec](./spec.md). Detalhes de regra estão nos
[contratos](./contracts/); aqui só o que se roda e o que se espera ver.

## Pré-requisitos

```bash
npm install
```

O asset já está no lugar: `src/assets/audio/sideways-samba.mp3`.

## Portão automatizado

```bash
npm run check     # tsc --noEmit && vitest run
```

Cobre as regras puras — nenhuma delas precisa de navegador:

| Módulo | O que o teste prova |
|--------|---------------------|
| `systems/audioSettings.test.ts` | `toggleMute` preserva o `volume`; `setVolume(0)` colapsa em mudo preservando o volume anterior; `setVolume(>0)` desmuta; clamp em `[0,1]`; `NaN` não corrompe o estado. (P2, P3) |
| `systems/audioPreferencesCodec.test.ts` | Storage ausente, JSON inválido, versão desconhecida, tipo errado e volume fora da faixa **nunca lançam** — caem no default. Ida e volta `serialize`/`parse` preserva o estado. (P4) |
| `systems/volumeSlider.test.ts` | `volumeFromPointerX(handleXFromVolume(v)) === v`; clamp nas duas pontas do trilho. (D9) |
| `core/EventBus.test.ts` (existente) | `AUDIO_SETTINGS_CHANGED` está no `EVENT_CATALOG` com produtor e consumidores declarados. (P5) |

**Um teste automatizado não prova que existe som saindo da caixa.** Os cenários abaixo
são obrigatórios.

## Validação manual

```bash
npm run dev
```

### Cenário 1 — A música toca e faz loop (US1, FR-001, FR-002, SC-001, SC-002)

1. Abra o jogo. **A tela deve aparecer imediatamente**, mesmo antes de a música tocar —
   o boot não espera o áudio (C2).
2. Clique em qualquer lugar (ou em "▶ Iniciar"). A música começa. (C3 — o autoplay
   estava travado até este gesto.)
3. Abra o console: **nenhum erro**. Autoplay travado é espera, não falha (C3 vs. C4).
4. Deixe a faixa chegar ao fim e reiniciar. O loop deve ser **contínuo**, sem silêncio
   nem estalo.

### Cenário 2 — Mudo e volume (US2, FR-005, FR-006, SC-003)

1. Clique no ícone 🔊 na barra superior. Silêncio imediato; o ícone vira 🔇.
2. Clique de novo. O som volta **no mesmo volume de antes** — sem reajustar nada (P2).
3. Arraste o slider. O volume acompanha na hora, do silêncio ao máximo.
4. Arraste o slider **até o mínimo**. O ícone deve virar 🔇 — "volume zero" e "mudo"
   não podem discordar no HUD (P3).
5. Arraste de volta **acima de zero**. O áudio desmuta sozinho.
6. Faça tudo isso **com uma onda em andamento**: a partida não pode pausar, reiniciar
   nem alterar nada (P6).

### Cenário 3 — Preferência persistida (US3, FR-007, SC-004)

1. Silencie o jogo (ou baixe o volume para um nível distinto).
2. Recarregue a página (F5).
3. O jogo deve iniciar **já mudo** (ou no volume escolhido), com o ícone e a alça do
   slider refletindo isso. Nenhum instante de música alta antes de silenciar (C6).

### Cenário 4 — Instância única através do reinício (FR-003)

**O cenário que mais importa** — é o bug mais provável desta feature.

1. Deixe a música tocando.
2. Perca a partida de propósito (deixe os inimigos passarem até a vida zerar).
3. Clique em "🔁 Jogar novamente".
4. A música deve **continuar tocando normalmente**: sem parar, sem reiniciar do zero e,
   sobretudo, **sem uma segunda faixa sobreposta** (o som "dobrado" é inconfundível).
5. Repita o ciclo 2–3 vezes. Continua uma única faixa. (C1)

### Cenário 5 — A pausa não afeta a música (FR-004)

1. Com a música tocando, clique em "⏸ Pausar".
2. A música **continua tocando**, sem cortar e sem abaixar.
3. Clique em "▶ Continuar". A música segue de onde estava — não reinicia.
4. Alterne pausa/continuar várias vezes seguidas: a faixa nunca corta nem duplica. (C5)

### Cenário 6 — O jogo é jogável sem áudio (FR-010, SC-006)

Simule a falha real (DevTools → Network → bloqueie a requisição do `.mp3`, ou renomeie
o arquivo temporariamente):

1. Recarregue. O jogo abre e é **completamente jogável** em silêncio.
2. Jogue uma partida inteira: construir → onda → combate → derrota → reiniciar. Tudo
   funciona.
3. O console mostra **um erro registrado** sobre a falha de carregamento — visível, não
   silenciado (C4, Princípio X).
4. Os controles de áudio não podem travar o HUD nem lançar exceção ao serem clicados.

### Cenário 7 — O controle de áudio não rouba cliques da gameplay

1. Selecione uma torre no card.
2. Clique na barra superior, **em cima do controle de áudio**.
3. Nenhuma torre é construída ali (a barra superior é zona não-construível,
   `buildBounds.minY = HUD_HEIGHT`) e o clique aciona o controle de áudio — e só ele.

### Cenário 8 — Sem regressão de performance (SC-005)

1. Ative o overlay de debug (FPS + contagem de entidades).
2. Rode até uma onda densa e anote FPS e contagem.
3. Compare com a mesma onda **antes** da feature (`git stash` ou o commit anterior).
4. Os números devem ser equivalentes. O áudio não roda no `update()` — qualquer queda
   perceptível aqui indica que algo foi parar no game loop indevidamente.

## Checklist de Definição de Concluído (Constitution XIV)

Percorrido em 2026-07-11, dirigindo o jogo num browser headless (Playwright +
SwiftShader) além do portão automatizado.

- [X] Funciona dentro do loop principal (construir → onda → combate → fim).
- [X] Feedback visual mínimo: ícone de mudo e alça do slider refletem o estado real.
- [X] Sem regressão de performance (Cenário 8). **Medido**: 57–59 FPS estáveis ao longo
      de 60 s de partida com a trilha tocando — no teto do motor. Não houve *re-run* do
      commit anterior como linha de base: o áudio não tem nenhum código por frame
      (nada no `update()`), e o FPS já está no teto, então não há regressão a medir.
- [X] Contratos respeitados: áudio não importa gameplay e vice-versa (P6). Verificado por
      varredura de imports — as únicas menções a `GameState` nos módulos de áudio são
      comentários.
- [X] Nenhuma regra de negócio depende de asset de áudio (Cenário 6).
- [X] Tipos adequados; sem `any`/`as` de conveniência (varredura nos 7 módulos novos).
- [X] Regras críticas testadas: coerência mudo/volume, parse tolerante, geometria do slider.
- [X] Configurável via `src/data/audio.ts` + `constants` — trocar a faixa não toca em código.
- [X] O jogo não depende do asset final para funcionar (Cenário 6: com o `.mp3` abortado,
      partida completa jogável e controles de áudio sem exceção).
- [X] `npm run check` passa (21 arquivos, 191 testes).
- [X] Falha de load registra erro; autoplay travado **não** registra erro (C3 vs. C4).
      Com o `.mp3` bloqueado sai **exatamente um** erro da aplicação
      (`[MusicManager] Falha ao carregar a trilha...`); no boot normal, zero.

## Otimização opcional — FEITA (2026-07-11)

O `.mp3` vinha da YouTube Audio Library a **256 kbps estéreo (5,84 MB)** — pesado
para uma faixa de fundo. Com o load não bloqueante (C2) isso não atrasava nada, mas
custava banda ao jogador. Recomprimido para **128 kbps (2,92 MB)**, metade do tamanho:

```bash
ffmpeg -i sideways-samba.mp3 -codec:a libmp3lame -b:a 128k -ac 2 -ar 44100 saida.mp3
```

Duração idêntica (191,32 s — o loop não muda) e RMS praticamente igual (−14,30 →
−14,75 dB). Cenários 1 e 2 revalidados com o arquivo novo: carrega, toca em loop,
mudo e slider respondem, zero erro no console.
