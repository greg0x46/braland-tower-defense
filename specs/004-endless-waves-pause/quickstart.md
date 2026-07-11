# Quickstart: Validação de Ondas Automáticas, Infinitas e Pausa

Roteiro para provar que a feature funciona ponta a ponta. Detalhes de tipos e regras
estão em [data-model.md](./data-model.md) e [contracts/](./contracts/); aqui ficam os
comandos e cenários de verificação.

## Pré-requisitos

```bash
npm install        # se ainda não instalado
```

## Verificação automatizada (regras puras)

```bash
npm run typecheck  # tsc --noEmit — deve passar (strict, sem any/as)
npm run test       # vitest — inclui os novos testes de progressão e relógio
npm run check      # typecheck + testes juntos (gate da Constituição XIV)
```

**Testes que devem existir e passar** (sem instanciar Phaser — Constituição IX):

- `src/systems/waves.test.ts` (estendido):
  - `generateWave` é determinística (mesma entrada → mesma onda).
  - **Monotonicidade (SC-004)**: `waveDifficulty` de ondas mais avançadas ≥ das
    anteriores, e estritamente crescente ao longo da progressão.
  - Ritmo: `interval` efetivo não cresce com o índice e respeita `minIntervalSec`.
  - Variedade (FR-006): com roster de 2+ tipos simulado, ondas avançadas incluem novos
    tipos sem alterar a função.
- `src/systems/waveClock.test.ts` (novo):
  - Auto-início após `initialDelaySec` → `waveStarted: 1` (FR-001).
  - Spawns saem quando `elapsed ≥ atSeconds` (FR-002, SC-002).
  - Onda só encerra quando tudo spawnado E `aliveEnemyCount === 0`.
  - Intervalo entre ondas dura `interWaveSec` e então inicia a próxima (FR-003).
  - **Pausa (FR-013, SC-007)**: parar de tickar por N frames e retomar não pula nem
    duplica spawns e preserva `remainingSec` do intervalo.
  - Roda ≥ 20 ondas sem parar (FR-004, SC-003) — nunca entra em estado terminal.

## Verificação manual (loop no navegador)

```bash
npm run dev        # abre o Vite; acesse a URL exibida
```

### Cenário 1 — Ondas automáticas e infinitas (P1)

1. Entre na partida e **não clique em nada**.
   - ✅ A onda 1 começa sozinha após o breve intervalo inicial (FR-001, SC-001).
2. Deixe as torres (ou nenhuma) limparem a onda.
   - ✅ Ao morrer o último inimigo, há uma pausa curta e a onda 2 inicia sozinha
     (FR-002/FR-003, SC-002).
3. Observe o HUD avançar: 🌊 Onda: 1 → 2 → 3 … passando de 10, 20 (FR-011).
   - ✅ Nenhuma tela de "VITÓRIA" aparece (FR-004).

### Cenário 2 — Dificuldade progressiva (P2)

1. Compare ondas distantes (ex.: 1, 8, 15) observando quantidade/ritmo/resistência.
   - ✅ Ondas avançadas têm mais inimigos e/ou mais resistência, sem passo que
     diminua a dificuldade (SC-004). (Verificação formal fica nos testes.)
2. Jogue até ≥ 20 ondas.
   - ✅ Sem travamento nem queda perceptível de FPS; sem picos instantâneos de spawn
     (SC-003, FR-012). Use o overlay de debug (dev) para conferir FPS/contagem.

### Cenário 3 — Pausar / Continuar (P3)

1. Durante uma onda ativa, clique em **⏸ Pausar**.
   - ✅ Inimigos, torres, projéteis e a contagem congelam; o rótulo vira
     **▶ Continuar** imediatamente (FR-008, SC-005).
2. Tente posicionar/selecionar uma torre enquanto pausado.
   - ✅ Nada acontece — construção bloqueada (FR-010).
3. Clique em **▶ Continuar**.
   - ✅ Tudo retoma do ponto exato (posições, vidas, dinheiro, onda, tempo restante do
     intervalo); rótulo volta a **⏸ Pausar** (FR-009, SC-006).
4. Pause **durante o intervalo entre ondas** e continue.
   - ✅ A contagem retoma de onde parou; nenhuma onda pulada/duplicada (FR-013, edge
     case de transição).
5. Alterne Pausar/Continuar várias vezes rápido.
   - ✅ Estado íntegro; total de inimigos gerados/abatidos inalterado (SC-007).
6. Deixe a base perder todas as vidas.
   - ✅ Tela de DERROTA; o botão Pausar/Continuar fica inerte (edge case). "Jogar
     novamente" reinicia da onda 1 com o loop automático.

## Definição de Concluído (Constituição XIV)

- [ ] `npm run build` passa (typecheck limpo).
- [ ] Testes de regra crítica (progressão + relógio de ondas) verdes.
- [ ] Loop automático, escalada e pausa funcionam nos cenários acima.
- [ ] Feedback visual do botão imediato; sem erro silencioso.
- [ ] Perfil de progressão e timing configuráveis via `data/` / `constants` — sem
      regra espalhada.
- [ ] Nenhuma regra nova depende de emoji/sprite.
