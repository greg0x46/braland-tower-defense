# Feature Specification: Sprite Sheet Animado do Vira-lata Caramelo

**Feature Branch**: `010-caramelo-sprite-sheet`

**Created**: 2026-07-12

**Status**: Draft

**Input**: User description: "larguei o sprite sheet bruto na home do projeto, invoca o specify do speckit passando o refactory das animacoes e preparacao do sprite sheet do caramelo e implementacao do mesmo"

## Contexto

O Vira-lata Caramelo ja tem comportamento de perseguidor, mas sua apresentacao
visual ainda usa imagens avulsas por etapa. Isso limita a fluidez da corrida e do
ataque, aumenta o risco de troca irregular entre poses e dificulta validar
nitidez de forma consistente.

Existe um sprite sheet bruto na raiz do projeto: `ChatGPT Image Jul 12, 2026,
01_14_06 AM.png`. O arquivo atual mede 1774x887 e deve ser tratado como fonte
bruta, nao como asset final pronto para runtime. A feature deve transformar esse
material em uma animacao consistente, fluida e nitida do Vira-lata Caramelo, sem
alterar dano, alcance, cadencia, regra de alvo, engajamento ou qualquer outra
regra de gameplay.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Jogador ve o caramelo animado com fluidez (Priority: P1)

Durante uma partida, o jogador posiciona o Vira-lata Caramelo e observa o cachorro
esperar, preparar o ataque, correr ate o alvo, morder e voltar/encadear alvos com
movimento visual continuo. A animacao deve parecer uma acao unica do mesmo
personagem, nao uma sequencia de imagens desconexas.

**Why this priority**: Este e o valor principal da feature. A torre ja tem
comportamento; o ganho agora e a leitura visual clara, fluida e polida desse
comportamento.

**Independent Test**: Iniciar uma partida, construir um Vira-lata Caramelo perto
do caminho e observar pelo menos um ciclo completo de preparar, correr e morder.
O cachorro deve manter identidade visual consistente, orientacao correta e
transicoes suaves entre estados.

**Acceptance Scenarios**:

1. **Given** um Vira-lata Caramelo construido e sem alvo no alcance, **When** a
   partida esta rodando, **Then** o cachorro exibe um estado ocioso/alerta
   visualmente estavel.
2. **Given** um inimigo valido entra no alcance, **When** o Vira-lata inicia o
   engajamento, **Then** o cachorro passa por uma preparacao perceptivel antes da
   corrida, sem salto brusco de escala, posicao ou identidade visual.
3. **Given** o Vira-lata esta perseguindo um alvo, **When** ele se desloca ate a
   mordida, **Then** a corrida usa multiplos frames em loop e parece continua em
   vez de alternar apenas duas poses.
4. **Given** o Vira-lata chega ao alvo, **When** a mordida acontece, **Then** o
   ataque exibe uma sequencia curta e legivel com deixa visual de impacto.

---

### User Story 2 - Artista/desenvolvedor prepara o sprite sheet bruto com seguranca (Priority: P2)

Quem cuida dos assets consegue transformar a imagem bruta deixada na raiz em um
sprite sheet final com grade regular, frames do mesmo tamanho, fundo transparente
quando aplicavel e sem vazamento visual entre celulas. O material bruto permanece
rastreavel, mas o jogo consome apenas o asset preparado e validado.

**Why this priority**: Sem preparacao do asset, a animacao pode ficar borrada,
cortada ou inconsistente. Esta historia reduz retrabalho e impede que uma imagem
bruta com dimensoes irregulares vire dependencia silenciosa do jogo.

**Independent Test**: Validar o sprite sheet preparado em uma previsualizacao com
grade: cada frame deve conter somente o cachorro daquele instante, com margem
suficiente e sem arte tocando ou atravessando as bordas da celula.

**Acceptance Scenarios**:

1. **Given** o sprite sheet bruto na raiz, **When** ele e preparado para uso no
   jogo, **Then** o resultado final tem celulas de tamanho uniforme e dimensoes
   que dividem exatamente pela quantidade declarada de colunas e linhas.
2. **Given** a previsualizacao do asset preparado, **When** a grade e exibida,
   **Then** nenhuma parte relevante do cachorro aparece cortada, invade celula
   vizinha ou encosta em bordas criticas.
3. **Given** o asset bruto possui dimensoes que nao formam grade final perfeita,
   **When** a preparacao e feita, **Then** o processo corrige enquadramento,
   escala e margens antes da integracao.

---

### User Story 3 - Jogo continua funcional se o asset animado falhar (Priority: P3)

Se o sprite sheet preparado estiver ausente, invalido ou falhar no carregamento, a
partida continua jogavel. O Vira-lata ainda ataca, persegue, morde e retorna ou
encadeia alvos com as mesmas regras aceitas; apenas a apresentacao visual cai
para um fallback claro.

**Why this priority**: Assets sao substituiveis. A feature melhora a
apresentacao, mas nao pode transformar arte em dependencia de gameplay.

**Independent Test**: Rodar o jogo sem o asset animado final disponivel e
confirmar que o Vira-lata continua causando dano, escolhendo alvos e respeitando
cadencia/alcance, com erro visivel para desenvolvimento e fallback visual no
jogo.

**Acceptance Scenarios**:

1. **Given** o sprite sheet final esta ausente, **When** a partida carrega,
   **Then** o jogo registra a falha e o Vira-lata continua jogavel com fallback.
2. **Given** o sprite sheet final possui grade invalida, **When** a partida
   carrega, **Then** a falha e reportada e nenhuma regra de combate e alterada.
3. **Given** o fallback esta ativo, **When** o Vira-lata ataca um inimigo,
   **Then** dano, alcance, cadencia, escolha de alvo e engajamento permanecem
   iguais ao comportamento aceito.

### Edge Cases

- **Sprite sheet bruto com grade irregular**: a imagem bruta nao deve ser usada
  diretamente; precisa gerar um asset final com grade regular antes da integracao.
- **Frames com tamanhos aparentes diferentes**: o cachorro deve manter tamanho e
  origem visual consistentes entre idle, preparacao, corrida e ataque.
- **Arte tocando bordas da celula**: o asset final deve reservar margem visual
  suficiente para orelhas, rabo, patas e movimento de ataque.
- **Fundo nao transparente no bruto**: o asset final deve evitar que fundo,
  grade, borda, texto ou sombra indesejada aparecam no jogo.
- **Estado sem frames suficientes**: o jogo deve usar fallback para o estado
  afetado ou para o visual inteiro, registrando a falha sem quebrar a partida.
- **Troca de direcao durante perseguicao/retorno**: a orientacao visual deve
  continuar legivel e nao pode duplicar assets de gameplay.
- **Pausa durante animacao**: a animacao congela junto com a partida e retoma do
  estado correto ao despausar.
- **Reinicio de partida com cachorro fora da base**: nao deve sobrar frame,
  posicao visual ou estado animado da partida anterior.

## Requirements *(mandatory)*

### Functional Requirements

#### Preparacao do asset

- **FR-001**: O sprite sheet bruto do Vira-lata Caramelo MUST ser tratado como
  fonte de arte, nao como asset final consumido pelo jogo.
- **FR-002**: O asset final do Vira-lata Caramelo MUST ter grade regular, com
  quantidade declarada de linhas e colunas e frames de dimensoes identicas.
- **FR-003**: Cada frame do asset final MUST preservar o cachorro inteiro dentro
  da celula, com margem visual suficiente para movimento de corrida e ataque.
- **FR-004**: O asset final MUST remover ou ocultar qualquer fundo, borda, texto,
  grade auxiliar, sombra indesejada ou arte de celula vizinha.
- **FR-005**: A preparacao do asset MUST produzir uma forma de previsualizacao ou
  validacao visual que permita conferir alinhamento, margens e ausencia de bleed
  entre frames.

#### Estados animados

- **FR-006**: O Vira-lata Caramelo MUST ter estados visuais separados para
  ocioso/alerta, preparar/levantar, correr e atacar/morder.
- **FR-007**: O estado de corrida MUST ter frames suficientes para parecer fluido
  durante perseguicao e retorno, sem depender de alternancia entre apenas duas
  imagens.
- **FR-008**: O estado de ataque MUST ter uma deixa visual clara de mordida e
  impacto.
- **FR-009**: Os estados animados MUST manter o mesmo personagem, escala
  percebida, origem visual e enquadramento, evitando salto perceptivel ao trocar
  de estado.
- **FR-010**: O estado de morte/desaparecimento do Vira-lata Caramelo fica fora
  do escopo desta feature, salvo se uma regra de jogo passar a exigir esse
  feedback visual.

#### Integracao no jogo

- **FR-011**: A apresentacao do Vira-lata Caramelo MUST consumir o asset animado
  final preparado, nao os PNGs avulsos atuais por etapa.
- **FR-012**: A troca entre estados visuais MUST seguir o estado de engajamento
  aceito: ocioso na base, preparando, perseguindo/retornando e atacando.
- **FR-013**: A animacao MUST respeitar pausa, retomada e reinicio de partida sem
  deixar residuos visuais.
- **FR-014**: Falha, ausencia ou invalidade do asset animado MUST registrar erro
  visivel para desenvolvimento e ativar fallback visual jogavel.
- **FR-015**: A feature MUST NOT alterar dano, alcance, cadencia, custo, raio de
  colisao, regra de alvo, regra de engajamento, dinheiro, vidas ou progressao de
  ondas.
- **FR-016**: A existencia, dimensoes ou frames do asset animado MUST NOT ser
  usada para calcular qualquer regra de gameplay.
- **FR-017**: A nitidez visual MUST ser preservada em movimento, evitando borrao
  perceptivel causado por enquadramento inconsistente, escala irregular ou
  posicionamento visual instavel.
- **FR-018**: A implementacao MUST manter compatibilidade com o fallback atual da
  torre para que o jogo continue apresentando feedback minimo mesmo sem asset
  final.

### Key Entities

- **Sprite Sheet Bruto do Caramelo**: imagem fonte deixada na raiz do projeto para
  orientar a arte final. Pode ter dimensoes, fundo ou grade inadequados para uso
  direto.
- **Sprite Sheet Final do Caramelo**: asset preparado, com grade regular e frames
  validos, consumido pela apresentacao do jogo.
- **Estado Visual do Caramelo**: pose animada associada a um momento do
  comportamento percebido pelo jogador: ocioso, preparar, correr ou atacar.
- **Fallback Visual**: representacao alternativa usada quando o asset animado nao
  esta disponivel ou nao e valido; preserva jogabilidade e feedback minimo.
- **Contrato de Animacao Visual**: declaracao que relaciona estados visuais a
  faixas de frames e regras de repeticao, sem carregar regras de combate.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em uma partida observavel, 100% dos ciclos completos do Vira-lata
  Caramelo exibem preparacao, corrida e ataque sem salto brusco de escala ou
  posicao visual.
- **SC-002**: A corrida do Vira-lata usa pelo menos 6 frames distintos por ciclo,
  reduzindo a leitura de "duas imagens alternadas".
- **SC-003**: A validacao visual do asset final mostra 0 frames com corte
  relevante do cachorro e 0 frames com bleed visivel de celula vizinha.
- **SC-004**: Com o asset animado removido ou invalido, o Vira-lata continua
  aplicando as mesmas regras de combate e engajamento em 100% dos cenarios de
  regressao existentes.
- **SC-005**: Um observador consegue identificar claramente, em ate 2 segundos de
  combate, quando o cachorro esta correndo e quando esta mordendo.
- **SC-006**: A feature passa nas verificacoes de tipo, testes de regressao
  aplicaveis e validacao visual manual em pelo menos um ciclo de ataque completo.

## Assumptions

- O sprite sheet bruto localizado na raiz e a fonte inicial de arte, mas pode
  precisar de recorte, redimensionamento, transparencia e reenquadramento antes
  de virar asset final.
- O formato final preferido e uma unica sheet do personagem com estados separados
  por faixas de frames, porque isso facilita consistencia visual e validacao.
- Os estados minimos para esta feature sao ocioso/alerta, preparar/levantar,
  correr e atacar/morder.
- O estado de morte do caramelo nao entra nesta fatia, porque a torre nao possui
  hoje uma regra de gameplay que faca o cachorro morrer.
- Qualquer melhoria visual deve preservar integralmente os contratos aceitos de
  gameplay do Vira-lata Caramelo.
