# Phase 0 — Research: Orientação do sprite do inimigo

Contexto: a spec não deixou `[NEEDS CLARIFICATION]` (fechados em 2026-07-11). As
decisões abaixo resolvem detalhes de tunning/implementação de apresentação que a
spec deliberadamente diferiu ao plano. Todas verificáveis sem alterar gameplay.

## D1 — Onde vive a regra de orientação

- **Decisão**: módulo puro `src/systems/orientation.ts`, sem import de Phaser,
  exportando uma função que mapeia o vetor de deslocamento + estado anterior para
  `{ flipX: boolean, tiltDeg: number }`.
- **Rationale**: Constitution IX/IV — a regra crítica (nunca andar de ré) precisa
  ser testável sem renderização; segue o precedente de `geometry.ts`. Mantém o
  `Enemy` fino (só aplica o resultado ao Sprite).
- **Alternativas consideradas**: (a) lógica inline no `Enemy.step()` — rejeitada
  por acoplar regra testável ao GameObject; (b) subclasse por inimigo —
  rejeitada, violaria FR-014 (data-driven, sem código por inimigo).

## D2 — Espelhamento horizontal (flipX)

- **Decisão**: a arte olha para a esquerda; `flipX = true` quando o deslocamento
  horizontal é para a **direita** (`dx > +deadzone`), `flipX = false` quando é
  para a **esquerda** (`dx < -deadzone`). Dentro da deadzone, **mantém** o flip
  anterior.
- **Rationale**: satisfaz FR-006/FR-007 (nunca de ré) e FR-008 (segmento vertical
  preserva o último sentido). A deadzone evita troca nervosa perto de dx≈0.
- **Alternativas**: comparar sinal de dx sem deadzone — rejeitada por flicker em
  segmentos quase verticais.

## D3 — Inclinação discreta (3 estados)

- **Decisão**: 3 estados a partir da componente vertical **normalizada**
  `ny = dy / hypot(dx,dy)` (tela: y cresce para baixo):
  - `descendo` (nariz p/ baixo, `tiltDeg = +15`) quando `ny > +sinθ`
  - `plano` (`tiltDeg = 0`) quando `|ny| ≤ sinθ`
  - `subindo` (nariz p/ cima, `tiltDeg = −15`) quando `ny < −sinθ`
  - Limiar `θ = 20°` → `sinθ ≈ 0,342` separa "plano" de inclinado.
- **Independência do flip (FR-009a)**: o `tiltDeg` é aplicado como `rotation` do
  Sprite, transform **separado** do `flipX`. Como o eixo de inclinação vem de
  `ny` (vertical puro), o estado subindo/descendo **não** se inverte ao trocar o
  sentido horizontal. (Nota de implementação: se a rotação visual parecer
  invertida quando `flipX=true`, aplica-se `rotationAplicada = flipX ? −tiltRad :
  tiltRad` para preservar "nariz para cima ao subir" nos dois sentidos — a função
  pura expõe `tiltDeg` semântico; o `Enemy` resolve o sinal na aplicação.)
- **Magnitude ~±15°**: sutil o bastante para não distorcer a perspectiva 3/4
  (SC-002a) e perceptível o bastante para ler as subidas/descidas do caminho.
- **Rationale**: casa exatamente com a clarificação (3 estados, ~±15°) e mantém
  o espaço de estados pequeno e testável (1 orientação por faixa de inclinação).
- **Alternativas**: 5 estados / rotação suave contínua — rejeitadas na
  clarificação (risco na arte 3/4, mais estados a testar).

## D4 — Anti-flicker nas fronteiras (histerese)

- **Decisão**: aplicar **histerese** por estado: uma vez em um estado de tilt, só
  troca quando `ny` cruza o limiar com uma margem `h` (ex.: entra em "inclinado"
  a `sinθ`, só volta a "plano" abaixo de `sinθ − h`, com `h ≈ 0,05`). Idem para a
  deadzone do flip (D2).
- **Rationale**: cobre a Edge Case "fronteira entre estados de inclinação sem
  oscilação" da spec. Determinístico (depende só do estado anterior + vetor).
- **Alternativas**: suavização temporal (lerp por tempo) — rejeitada por
  introduzir dependência de tempo/estado extra sem necessidade; histerese pura
  basta e é mais fácil de testar.

## D5 — Fonte do vetor de deslocamento no Enemy

- **Decisão**: em `Enemy.step()`, após mover, computar o vetor do segmento atual
  (`path[segmentIndex+1] − posição`, ou o delta efetivo do frame). Passar para
  `resolveOrientation(prevState, dx, dy)`; guardar o estado retornado para a
  próxima chamada (histerese) e aplicar ao Sprite **apenas quando muda**.
- **Rationale**: reaproveita a lógica de caminhamento já existente; O(1) sem
  alocação; evita `setFlipX`/`setRotation` redundantes (Constitution III).
- **Alternativas**: recomputar orientação fora do step (na GameScene) —
  rejeitada, espalharia responsabilidade e re-leria path.

## D6 — Aplicação em Phaser (flip + rotação sem interferência)

- **Decisão**: `sprite.setFlipX(flipX)` (espelho horizontal, transform de escala)
  e `sprite.setRotation(rotRad)` (rotação) são independentes no Phaser; a
  animação `motoboyRide` continua tocando normalmente sob ambos. O
  dimensionamento (2,6× o raio) e a origem (0.5) permanecem.
- **Rationale**: mantém o contrato de apresentação atual; nenhuma mudança em
  depth (`DEPTH.enemy`) nem na barra de vida (fora do Sprite, sem rotação).
- **Alternativas**: pré-render de frames espelhados/rotacionados — desnecessário
  e custoso; transforms em runtime bastam.

## D7 — Onde ficam os limiares (tunning)

- **Decisão**: constantes de orientação (`θ` do tilt, `deadzone` do flip,
  histerese `h`, `tiltDeg`) centralizadas — preferência por `core/constants.ts`
  (ex.: bloco `ORIENTATION`) ou constantes locais do módulo `orientation.ts` com
  export nomeado. Não são stats de gameplay.
- **Rationale**: Constitution V/XI — valores de apresentação centralizados e
  ajustáveis sem tocar em regra. Ficam fora de `src/data/` (que é gameplay).
- **Alternativas**: hardcode espalhado — rejeitado (Práticas Proibidas).

## D8 — Animação "atirar" (uso futuro)

- **Decisão**: `ANIMS.motoboyShoot` já é registrada em `BootScene` e **não** é
  disparada nesta feature (FR-013). Nenhuma ação além de garantir que existe e
  não interfere no loop de `motoboyRide`.
- **Rationale**: escopo — sem comportamento de tiro/dano do inimigo agora.

## Resumo das constantes propostas (tunning inicial, ajustável)

| Constante | Valor inicial | Papel |
|-----------|---------------|-------|
| `tiltDeg` | 15 | Magnitude da inclinação (subindo −15 / descendo +15) |
| `tiltEnterSin` | sin(20°) ≈ 0,342 | Entra em "inclinado" |
| `tiltExitSin` | ≈ 0,29 (histerese h≈0,05) | Volta a "plano" |
| `flipDeadzone` | ~0,15 (de `nx`) | Zona neutra do flip (mantém sentido anterior) |

Nenhum `[NEEDS CLARIFICATION]` remanescente. Pronto para Fase 1.
