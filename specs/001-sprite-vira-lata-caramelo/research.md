# Research — Sprite da torre Vira-lata Caramelo

Fase 0. Resolve todas as decisões técnicas antes do design. Não havia
`NEEDS CLARIFICATION` na Technical Context; abaixo ficam as escolhas de
implementação e por que foram feitas.

## Estado atual verificado (baseline)

- O projeto **não carrega nenhum asset externo hoje**: `BootScene` declara
  explicitamente "não carrega assets externos"; tudo é forma Phaser + emoji.
  Não existe `preload()` em nenhuma cena, nem diretório `public/` ou `src/assets/`.
- `TEXTURES` em `src/core/constants.ts` já existe como convenção de nomes de
  textura (`tex-circle`, `tex-projectile`) — porém está **sem uso**. É o lugar
  natural para registrar a chave do sprite.
- `Tower` (`src/entities/Tower.ts`) é um `Container` com: `rangeRing` (arco),
  `body` (círculo `type.color`) e `emoji` (texto). A interatividade/colisão usa
  `Phaser.Geom.Circle(0,0,this.radius)` — **independente de qualquer imagem**.
- `UIScene.buildCard` desenha o ícone do card com `type.emoji` (fontSize 40).
- `BuildManager` mostra um preview com `previewEmoji`/`previewBody`.
- Depth da torre = `DEPTH.tower` (20), aplicado em `GameScene.placeTower` via
  `.setDepth(DEPTH.tower)`. A `Tower` não define depth internamente.
- `src/vite-env.d.ts` contém `/// <reference types="vite/client" />` → imports de
  `*.png` retornam `string` (URL) já tipados, sem declaração extra.
- Imagem fornecida: **832×1280 px, PNG RGBA**, retrato/alta, inclui base de pedra.
- Torre: `radius: 20` (diâmetro visual base ~40px), `range: 120`.

## Decisão 1 — Onde reside e como é referenciado o asset

- **Decisão**: mover/renomear para `src/assets/towers/vira-lata-caramelo.png` e
  importá-lo por `import caramelUrl from '../assets/towers/vira-lata-caramelo.png'`.
  A **chave de textura** (`TEXTURES.towerCaramelo = 'tower-vira-lata-caramelo'`) é
  o identificador estável que a gameplay conhece; o caminho vive só no import.
- **Racional**: satisfaz FR-004 (sai da raiz), FR-005 (identificador estável, não
  caminho embutido) e Constitution V. O Vite gera URL com hash → cache-busting
  automático em deploys. O mapeamento caminho→chave fica em um único ponto
  (`BootScene`), não espalhado.
- **Alternativas consideradas**:
  - `public/assets/...` referenciado por string `'assets/...'`: funciona, mas
    reintroduz caminho literal no código e não versiona cache. Rejeitado.
  - Base64 embutido: infla o bundle e some com o identificador estável. Rejeitado.

## Decisão 2 — Onde e como carregar

- **Decisão**: adicionar `preload()` à `BootScene` com
  `this.load.image(TEXTURES.towerCaramelo, caramelUrl)`. A `BootScene` roda antes
  de `GameScene`/`UIScene`, garantindo a textura pronta quando a torre/card forem
  criados (FR-006).
- **Racional**: carregamento **centralizado** (Constitution XI) no ponto de boot,
  sem espalhar `load` por entidades. `BootScene.create()` já orquestra o start das
  cenas; o Phaser só chama `create()` após o `preload` concluir.
- **Alternativas**: carregar sob demanda dentro de `Tower`/`UIScene`. Rejeitado —
  descentraliza o carregamento e cria corrida de "textura ainda não pronta".

## Decisão 3 — Tratamento de erro (sem erro silencioso)

- **Decisão**: registrar handler
  `this.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, ...)` (ou
  `LOAD_ERROR` por chave) que faz `console.error` com a chave/URL. Consumidores
  (`Tower`, card) verificam `scene.textures.exists(key)` e caem no **fallback**
  (círculo + emoji atuais) quando a textura não existe.
- **Racional**: FR-007 e Constitution X ("erros silenciosos são PROIBIDOS").
  O jogo permanece funcional; a falha fica visível no console de dev.
- **Alternativas**: `try/catch` vazio ou ignorar o evento — proibido pela
  constitution.

## Decisão 4 — Escala e enquadramento (imagem alta vs. torre pequena)

- **Decisão**: renderizar `Phaser.GameObjects.Image` com a chave e definir o
  **display size por fator relativo ao `radius`**, preservando o aspecto da
  imagem. Alvo: largura de exibição ≈ `radius * DISPLAY_SCALE` (constante de
  apresentação, ~3.0 → ~60px de largura), altura proporcional (aspecto 832/1280).
  A imagem é centrada na origem do container; um pequeno offset vertical opcional
  assenta a base de pedra sobre o ponto da torre. **Nada disso toca a colisão.**
- **Racional**: Edge case "proporção difere" + FR-003. A hitbox continua o
  `Circle(0,0,radius)`; o alcance continua `range`. Escalar por `radius` mantém a
  torre proporcional caso `radius` mude no futuro (Constitution XIII).
- **Alternativas**: recortar o cachorro da base manualmente — assumido
  desnecessário pelo spec (usar a arte como está). Esticar para caber num quadrado
  fixo — distorce; rejeitado.

## Decisão 5 — Fallback e ordem de profundidade

- **Decisão**: se `textures.exists(key)`, adicionar a `Image` no lugar de `body`
  circle + `emoji`; senão, manter exatamente o visual atual. Depth permanece
  `DEPTH.tower`, aplicado externamente em `GameScene.placeTower` como hoje
  (FR-008) — nenhuma mudança de depth interna à `Tower`.
- **Racional**: fallback garante Definição de Concluído item (8) ("não depende de
  assets finais"). Manter a atribuição de depth onde já está evita regressão de
  camadas.

## Decisão 6 — Escopo por prioridade

- **US1 (P1)** torre no campo: `Tower` renderiza o sprite. É a fatia mínima
  entregável e independente.
- **US2 (P2)** card na sidebar: `UIScene.buildCard` usa o sprite no slot do ícone,
  com fallback emoji. Entregável em seguida, reaproveitando a mesma textura.
- **Preview de construção** (`BuildManager`): coerência visual opcional — usar o
  sprite no preview com fallback emoji. Transitório; não bloqueia US1/US2.

## Riscos e mitigação

- **Textura não pronta ao construir**: mitigado por carregar na `BootScene`
  (barreira do `preload`) e por checar `textures.exists` com fallback.
- **Aparência da base de pedra sobre a grama**: ajustável só por
  `DISPLAY_SCALE`/offset de apresentação; sem impacto em regra. Validado
  visualmente no quickstart.
- **Regressão de gameplay**: coberta por SC-002 — a suíte Vitest de regras puras
  permanece inalterada e deve continuar verde.
