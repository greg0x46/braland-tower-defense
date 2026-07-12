# Contrato: Preferências de Áudio (Mudo, Volume, Persistência)

**Feature**: `008-trilha-sonora-background`
**Donos**: `src/core/AudioSettings.ts` (estado) · `src/systems/audioSettings.ts` (regras puras) · `src/systems/audioPreferencesCodec.ts` (persistência) · `src/core/preferenceStorage.ts` (adaptador)

A divisão é deliberada: **o estado é um singleton; as regras que o governam são puras
e testáveis sem DOM.** O Vitest deste projeto roda em `environment: 'node'` — se a
regra dependesse de `localStorage` ou do Phaser, ela não teria teste.

---

## P1 — Fonte de verdade e derivação

**Regra**: o estado é `{ muted: boolean; volume: number }`. O valor entregue ao motor
de áudio é **derivado**, nunca armazenado:

```text
effectiveVolume = muted ? 0 : volume
```

**Invariantes** (todas cobertas por teste):

1. `volume ∈ [0,1]` sempre — inclusive vindo de storage adulterado.
2. `effectiveVolume === 0` ⟺ `muted === true`.
3. `muted === false` ⟹ `volume > 0`.
4. Nenhuma operação de áudio altera `GameState` (FR-008).

A invariante 2 é o que torna "desmutado e inaudível" **irrepresentável**. Se
`effectiveVolume` fosse um campo armazenado, esse estado inválido existiria e teria que
ser defendido com `if`s espalhados (Princípio VII).

---

## P2 — `toggleMute()`

| Antes | Ação | Depois |
|-------|------|--------|
| `{ muted: false, volume: 0.6 }` | `toggleMute()` | `{ muted: true, volume: 0.6 }` → efetivo `0` |
| `{ muted: true, volume: 0.6 }` | `toggleMute()` | `{ muted: false, volume: 0.6 }` → efetivo `0.6` |

**Garantia central**: `volume` **não é tocado** ao mutar. É isso que faz o desmute
devolver o som **no volume que estava**, sem o jogador reajustar nada (User Story 2,
cenário 2). Zerar `volume` no mute seria o bug clássico dessa feature.

---

## P3 — `setVolume(v)`

Ordem das regras: **clamp → coerência**.

| Entrada | Resultado | Motivo |
|---------|-----------|--------|
| `v = 0.5`, estado `{muted:false, volume:0.35}` | `{muted:false, volume:0.5}` | Caso comum. |
| `v = 0.5`, estado `{muted:true, volume:0.35}` | `{muted:false, volume:0.5}` | Mexer no slider acima de zero **acorda** o áudio. |
| `v = 0` | `{muted:true, volume:<preservado>}` | Slider no mínimo **é** mudo (edge case da spec). O `volume` anterior não-zero é preservado para o retorno. |
| `v = 1.7` | `volume = 1` | Clamp. |
| `v = -0.2` | `volume = 0` → e daí `muted = true` | Clamp e então a regra de zero. |
| `v = NaN` | estado inalterado + `warn` | Entrada inválida não corrompe o estado. |

**A linha do `v = 0` é o coração deste contrato.** "Volume no mínimo" e "mudo" são o
mesmo estado audível; deixá-los divergirem produz um HUD mentiroso (ícone 🔊 com
silêncio total). Colapsar em `muted = true` resolve sem inventar um terceiro estado —
e preservar o `volume` guardado é o que impede o slider de "engolir" a preferência do
jogador.

---

## P4 — Persistência tolerante

**Chave**: `br-td:audio` · **Payload**: `{ "v": 1, "muted": false, "volume": 0.35 }`

**Regra**: a leitura **nunca lança**. Toda entrada inválida cai no estado inicial e
registra `console.warn`.

| Situação no storage | Resultado |
|---------------------|-----------|
| Chave ausente (primeira visita) | Estado inicial, **sem** warn (não é anomalia). |
| JSON inválido / lixo | Estado inicial + `warn`. |
| `v` desconhecido (ex.: `2`) | Estado inicial + `warn`. |
| Campo faltando ou tipo errado (`volume: "alto"`) | Estado inicial + `warn`. |
| `volume` fora de `[0,1]` | Clampado para a faixa válida. |
| `localStorage` **lança** (Safari privado) | Estado inicial + `warn`; o jogo segue, apenas sem lembrar a escolha. |

**Escrita**: também protegida — falha ao gravar registra `warn` e **não** interrompe o
jogo. Perder a persistência é um aborrecimento; travar a partida por causa dela seria
um bug.

**Isolamento**: todo acesso ao `localStorage` passa por `preferenceStorage`, atrás de
uma interface. Isso existe por duas razões concretas (não por gosto de abstrair): o
`localStorage` **lança exceção** no Safari em modo privado, e o teste precisa de um
storage falso porque roda sem DOM.

---

## P5 — Evento `AUDIO_SETTINGS_CHANGED`

Entrada nova em `GameEvents` **e** em `EVENT_CATALOG` — o catálogo é verificado por
`EventBus.test.ts`, então um evento sem consumidor declarado quebra o portão em vez de
apodrecer como API fantasma.

```ts
[GameEvents.AUDIO_SETTINGS_CHANGED]: {
  muted: boolean;
  volume: number;
  effectiveVolume: number;
}
```

| Campo do catálogo | Valor |
|-------------------|-------|
| `status` | `active` |
| `producer` | `AudioSettings` (core) |
| `consumers` | `MusicManager` (aplica volume no som) · `UIScene` (ícone de mudo + alça do slider) |
| `emissionRules` | Emitido **apenas quando o estado muda de fato** (mesma disciplina de `PAUSE_STATE_CHANGED`). Arrastar o slider sem mudar o volume resultante não emite. Emitido uma vez no boot, após carregar a preferência, para o HUD nascer sincronizado. |

O payload leva os **três** valores de propósito: o `MusicManager` só quer o efetivo, mas
a `UIScene` precisa de `muted` para o ícone **e** de `volume` para desenhar a alça na
posição certa mesmo com o som mudo. Payload completo = consumidor não precisa ler estado
global — disciplina já estabelecida no catálogo existente.

---

## P6 — O áudio não conversa com o gameplay

**Regra**: `AudioSettings` **não** importa `GameState`, `matchProgression`,
`WaveManager` ou `BuildManager`. E nenhum deles importa `AudioSettings`.

**Garantias**:

- Uma partida jogada com o som ligado e outra com o som desligado produzem **exatamente**
  o mesmo resultado de dano, economia, spawn, alvo e progressão (FR-008).
- Alternar mudo ou volume no meio de uma onda não pausa, não reinicia e não altera nada
  da partida (User Story 2, cenário 5).
- A preferência de áudio **sobrevive** ao `GameState.reset()` — ela tem ciclo de vida
  maior que o da partida (FR-007).

Essa última linha é a razão de `AudioSettings` ser um singleton separado em vez de um
campo do `GameState`: amarrá-lo ao estado da partida o faria ser zerado a cada reinício,
que é o oposto do que FR-007 pede.
