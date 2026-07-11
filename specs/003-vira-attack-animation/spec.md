# Feature Specification: Animacao de ataque do Vira-lata Caramelo

**Feature Branch**: `003-vira-attack-animation`

**Created**: 2026-07-11

**Status**: Draft

**Input**: User description: "Adicionei novas imagens do vira caramelo, queremos criar a animacao de ataque, a animacao de ataque pode ser dividida entre ele levantando, correndo em direcao ao inimigo e atacando, para cada parte poderao ter varios sprites, sendo que a corrida fica em loop. Implemente uma forma de fazer essas animacoes que sejam reutilizaveis e que seja facil adicionar novas imagens posteriormente se quisermos deixar o movimento mais fluido"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver o Vira-lata Caramelo atacar com animacao completa (Priority: P1)

Ao atacar um inimigo, a torre Vira-lata Caramelo deixa de parecer estatica e
executa uma sequencia visual clara: levanta/prepara, corre em direcao ao alvo e
realiza o ataque. A animacao comunica a acao sem alterar dano, alcance,
cadencia, custo, alvo ou demais regras de gameplay.

**Why this priority**: Esta e a entrega central da feature. Sem uma animacao de
ataque perceptivel, as novas imagens nao geram valor para o jogador nem
melhoram a sensacao de responsividade da torre.

**Independent Test**: Construir uma Vira-lata Caramelo, iniciar uma onda e
observar ao menos um ataque completo, confirmando que a sequencia visual ocorre
e que as regras de combate permanecem equivalentes as atuais.

**Acceptance Scenarios**:

1. **Given** uma Vira-lata Caramelo construida e um inimigo valido dentro do
   alcance, **When** a torre inicia um ataque, **Then** o cachorro executa a
   etapa de levantar/preparar antes de correr em direcao ao alvo.
2. **Given** a etapa de preparacao concluida, **When** o alvo ainda e valido,
   **Then** o cachorro corre visualmente em direcao ao inimigo usando a animacao
   de corrida.
3. **Given** o cachorro alcancou visualmente a area do alvo, **When** o ataque
   e executado, **Then** a animacao de ataque e exibida e o efeito de combate
   ocorre sem mudar as metricas da torre.
4. **Given** a animacao de ataque terminou, **When** a torre esta pronta para
   continuar jogando, **Then** o visual retorna ao estado pronto/idle sem deixar
   residuos visuais no mapa.

---

### User Story 2 - Manter a corrida fluida enquanto o alvo esta distante (Priority: P1)

Durante o deslocamento visual ate o inimigo, a etapa de corrida se repete de
forma continua enquanto for necessario, evitando pausas ou congelamentos quando
o alvo esta mais distante.

**Why this priority**: A corrida em loop foi explicitamente solicitada e e
necessaria para que a animacao funcione com diferentes distancias ate os
inimigos sem parecer quebrada.

**Independent Test**: Observar ataques contra inimigos em diferentes distancias
e confirmar que a corrida repete suavemente ate a transicao para o ataque.

**Acceptance Scenarios**:

1. **Given** o alvo esta perto da torre, **When** a animacao de corrida inicia,
   **Then** a corrida pode executar uma repeticao curta antes do ataque sem
   congelar.
2. **Given** o alvo esta mais distante, **When** o deslocamento visual demora
   mais, **Then** os sprites de corrida continuam em loop ate o cachorro chegar
   visualmente ao alvo.
3. **Given** a corrida esta em loop, **When** chega o momento de atacar, **Then**
   a repeticao encerra de forma limpa e a etapa de ataque inicia.

---

### User Story 3 - Adicionar novos sprites sem redesenhar a animacao (Priority: P2)

Ao receber novas imagens para levantar, correr ou atacar, o time consegue
inclui-las na sequencia correspondente para deixar o movimento mais fluido,
mantendo o mesmo comportamento de jogo e a mesma organizacao conceitual das
animacoes.

**Why this priority**: O pedido exige que a solucao seja reutilizavel e facilite
melhorias futuras. Isso reduz custo de iteracao artistica e preserva a regra de
assets substituiveis do projeto.

**Independent Test**: Acrescentar um sprite extra a uma das etapas da animacao e
confirmar que ele passa a aparecer na sequencia correta, sem alterar regra de
combate nem duplicar definicoes conceituais da animacao.

**Acceptance Scenarios**:

1. **Given** existe um novo sprite de corrida, **When** ele e adicionado a etapa
   de corrida do Vira-lata Caramelo, **Then** a corrida passa a considerar esse
   sprite no loop.
2. **Given** existe um novo sprite de preparacao ou ataque, **When** ele e
   adicionado a etapa correspondente, **Then** a sequencia visual usa o novo
   sprite na ordem esperada.
3. **Given** outra torre ou variante futura precisa de animacao por etapas,
   **When** ela define suas proprias etapas visuais, **Then** o mesmo modelo
   conceitual de animacao pode ser reutilizado sem acoplar regras de gameplay a
   imagens especificas.

---

### User Story 4 - Continuar jogavel com assets incompletos (Priority: P3)

Se uma etapa tiver apenas um sprite, ou se algum sprite esperado falhar ao
carregar, o jogo continua funcional com uma apresentacao visual aceitavel e com
falha perceptivel para desenvolvimento.

**Why this priority**: A feature envolve assets novos e iterativos. O jogo nao
deve travar ou perder gameplay por causa de uma imagem ausente, mas esse fluxo e
secundario em relacao a animacao principal.

**Independent Test**: Simular uma etapa com poucos sprites ou com asset
indisponivel e confirmar que a torre ainda ataca, que ha fallback visual e que a
falha nao fica silenciosa.

**Acceptance Scenarios**:

1. **Given** uma etapa possui apenas um sprite valido, **When** a animacao chega
   nessa etapa, **Then** a etapa ainda e exibida de forma funcional.
2. **Given** um sprite esperado nao esta disponivel, **When** a animacao tenta
   usa-lo, **Then** a torre continua atacando com fallback visual e a falha e
   registrada ou sinalizada de forma util.
3. **Given** todas as imagens de uma etapa falham, **When** a torre ataca,
   **Then** a animacao usa o melhor fallback disponivel sem impedir o combate.

### Edge Cases

- **Alvo eliminado antes do cachorro chegar visualmente**: a animacao deve
  encerrar ou redirecionar de forma coerente, sem deixar o cachorro preso em
  corrida infinita ou fora da torre.
- **Alvo sai de alcance durante a animacao**: o visual nao deve criar um ataque
  invalido; o comportamento deve respeitar as regras atuais de alvo e alcance.
- **Ataques em sequencia rapida**: novas animacoes nao devem se sobrepor de forma
  confusa nem criar multiplos cachorros visuais para a mesma torre.
- **Distancias muito curtas**: a sequencia ainda deve comunicar preparacao e
  ataque, mesmo que a corrida seja minima.
- **Distancias longas**: a corrida deve permanecer em loop ate a transicao para
  ataque, sem congelar no ultimo sprite.
- **Mudanca de orientacao**: quando o alvo estiver a esquerda ou direita, o
  visual deve parecer direcionado ao inimigo e nao correr de costas.
- **Falha de assets**: imagens ausentes ou invalidas nao devem travar a partida
  nem produzir erro silencioso.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A torre Vira-lata Caramelo MUST exibir uma animacao de ataque
  composta por etapas distintas de preparacao, corrida em direcao ao alvo e
  ataque.
- **FR-002**: Cada etapa da animacao MUST aceitar um ou mais sprites, permitindo
  que a fluidez aumente quando novos sprites forem adicionados.
- **FR-003**: A etapa de corrida MUST repetir seus sprites em loop enquanto o
  deslocamento visual ate o alvo ainda nao terminou.
- **FR-004**: As etapas de preparacao e ataque MUST executar como sequencias
  finitas, com inicio e fim claros.
- **FR-005**: A animacao MUST preservar todas as regras e metricas atuais de
  gameplay da torre, incluindo dano, alcance, cadencia, custo, selecao de alvo e
  interacao de construcao.
- **FR-006**: O dano ou efeito de combate MUST ocorrer apenas em momento
  coerente com a etapa de ataque, sem ser disparado multiplas vezes por repeticao
  visual da corrida.
- **FR-007**: Ao terminar ou cancelar a animacao, o visual do cachorro MUST
  retornar ao estado pronto/idle da torre.
- **FR-008**: A torre MUST impedir sobreposicao incoerente de animacoes quando
  ataques consecutivos ocorrerem rapidamente.
- **FR-009**: O modelo de animacao MUST ser reutilizavel para futuras torres,
  variantes ou novas etapas visuais sem depender de nomes especificos das
  imagens atuais.
- **FR-010**: A associacao entre torre, etapas de animacao, ordem dos sprites e
  comportamento de repeticao MUST ter uma fonte clara e unica.
- **FR-011**: Novos sprites adicionados a uma etapa existente MUST poder ser
  incorporados sem alterar regras de gameplay ou duplicar a definicao conceitual
  da animacao.
- **FR-012**: Se um sprite ou etapa estiver indisponivel, a torre MUST continuar
  funcional com fallback visual e a falha MUST ser registrada ou sinalizada de
  forma util para desenvolvimento.
- **FR-013**: A animacao MUST manter a separacao entre apresentacao visual e
  area de colisao/interacao da torre; dimensoes de sprites MUST NOT definir
  regras de gameplay.
- **FR-014**: A animacao MUST permanecer visualmente alinhada ao alvo atual,
  incluindo direcao/orientacao adequada quando o inimigo estiver em lados
  diferentes da torre.
- **FR-015**: A feature MUST ficar limitada a animacao de ataque do Vira-lata
  Caramelo e a base reutilizavel necessaria para esse caso; novas mecanicas,
  balanceamento ou sistema completo de animacoes para todo o jogo ficam fora
  desta fatia.

### Key Entities

- **Sequencia de animacao de ataque**: conjunto ordenado de etapas visuais que
  descreve como a torre comunica um ataque ao jogador.
- **Etapa de animacao**: parte nomeada da sequencia, como preparacao, corrida ou
  ataque; possui sprites, duracao esperada e regra de repeticao.
- **Sprite de etapa**: imagem individual usada em uma etapa da animacao; pode ser
  substituida ou complementada por novas imagens para melhorar fluidez.
- **Estado visual da torre**: situacao atual da apresentacao da torre, como
  pronta/idle, preparando, correndo, atacando ou retornando.
- **Alvo visual do ataque**: inimigo usado para orientar a animacao de corrida e
  ataque, sem substituir as regras de selecao de alvo do gameplay.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% dos ataques observados com assets disponiveis, a
  Vira-lata Caramelo executa preparacao, corrida e ataque em ordem perceptivel.
- **SC-002**: Em ataques contra alvos distantes, a corrida permanece animada em
  loop durante todo o deslocamento visual, sem congelar em um sprite estatico.
- **SC-003**: Adicionar um novo sprite a uma etapa existente exige apenas uma
  atualizacao na definicao visual daquela etapa e nao altera regras de combate.
- **SC-004**: Dano, alcance, cadencia e selecao de alvo permanecem iguais aos
  valores anteriores em 100% dos testes de regressao aplicaveis.
- **SC-005**: Falhas simuladas de um sprite individual nao impedem iniciar uma
  partida, construir a torre e executar ataques.
- **SC-006**: Um observador consegue reconhecer que o Vira-lata Caramelo esta
  atacando em menos de 2 segundos apos o inicio da animacao.
- **SC-007**: Ataques consecutivos da mesma torre nao deixam mais de uma
  animacao ativa ou residuos visuais persistentes em 100% dos casos de teste
  definidos.
- **SC-008**: As verificacoes existentes do projeto continuam passando apos a
  mudanca.

## Assumptions

- O escopo desta feature e a animacao visual de ataque da torre Vira-lata
  Caramelo; balanceamento, novas torres, upgrades e mudancas de dano ficam fora
  de escopo.
- "Correr em direcao ao inimigo" representa um deslocamento visual da animacao;
  a torre continua ancorada em sua posicao de construcao e as regras de gameplay
  permanecem independentes desse deslocamento.
- Ao fim do ataque, o visual retorna ao estado pronto/idle da torre, mesmo que a
  descricao original nao tenha citado uma etapa de retorno.
- As novas imagens adicionadas pelo usuario sao consideradas assets iniciais da
  animacao, mas a solucao deve aceitar que outras imagens sejam adicionadas
  depois para deixar o movimento mais fluido.
- Cada etapa pode comecar com apenas um sprite valido; fluidez maior vem da
  adicao posterior de mais sprites.
- Fallback visual deve priorizar manter a partida jogavel e sinalizar o problema
  para desenvolvimento, nao esconder falhas de assets.
