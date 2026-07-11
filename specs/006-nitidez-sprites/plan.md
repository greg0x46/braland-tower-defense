# Implementation Plan: Nitidez dos sprites do inimigo

**Branch**: `006-nitidez-sprites` | **Date**: 2026-07-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-nitidez-sprites/spec.md`

## Summary

Melhorar a nitidez do sprite do inimigo "Dois Caras numa Moto" agora que ele e
exibido em tamanho grande: eliminar fantasma/corte de frames da sheet, reduzir
borrao de sub-pixel em movimento e preparar renderizacao mais nitida em telas
HiDPI/Retina. A feature e puramente de apresentacao: HP, velocidade, recompensa,
raio de colisao, barra de vida e combate permanecem intocados.

Abordagem tecnica: centralizar metadados de sprite sheet em um contrato tipado de
apresentacao, carregar a sheet com dimensoes derivadas/validadas contra a grade,
dimensionar sprites a partir do frame (nao da imagem inteira), alinhar o desenho
visual a pixels sem alterar a posicao logica do inimigo e configurar o canvas
Phaser para usar a resolucao do dispositivo quando viavel. O asset atual
(`1774x887`) nao divide exatamente por `8x2`; por isso o plano explicita um
fallback jogavel e um contrato para a sheet corrigida em alta resolucao.

## Technical Context

**Language/Version**: TypeScript 5.6, `strict: true`, ES2020 via Vite

**Primary Dependencies**: Phaser 3.88.2 (sprite sheets, camera/render scale),
Vite 5 (asset import/bundling), Vitest 2 (testes de regras/configuracao)

**Storage**: N/A (sem persistencia; assets estaticos em `src/assets/`)

**Testing**: Vitest (`npm run test`), typecheck/build (`npm run check`,
`npm run build`), validacao visual manual em navegador/HiDPI

**Target Platform**: Navegador com canvas Phaser (WebGL/Canvas), escala base
`GAME_WIDTH = 1580`, `GAME_HEIGHT = 720`, modo `Phaser.Scale.FIT`

**Project Type**: Single project, jogo web em `src/`

**Performance Goals**: 60 fps perceptiveis com volume de onda avancada; ajustes
de nitidez O(1) por sprite/frame; sem alocacao por frame no caminho quente

**Constraints**: manter arte ilustrada com filtragem suave (sem pixel-art/
nearest-neighbor); fallback circulo+emoji continua jogavel e registra falha;
nenhuma metrica de gameplay muda; `GameScene` permanece fina; falhas de asset nao
podem ser silenciosas

**Scale/Scope**: 1 inimigo com sheet como caso de referencia; padrao reutilizavel
para proximos inimigos com sprite sheet; ate dezenas de inimigos simultaneos

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Avaliacao |
|-----------|-----------|
| I. Gameplay em primeiro lugar | PASS - feature melhora leitura visual sem bloquear o loop principal. |
| III. Performance desde o inicio | PASS - validacao de sheet ocorre no carregamento; alinhamento visual e ajuste de render sao O(1). HiDPI tem limite por `devicePixelRatio`. |
| IV. Arquitetura desacoplada | PASS - metadados/render de sprite vivem na camada de apresentacao; dominio nao le dimensoes de asset. |
| V. Dados x logica x apresentacao | PASS - stats continuam em `src/data/enemies.ts`; dimensoes visuais ficam em config/contrato de apresentacao. |
| VI. Evolucao incremental | PASS - aproveita `BootScene`, `Enemy` e constantes atuais; adiciona apenas contrato/config necessario ao padrao de sheets. |
| VII. TypeScript rigoroso | PASS - contratos tipados para grade, frame e escala; sem `any`/`as` de conveniencia. |
| VIII. Determinismo | PASS - movimento/gameplay continuam por delta time; snap visual nao altera posicao logica. |
| IX. Testabilidade | PASS - validacao de grade/frame e preservacao de stats podem ser testadas sem renderizacao. |
| X. Observabilidade | PASS - falha de asset segue registrada; dimensao invalida deve registrar aviso/erro controlado e usar fallback ou sheet atual de forma explicita. |
| XI. Assets substituiveis | PASS - contrato documenta caminho para trocar sheet e adicionar novos inimigos sem regra por inimigo. |
| XIII. Compatibilidade visual | PASS - HiDPI tratado como camada de escala/render, mantendo enquadramento/centralizacao. |
| XIV. Definicao de concluido | PASS - inclui build/typecheck, testes aplicaveis, validacao visual e fallback. |

**Resultado do gate: PASS.** Nenhuma violacao; sem entradas em Complexity
Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/006-nitidez-sprites/
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
|   `-- sprite-sharpness.md
`-- tasks.md             # /speckit-tasks (NAO criado por /speckit-plan)
```

### Source Code (repository root)

```text
src/
|-- assets/
|   `-- enemies/
|       `-- dois-caras-numa-moto-sheet.png   # substituir por sheet 8x2 exata/alta resolucao
|-- core/
|   `-- constants.ts                         # TEXTURES/ANIMS + possivel config global de render/sheets
|-- data/
|   `-- enemies.ts                           # stats e spriteKey existentes; gameplay intocado
|-- entities/
|   `-- Enemy.ts                             # aplicar frame sizing, snap visual e fallback
|-- scenes/
|   |-- BootScene.ts                         # load/validacao central da sheet + animacoes
|   `-- GameScene.ts                         # camera/render scale; sem regra de gameplay nova
|-- systems/
|   `-- orientation.ts                       # existente; preservar orientacao dinamica
`-- main.ts                                  # config Phaser: FIT, autoCenter, HiDPI/roundPixels quando aplicavel
```

**Structure Decision**: Single project. A feature pertence a camada de
apresentacao (`BootScene`, `Enemy`, `main.ts`/camera), com configuracao
centralizada em `core/constants.ts` ou modulo pequeno de apresentacao caso a
implementacao precise separar metadados de sheets. `src/data/enemies.ts` permanece
a fonte de stats e nao recebe dimensoes de recorte que possam virar regra de
gameplay.

## Complexity Tracking

> Constitution Check passou sem violacoes - secao nao aplicavel.

## Post-Design Constitution Check

| Principio | Avaliacao pos-design |
|-----------|----------------------|
| Gameplay/dominio intocados | PASS - modelo e contratos separam posicao logica, raio de colisao e stats de apresentacao. |
| Performance | PASS - HiDPI limitado, validacao no load, sem nova alocacao por frame prevista. |
| Assets substituiveis | PASS - contrato de sheet e fallback tornam o padrao reutilizavel. |
| Testabilidade/observabilidade | PASS - quickstart exige testes de config/validacao, typecheck, captura visual e log de falha. |

**Resultado pos-design: PASS.** Nenhuma clarificacao pendente.
