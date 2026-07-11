# Research — Animacao de ataque do Vira-lata Caramelo

Fase 0. Resolve decisoes tecnicas antes do design. A Technical Context nao ficou com clarificacoes pendentes; abaixo estao as escolhas que guiam a implementacao.

## Estado atual verificado (baseline)

- O projeto usa **Phaser 3 + TypeScript + Vite** com `strict: true`.
- `BootScene` ja carrega assets de mapa e torre por imports Vite e chaves de textura em `TEXTURES`.
- `TowerType` em `src/data/towers.ts` guarda stats e `spriteKey`; a torre atual ja usa sprite com fallback para circulo + emoji.
- `Tower.update(deltaSec, enemies)` seleciona o inimigo mais avancado em alcance via `pickMostAdvancedInRange`, dispara imediatamente via callback `fire(...)` e controla cooldown por `fireRate`.
- `Projectile` aplica dano quando encosta no alvo vivo; se o alvo morrer/vazar, expira sem dano.
- `GameScene` coordena listas de `Enemy`, `Tower` e `Projectile`, mas nao conhece detalhes visuais da torre alem do construtor.
- Novos assets de caramelo ja existem em `src/assets/towers/`, incluindo imagens para preparacao, corrida e ataque.

## Decisao 1 — Modelo de animacao por etapas na definicao da torre

- **Decisão**: adicionar uma definicao opcional `attackAnimation` ao `TowerType`, composta por etapas nomeadas e ordenadas (`prepare`, `run`, `attack`). Cada etapa declara `frames`, `frameDurationMs`, comportamento (`once` ou `loopUntilArrival`) e, quando aplicavel, um cue de disparo.
- **Racional**: cumpre FR-002, FR-009, FR-010 e FR-011 com uma fonte clara. Para deixar a corrida mais fluida, basta adicionar novas chaves de textura ao array de frames da etapa `run`; nenhuma regra de combate muda.
- **Alternativas consideradas**:
  - Hardcodar nomes de sprites em `Tower`: rejeitado por acoplar apresentacao e regra.
  - Criar um registry global completo de animacoes: rejeitado por overengineering para uma unica torre agora.
  - Reaproveitar animacoes nativas do Phaser por atlas/spritesheet: rejeitado para esta fatia porque os assets atuais sao PNGs separados; pode ser evoluido depois sem mudar o contrato conceitual.

## Decisao 2 — Player visual reutilizavel, mas local a `Tower`

- **Decisão**: criar um helper de apresentacao (`TowerAttackAnimator`) usado por `Tower`. Ele recebe a definicao, o container/sprite visual, o alvo visual e callbacks tipados (`onFireCue`, `onComplete`, `onCancel`).
- **Racional**: a torre continua responsavel por cooldown, selecao de alvo e chamada de combate; o helper so avanca frames, calcula deslocamento visual e orientacao, e decide quando a etapa visual terminou. Isso preserva Constitution IV/V.
- **Alternativas consideradas**:
  - Colocar a maquina de estados inteira dentro de `Tower`: simples no curto prazo, mas mistura combate e animacao. Rejeitado.
  - Criar um `AnimationSystem` global: desnecessario para uma torre e aumenta superficie de design. Rejeitado.

## Decisao 3 — Cue de disparo durante a etapa de ataque

- **Decisão**: `Tower` inicia a animacao quando um alvo valido esta disponivel e emite `fire(...)` apenas no cue configurado da etapa `attack`. O cue e emitido no maximo uma vez por animacao. Antes do cue, a torre revalida que o alvo ainda esta vivo e dentro do alcance atual; se nao estiver, cancela/encerra a animacao sem disparar.
- **Racional**: cumpre FR-006 e edge cases de alvo eliminado/fora de alcance. A cadencia continua baseada em `fireRate`; a animacao deve ser configurada para caber no intervalo atual do caramelo e impedir sobreposicao.
- **Alternativas consideradas**:
  - Disparar imediatamente e rodar a animacao em paralelo: rejeitado porque o efeito de combate ficaria antes da etapa de ataque.
  - Fazer a animacao controlar dano diretamente: rejeitado porque sprites nao devem virar fonte de gameplay.

## Decisao 4 — Corrida visual em loop ate aproximar do alvo

- **Decisão**: a etapa `run` move somente o sprite/visual interno da torre em direcao a uma posicao visual proxima do alvo, usando `deltaSec`, `visualSpeedPxPerSec` e loop de frames. A torre/container permanece ancorada em sua posicao de construcao.
- **Racional**: cumpre FR-003, FR-013 e a assuncao de que "correr" e deslocamento visual. Como o container da torre nao se move, alcance, hover, colisao e origem de construcao permanecem estaveis.
- **Alternativas consideradas**:
  - Mover o container da torre: rejeitado por quebrar hitbox/alcance e confundir debug.
  - Usar tween com duracao fixa ignorando distancia: rejeitado porque alvos em distancias diferentes congelariam ou teriam velocidade incoerente.

## Decisao 5 — Orientacao horizontal por alvo

- **Decisão**: o visual do cachorro aplica `scaleX`/flip horizontal conforme o alvo esteja a esquerda ou direita da torre. A escala de tamanho usa um fator visual separado e nunca alimenta regras.
- **Racional**: cumpre FR-014 sem depender de assets duplicados para cada direcao. A orientacao e puramente visual.
- **Alternativas consideradas**:
  - Ter sprites separados esquerda/direita agora: rejeitado por duplicar assets e trabalho de carregamento.

## Decisao 6 — Fallback de asset e etapa incompleta

- **Decisão**: `BootScene` carrega cada sprite por chave estavel e registra falhas no loader. O player filtra frames disponiveis por `scene.textures.exists(key)`. Se uma etapa ficar sem frames validos, usa o melhor fallback disponivel: frame idle da torre, primeiro frame valido de outra etapa ou placeholder atual.
- **Racional**: cumpre FR-012 e SC-005. O jogo continua funcional e a falha fica visivel para desenvolvimento.
- **Alternativas consideradas**:
  - Lançar erro e travar partida: rejeitado pela regra de assets substituiveis.
  - Ignorar frame ausente sem log: rejeitado por "sem erro silencioso".

## Decisao 7 — Performance e ataques consecutivos

- **Decisão**: cada `Tower` pode ter no maximo uma animacao ativa. Se o cooldown permitir novo ataque enquanto a animacao anterior ainda esta rodando, a torre nao cria outra instancia; ela espera terminar/cancelar e entao tenta um novo alvo. O player reutiliza imagens internas e atualiza posicao/frame por delta.
- **Racional**: cumpre FR-008, SC-007 e Constitution III. Evita multiplos cachorros visuais para a mesma torre.
- **Alternativas consideradas**:
  - Instanciar um novo sprite para cada ataque e destruir no fim: aceitavel em baixo volume, mas aumenta risco de GC e residuos visuais. Rejeitado para esta fatia.

## Riscos e mitigacao

- **Animacao maior que o intervalo de tiro**: configurar duracoes e `visualSpeedPxPerSec` para a Vira-lata Caramelo caber no `fireInterval` atual; impedir sobreposicao por estado ativo.
- **Alvo morre antes do cue**: revalidar no cue e cancelar/retornar ao idle sem disparar.
- **Asset com nome fisico inconsistente**: esconder caminho fisico atras de `TEXTURES.*`; docs e codigo consomem chaves estaveis.
- **Regressao de gameplay por visual**: manter `range`, `radius`, `fireRate`, `damage` e `projectileSpeed` como fontes exclusivas de regra; rodar `npm run check`.
