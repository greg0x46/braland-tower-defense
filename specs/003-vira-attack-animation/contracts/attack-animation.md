# Contrato de Apresentação — Animacao de ataque da torre

Este projeto e um jogo front-end; nao ha API de rede nesta feature. As interfaces relevantes sao contratos internos entre dados, carregamento de assets, `Tower`, o player visual e o callback de combate.

## C1 — Contrato de carregamento de sprites

**Produtor**: `BootScene.preload()`  
**Consumidores**: `Tower`, `TowerAttackAnimator`, validacao visual/manual

| Item | Contrato |
|---|---|
| Chaves | Todas as imagens da animacao usam chaves estaveis em `TEXTURES` ou estrutura equivalente tipada. |
| Origem | Caminhos fisicos aparecem apenas em imports de `BootScene`. |
| Momento | Assets carregados antes de `GameScene.create()` criar torres. |
| Sucesso | `scene.textures.exists(textureKey) === true` para frames disponiveis. |
| Erro | Falha de load registra `console.error` com chave/URL; jogo nao lanca nem trava. |
| Pos-erro | Consumidores filtram frame ausente e usam fallback. |

Garantia: regras de gameplay nunca consomem caminhos de arquivo nem dimensoes dos sprites.

## C2 — Contrato da definicao de animacao

**Produtor**: `src/data/towers.ts`  
**Consumidores**: `Tower`, `TowerAttackAnimator`, tarefas futuras de conteudo

Para a Vira-lata Caramelo, `TowerType.attackAnimation` e a fonte unica para:

- ordem das etapas;
- lista ordenada de frames por etapa;
- duracao de cada frame;
- comportamento de repeticao (`once` ou `loopUntilArrival`);
- velocidade e distancia de chegada visual;
- frame/cue em que o callback de disparo pode ocorrer.

Invariantes:

| Aspecto | Obrigatorio |
|---|---|
| Preparacao | Etapa finita antes da corrida. |
| Corrida | Etapa em loop ate chegada visual; nunca congela no ultimo frame enquanto ainda desloca. |
| Ataque | Etapa finita apos chegada visual; emite no maximo um cue de disparo. |
| Novos frames | Adicionar frame a uma etapa exige apenas atualizar o array daquela etapa e carregar a textura. |
| Reuso | Outra torre pode definir suas proprias etapas usando o mesmo formato. |

## C3 — Contrato do player visual (`TowerAttackAnimator`)

**Entrada**: `AttackAnimationDefinition`, imagem/placeholder visual da torre, alvo visual, `deltaSec`  
**Saida**: estado visual, frame atual, offset visual, orientacao e eventos de ciclo

Regra operacional:

```text
start(target):
  if animation already active: reject or cancel according to Tower policy
  set state = preparing
  reset visual offset and fireCue flag

update(deltaSec):
  advance current stage by deltaSec
  update frame by frameDurationMs
  if stage is run:
    move visual child toward target/lastKnown position by visualSpeedPxPerSec * deltaSec
    loop frames until arrivalDistancePx reached
  if attack stage reaches fireCueFrameIndex and cue not emitted:
    emit onFireCue once
  when final stage completes:
    return visual to idle and emit onComplete

cancel():
  stop active animation
  reset visual to idle/fallback
  emit onCancel if needed
```

Invariantes:

- O container da torre permanece em sua posicao de construcao.
- Offset/flip/scale do sprite sao apresentacao, nao regra.
- O player nao chama `Enemy.takeDamage()` e nao cria `Projectile` diretamente.
- Ao final/cancelamento, nao restam sprites extras fora da torre.

## C4 — Contrato de gameplay preservado (`Tower`)

**Produtor**: `Tower.update()`  
**Consumidores**: `GameScene`, `Projectile`, sistemas puros

| Aspecto | Fonte obrigatoria |
|---|---|
| Alcance | `def.range` |
| Dano | `def.damage` |
| Cadencia | `def.fireRate` / `fireInterval` |
| Velocidade do projetil | `def.projectileSpeed` para torres que ainda usam projetil visual |
| Raio/hitbox | `def.radius` |
| Selecao de alvo | `pickMostAdvancedInRange(...)` |

Invariantes:

- Sprite/frame/dimensao visual nao altera nenhum item acima.
- `setInteractive` e hover/range continuam baseados em `radius`/`range`.
- A animacao nao cria novo alvo nem substitui a regra de mira.

## C5 — Contrato do cue de disparo

**Produtor**: `TowerAttackAnimator` (evento visual)  
**Consumidor**: `Tower` (revalida e chama `fire`)

Regra:

```text
onFireCue(target):
  if target.status !== 'alive': cancel and do not fire
  if distance(tower, target) > def.range: cancel and do not fire
  target.takeDamage(def.damage)
  mark cue emitted for this animation
```

Invariantes:

- Um ataque visual aplica o dano no maximo uma vez.
- A corrida em loop nunca emite dano.
- Cancelamentos por alvo invalido nao deixam cooldown/estado visual preso.
- A animacao do Vira-lata Caramelo nao cria projetil visual; o dano acontece no cue de ataque apos revalidacao.

## C6 — Contrato de fallback

| Falha | Comportamento esperado |
|---|---|
| Um frame ausente | Log/sinalizacao util; etapa usa frames validos restantes. |
| Etapa com um frame valido | Exibe esse frame; se for corrida, repete o mesmo frame. |
| Etapa sem frames validos | Usa `fallbackSpriteKey`, `spriteKey` idle ou placeholder circulo+emoji. |
| Todos os assets de animacao ausentes | Torre continua atacando; visual fica idle/fallback e o erro e perceptivel em dev. |

## C7 — Contrato de aceite manual

Um build e considerado conforme quando:

- A Vira-lata Caramelo mostra preparacao, corrida e ataque em ordem contra alvo valido.
- A corrida repete frames enquanto a distancia visual nao termina.
- Ataques consecutivos nao deixam mais de um cachorro visual por torre.
- Alvo morto/fora de alcance antes do cue nao gera ataque invalido nem corrida infinita.
- `npm run check` passa.
