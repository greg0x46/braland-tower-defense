# Quickstart — Validar o engajamento de ataque

**Feature**: 009-engajamento-ataque-torre

Como provar que a fatia funciona. Cada cenário abaixo mapeia para uma história da
spec e diz **onde** a verificação vive — regra pura ou jogo real.

## Pré-requisitos

```bash
npm install
npm run check     # tsc --noEmit && vitest run  ← portão obrigatório (Constitution)
```

`npm run check` cobre a regra (encadear, retornar, coleira, cadência, validade de
alvo). Ele **não** cobre "o cachorro parece certo na tela" — para isso, os cenários
manuais/`verify` abaixo.

---

## Cenário 1 — US1: encadeia sem voltar à base (P1)

**Regra** (`src/systems/engagement.test.ts`, sem renderização):
monta um `pursuer` com dois candidatos válidos no alcance, avança o relógio até
depois da primeira mordida e afirma que a fase seguinte é `pursuing` — nunca
`returning`/`idle` — e que a posição corrente **não** passou pela base (invariante
I5 do contrato).

**Jogo real** (skill `verify`, ou `npm run dev` e olhar):
construir um Caramelo colado na curva, iniciar a onda e observar 3+ inimigos em
fila. Esperado: entre a 1ª e a 2ª mordida o cão vai direto de um alvo ao outro.

Sinal de falha: o cão "pisca" de volta ao ponto da torre entre mordidas — é o
teleporte do `reset()` de hoje sobrevivendo ao refactor.

---

## Cenário 2 — US2: volta à base quando o alcance esvazia (P2)

**Regra**: sem candidatos válidos ⇒ fase `returning`; avançar o relógio leva a
`idle` **na posição da base** (FR-011). Injetar um candidato válido no meio do
retorno ⇒ fase volta a `pursuing` a partir da posição corrente, sem completar o
trajeto (FR-010, invariante I6).

**Jogo real**: deixar passar **um** inimigo, matá-lo dentro do alcance e cronometrar
o retorno — o cão deve estar ocioso na base em **até 2 s** (SC-004). Depois, spawnar
um novo inimigo enquanto ele volta e conferir o reengajamento imediato.

---

## Cenário 3 — US3: perfil é dado, não código (P3)

Editar **só** `src/data/towers.ts`:

```diff
-     engagement: 'pursuer',
+     engagement: 'stationary',
```

Esperado: o Caramelo volta a atacar sem sair do posto, e **nenhum arquivo de sistema
precisa mudar** (SC-006). `npm run check` continua verde — exceto o portão de
deriva de `src/data/contracts.ts`, que falha de propósito, porque o contrato aceito
diz `engagement: 'pursuer'`. Essa falha é o portão funcionando: ela obriga a decidir
entre reverter o dado ou aceitar o novo perfil no contrato.

Reverter para `'pursuer'` ao terminar.

---

## Cenário 4 — Coleira (FR-012a / SC-008)

**Regra**: alvo que atravessa a borda do alcance durante a corrida. Afirmar que a
posição do perseguidor permanece dentro do disco `|pos − base| <= range` em **todo**
passo (invariante I1) e que nenhuma mordida sai depois de o alvo cruzar a borda
(I4).

**Jogo real**: ligar o `DebugOverlay` (anel de alcance) e seguir uma onda inteira. O
cão nunca deve aparecer fora do anel — nem por um frame, nem com o alvo fugindo pela
borda.

---

## Cenário 5 — Sem asset, mesmo gameplay (FR-015)

**Regra**: derivar os timings com `attackAnimation` ausente e conferir que o motor
produz o mesmo número de `strike` no mesmo intervalo, apenas com os tempos de
fallback (nenhuma fase depende de textura).

**Jogo real**: renomear temporariamente um dos PNGs de ataque em
`src/assets/towers/`. Esperado: o console registra a textura faltante (sem erro
silencioso), o visual degrada para o fallback — e dano, encadeamento e retorno
continuam idênticos. Restaurar o arquivo depois.

---

## Cenário 6 — Pausa e fim de partida

**Jogo real**: pausar com o cão fora da base. Esperado: tudo congela (o `update` da
`GameScene` já não roda fora de `advancesGameplay`); ao despausar, o movimento
continua de onde parou — sem salto nem teleporte. Reiniciar a partida com o cão fora
da base: a torre volta ao estado ocioso na base, sem resíduo visual.

---

## Checklist de conclusão

Espelha o **Checklist de Revisão de Funcionalidades** da constitution:

- [ ] `npm run check` verde (typecheck + testes).
- [ ] Cenários 1, 2 e 4 verificados **em jogo**, não só em teste.
- [ ] Contratos de `src/data/contracts.ts` atualizados com `reason` e `changedBy`
      (range 200, `engagement: 'pursuer'`) — não afrouxados para "passar".
- [ ] Perfil `stationary` coberto por teste (FR-003: zero regressão para o roster
      futuro, que hoje nenhum playtest pegaria).
- [ ] Nenhuma regra nova dentro de `TowerAttackAnimator` — ele só desenha.
- [ ] Sem `any`/`as` de conveniência; fases como união discriminada.
- [ ] FPS estável na onda mais cheia que o jogo suporta hoje (SC-007).
