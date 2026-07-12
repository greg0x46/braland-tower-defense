# Phase 0 — Research

## D1. Formato final da sheet do Caramelo

**Decision**: Usar uma única sheet `8x4` com 32 frames de `256x256`, gerando um
PNG final `2048x1024`.

**Rationale**: A imagem bruta mede `1774x887` e visualmente está organizada como
8 colunas por 4 linhas. O frame `256x256` cria grade inteira para Phaser, mantém
margem interna para rabo/patas/mordida e segue o padrão já aceito de normalizar
assets gerados por IA antes do runtime.

**Alternatives considered**:
- Usar `1774x887` direto: rejeitado porque viola grade regular e faria o runtime
  aceitar recorte irregular silencioso.
- Frames `222x222`: rejeitado porque replica a irregularidade da fonte e deixa
  pouca margem para bleed.
- Sheets separadas por estado: rejeitado porque a spec prefere uma única sheet e
  isso aumentaria pontos de carregamento/falha.

## D2. Remoção do fundo checkerboard

**Decision**: Estender `tools/fix_sprite_sheet.py` com uma opção de transparência
para checkerboard RGB conectado às bordas antes da extração/recorte.

**Rationale**: O arquivo bruto é RGB, não RGBA; o checkerboard aparece como
pixels reais. `--trim-bg` remove fundo sólido, mas não remove alternância de
quadrados claros. Remover apenas pixels conectados às bordas evita apagar brilhos
internos do cachorro.

**Alternatives considered**:
- Editar a imagem manualmente: rejeitado por não ser repetível.
- Aceitar o checkerboard no jogo: rejeitado por FR-004.
- Criar script paralelo só para esta imagem: rejeitado porque o utilitário
  existente já é o ponto de preparação de sprite sheets.

## D3. Estados visuais e faixas de frames

**Decision**: Declarar os estados por frame index: idle `0`, prepare `8..15`,
run `16..23`, attack `25..29` com deixa de mordida no terceiro frame do ataque.

**Rationale**: A terceira linha tem oito poses de corrida e cumpre SC-002. A
segunda linha comunica preparação/levantar. A quarta linha contém poses de
mordida; iniciar no frame 25 evita repetir o idle como primeiro frame de ataque.
O idle fica estável no frame 0.

**Alternatives considered**:
- Animar idle com `0..7`: adiado; a spec exige estado estável, não ciclo idle.
- Usar toda a quarta linha para ataque: rejeitado porque os últimos frames voltam
  para poses neutras e enfraquecem a deixa visual.

## D4. Integração Phaser

**Decision**: Materializar a sheet com `textures.addSpriteSheet()` em `BootScene`
e permitir que `TowerAttackAnimator` chame `Image.setTexture(textureKey, frame)`.

**Rationale**: O projeto já usa contrato central de sprite sheets para o inimigo
motoboy. Reaproveitar essa forma mantém dimensões fora da lógica e permite
validar a grade antes de qualquer entidade tentar renderizar.

**Alternatives considered**:
- Criar animações no `AnimationManager` para a torre: rejeitado porque o
  `systems/engagement.ts` já dirige os estágios por fase e tempo; uma segunda
  máquina de animação duplicaria controle.
- Exportar 32 PNGs individuais: rejeitado porque voltaria ao problema de assets
  avulsos e dificultaria validação de bleed.

## D5. Fallback e observabilidade

**Decision**: Se a sheet final faltar ou for inválida, registrar erro em
`BootScene` e deixar `Tower` cair para `spriteKey` antigo ou círculo+emoji; se
um frame de estágio faltar, `TowerAttackAnimator` registra uma vez e usa fallback.

**Rationale**: A constitution proíbe erro silencioso e exige assets
substituíveis. O fallback não pode recalcular dano, alcance, cadência ou alvo.

**Alternatives considered**:
- Lançar exceção e parar a partida: rejeitado por FR-014/FR-018.
- Ignorar erro sem log: rejeitado pela constitution X.

## D6. Cobertura de testes

**Decision**: Cobrir em Vitest o contrato da sheet, a contagem mínima de frames
de corrida e a preservação dos contratos de gameplay; validar visualmente o PNG
final por preview com grade.

**Rationale**: A validade de alpha/bleed é visual e precisa de preview, mas o
contrato de grade, ranges e fallback pode ser testado sem Phaser. `npm run check`
é o gate obrigatório do projeto.

**Alternatives considered**:
- Testar com browser/Playwright nesta fatia: adiado porque a feature não cria UI
  nova e o risco principal está no contrato de asset e nos sistemas puros.
