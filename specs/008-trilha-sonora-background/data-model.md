# Phase 1 — Data Model: Trilha Sonora de Background

**Feature**: `008-trilha-sonora-background` | **Data**: 2026-07-11

Duas entidades, uma de dados (a faixa) e uma de estado (a preferência). Nenhuma
entidade de gameplay é criada ou alterada — o áudio não entra no domínio.

---

## 1. `MusicTrack` — a faixa (dados)

Vive em `src/data/audio.ts`. É configuração, não código: trocar a música é trocar
uma entrada aqui (Princípio V).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | `string` | Identificador estável do domínio (`'sideways-samba'`). Nunca o caminho do arquivo. |
| `cacheKey` | `string` | Chave no cache de áudio do Phaser (`'bgm-sideways-samba'`). |
| `defaultVolume` | `number` | Volume base em `[0,1]`. Proposta: **0.35** — fundo audível que deixa espaço para SFX futuros (FR-009). |
| `loop` | `boolean` | Sempre `true` nesta feature (FR-001). |

**Regras de validação**:

- `defaultVolume` DEVE estar em `[0,1]`; fora disso é erro de programação, não
  entrada de usuário.
- O caminho do arquivo (`../assets/audio/sideways-samba.mp3`) é importado **apenas**
  pelo `MusicManager`, nunca por `data/` nem por regra alguma (Princípio XI).

---

## 2. `AudioPreferences` — a preferência do jogador (estado persistido)

Fonte de verdade em `src/core/AudioSettings.ts`; as regras que a governam são puras,
em `src/systems/audioSettings.ts`.

| Campo | Tipo | Persistido | Descrição |
|-------|------|:----------:|-----------|
| `muted` | `boolean` | ✅ | Se o jogador silenciou explicitamente. |
| `volume` | `number` | ✅ | Volume escolhido, em `[0,1]`. **Preservado mesmo quando `muted`** — é o que permite "voltar como estava" ao desmutar. |
| `effectiveVolume` | `number` | ❌ | **Derivado**: `muted ? 0 : volume`. Único valor entregue ao motor de áudio. |

`effectiveVolume` ser derivado (e não armazenado) é o que torna o estado inválido
"desmutei e continuo sem ouvir nada" **irrepresentável** (Princípio VII). Não existe
combinação de campos persistidos capaz de produzi-lo.

### Estado inicial (primeira visita, sem preferência salva)

```text
{ muted: false, volume: MusicTrack.defaultVolume }   →  effectiveVolume = 0.35
```

### Transições

| Ação | Pré-condição | Efeito |
|------|--------------|--------|
| `toggleMute()` | — | Inverte `muted`. `volume` **não muda**. Ao desmutar, o áudio volta no `volume` guardado (US2, cenário 2). |
| `setVolume(v)` | `v` é clampado a `[0,1]` | Define `volume = v`. Se `v > 0`, força `muted = false` (mexer no slider "acorda" o áudio). Se `v === 0`, força `muted = true` mas **preserva o `volume` anterior não-zero** para o retorno. |
| `load()` | Boot | Lê do storage; entrada ausente/corrompida cai no estado inicial + `warn`. |

A regra de `setVolume(0)` merece destaque porque é o edge case da spec: **"volume no
mínimo" e "mudo" são o mesmo estado audível**, e o HUD não pode mostrar os dois em
desacordo. Colapsá-los em `muted = true` resolve isso sem inventar um terceiro estado.

### Invariantes

1. `volume ∈ [0,1]` sempre — inclusive vindo de `localStorage` adulterado.
2. `effectiveVolume === 0` ⟺ `muted === true`.
3. `muted === false` ⟹ `volume > 0` (garantido pela regra de `setVolume(0)`).
4. Nenhuma transição de áudio altera qualquer campo de `GameState` (FR-008).

---

## 3. Formato persistido

Chave: `br-td:audio` · Storage: `localStorage`

```json
{ "v": 1, "muted": false, "volume": 0.35 }
```

`v` é a versão do formato — permite migrar depois sem adivinhar. O parse é
**tolerante por contrato**: chave ausente, JSON inválido, `v` desconhecido, campo
faltando, tipo errado ou volume fora da faixa **nunca lançam**. Todos caem no estado
inicial e registram um `console.warn` (Princípio X — falha visível, mas não fatal).

---

## 4. Evento novo no EventBus

Uma entrada nova em `GameEvents` e a correspondente em `EVENT_CATALOG` (que é
verificado por `EventBus.test.ts` — um evento sem consumidor quebraria o portão).

| Evento | `AUDIO_SETTINGS_CHANGED` (`'audio-settings-changed'`) |
|--------|--------------------------------------------------------|
| **Payload** | `{ muted: boolean; volume: number; effectiveVolume: number }` |
| **Status** | `active` |
| **Producer** | `AudioSettings` (core) |
| **Consumers** | `MusicManager` (aplica o volume no som), `UIScene` (ícone de mudo + posição da alça do slider) |
| **Emission rules** | Emitido **apenas quando o estado muda de fato** — mesma disciplina de `PAUSE_STATE_CHANGED`. Arrastar o slider dentro do mesmo pixel de volume não emite. Emitido também uma vez no boot, após carregar a preferência, para o HUD nascer sincronizado. |

O payload carrega os três valores (e não só `effectiveVolume`) porque os dois
consumidores querem coisas diferentes: o `MusicManager` só precisa do efetivo; a
`UIScene` precisa de `muted` para o ícone **e** de `volume` para desenhar a alça na
posição certa mesmo com o som mudo. Payload completo = consumidor não lê estado
global (disciplina já estabelecida no catálogo existente).

---

## 5. Geometria do slider (regra pura, sem entidade persistida)

`src/systems/volumeSlider.ts` — duas funções inversas, mais a configuração de layout:

| Função | Contrato |
|--------|----------|
| `volumeFromPointerX(x, layout)` | Pixel → `[0,1]`, com clamp nas duas pontas (arrastar para fora do trilho satura em 0 ou 1, não extrapola). |
| `handleXFromVolume(v, layout)` | `[0,1]` → pixel do centro da alça. |

**Invariante de ida e volta**: `volumeFromPointerX(handleXFromVolume(v)) === v` para
todo `v ∈ [0,1]`, a menos de erro de ponto flutuante. É o teste que pega o erro
clássico de esquecer a meia-largura da alça em um dos lados.
