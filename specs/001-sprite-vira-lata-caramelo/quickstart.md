# Quickstart — Validar o sprite da Vira-lata Caramelo

Guia de validação da feature. Não contém implementação — só como provar que ela
funciona ponta a ponta. Referências de design: [plan.md](./plan.md),
[data-model.md](./data-model.md), [contracts/presentation.md](./contracts/presentation.md).

## Pré-requisitos

- Node + dependências instaladas (`npm install`).
- Arquivo movido para `src/assets/towers/vira-lata-caramelo.png` e **removido da
  raiz** do repositório.

## 1. Typecheck e build (SC-005)

```bash
npm run build     # tsc --noEmit && vite build
```

**Esperado**: passa sem erros de tipo. O import de `.png` é resolvido (coberto por
`vite/client` em `src/vite-env.d.ts`).

## 2. Regras de gameplay inalteradas (SC-002)

```bash
npm test          # vitest run
```

**Esperado**: as suítes puras (`geometry`, `placement`, `targeting`, `waves`)
continuam **todas verdes** — nenhuma regra foi tocada.

## 3. Rodar o jogo

```bash
npm run dev       # abre http://localhost:5173
```

## 4. Cenários de aceite

### US1 — Torre no campo (P1)

1. Selecione a **Vira-lata Caramelo** no menu e posicione-a num local válido.
   - ✅ A torre aparece com a **ilustração do cachorro caramelo** (não o círculo
     + 🐕). — *AS1 / FR-001 / SC-001*
2. Passe o mouse sobre a torre construída.
   - ✅ O **anel de alcance** aparece centrado na torre, mesmo raio de antes. —
     *AS2 / FR-003*
3. Inicie uma onda e observe a torre atirando.
   - ✅ Projéteis saem da posição da torre; alvo, cadência e dano idênticos ao
     placeholder. — *AS3 / FR-002 / SC-002*
4. Reconhecimento (SC-003): um observador identifica o "vira-lata caramelo" pela
   arte em < 2 s, sem depender do emoji.

### US2 — Card na sidebar (P2)

1. Observe o card da Vira-lata Caramelo na sidebar.
   - ✅ O ícone do card reflete a arte da torre (coerente com o campo). Nome,
     custo e stats continuam no mesmo layout. — *US2 / FR-001*

### Depth / camadas (FR-008)

- ✅ A torre é desenhada **acima** do caminho e dos inimigos e **não** cobre a
  HUD/sidebar — mesma ordem de profundidade de antes.

## 5. Teste do caminho de falha (FR-007)

Simule o asset ausente (ex.: renomeie temporariamente o arquivo ou aponte o
import para um caminho inválido) e recarregue:

- ✅ O jogo **não trava**; a torre aparece com o **fallback** (círculo + emoji) e
  permanece totalmente funcional.
- ✅ O **console mostra um erro** de carregamento (sem falha silenciosa).

Reverta a simulação ao final.

## 6. Higiene do repositório (SC-004)

```bash
git status        # a imagem não deve mais existir na raiz
ls src/assets/towers/vira-lata-caramelo.png   # deve existir
```

## Checklist de Definição de Concluído (constitution XIV)

- [ ] Funciona no loop principal (construir → onda → combate).
- [ ] Feedback visual presente (sprite ou fallback).
- [ ] Sem regressão de performance perceptível (troca de forma é neutra).
- [ ] Contratos arquiteturais respeitados (C1–C4).
- [ ] Regras não dependem do asset (INV-1..INV-4).
- [ ] Tipos adequados; sem `any`/`as` de conveniência.
- [ ] Testes de regra continuam verdes (não havia regra nova a testar).
- [ ] Configurável via `data/towers.ts` + `constants.ts`.
- [ ] Não depende do asset final (fallback cobre a ausência).
- [ ] `npm run build` passa.
- [ ] Sem erro silencioso no carregamento.
