# Quickstart — Validação da feature

Guia para provar, de ponta a ponta, que o inimigo aparece animado e **nunca
anda de ré**. Não contém código de implementação (isso é `/speckit-tasks` +
implementação).

## Pré-requisitos

- Node + dependências instaladas (`npm install`).
- Asset presente: `src/assets/enemies/dois-caras-numa-moto-sheet.png`
  (1774×887, grade 8×2).

## 1. Regra de orientação (sem renderização)

Exercita o contrato puro (`contracts/orientation.md`) — é a regra crítica.

```bash
npm run test           # vitest run
```

**Esperado**: a suíte `orientation.test.ts` passa, cobrindo os casos C1–C10 do
contrato, incluindo o invariante "nunca andar de ré" (flipX segue o sinal de dx
fora da deadzone) e a independência flip×tilt (C10 / FR-009a).

## 2. Typecheck

```bash
npm run check          # tsc --noEmit && vitest run
```

**Esperado**: sem erros de tipo (`strict`), sem `any`/`as` de conveniência.

## 3. Validação visual no jogo

```bash
npm run dev            # abre o Vite; acessar a URL no navegador
```

Deixe uma onda de motos entrar e acompanhe uma moto do início ao fim do caminho.

**Esperado (aceite):**

- A moto aparece como **sprite animado** (ciclo de pilotar em loop), não como
  círculo + emoji (SC-001). A barra de vida fica acima do sprite (FR-003).
- Na reta inicial (indo p/ direita) o sprite olha p/ **direita**; nos trechos em
  que a rota volta p/ **esquerda**, o sprite espelha (US2 / SC-002).
- Em **nenhum** ponto a moto aparenta andar de ré (FR-007).
- Em subidas o nariz inclina p/ cima (~15°); em descidas, p/ baixo; em trechos
  planos, sem inclinação (SC-002a). Sem oscilação nervosa nas fronteiras.
- O comportamento de combate (dano, morte, recompensa) é idêntico ao anterior
  (FR-002 / SC-003).

## 4. Fallback (sheet indisponível)

Renomeie/remova temporariamente o arquivo da sheet (ou simule falha de load) e
recarregue.

**Esperado**: a moto aparece como **círculo + emoji 🛵**, percorre o caminho
normalmente, o jogo segue jogável e o console registra a falha (sem erro
silencioso) — SC-004 / FR-010. Restaure o arquivo após o teste.

## 5. Data-driven (verificação de padrão)

Revisar que adicionar outro inimigo com sheet seria apenas: nova entrada em
`src/data/enemies.ts` (+ chaves em `TEXTURES`/`ANIMS` + registro em `BootScene`),
sem código de orientação novo por inimigo (SC-005 / FR-014).

## Mapa de rastreabilidade

| Requisito | Onde se valida |
|-----------|----------------|
| FR-001, SC-001 | Passo 3 (sprite animado) |
| FR-002, SC-003 | Passo 3 (combate idêntico) |
| FR-003 | Passo 3 (barra de vida acima) |
| FR-006/007/008, SC-002 | Passos 1 e 3 (flip + nunca de ré) |
| FR-009/009a, SC-002a | Passos 1 e 3 (tilt 3 estados, independência) |
| FR-010, SC-004 | Passo 4 (fallback) |
| FR-011/012/014, SC-005 | Passos 3 e 5 |
| FR-013 | Animação `motoboyShoot` registrada, não disparada (código/BootScene) |
