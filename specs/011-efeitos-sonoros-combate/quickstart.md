# Quickstart: Validacao dos Efeitos Sonoros de Combate

## Pre-requisitos

- Node/npm instalados.
- Navegador com audio habilitado.
- Volume do sistema audivel.

## Setup

```bash
npm install
npm run check
npm run dev
```

Abra a URL exibida pelo Vite.

## Validacao automatizada minima

```bash
npm run check
```

**Esperado**:

- TypeScript compila sem erro.
- Vitest passa, incluindo testes de:
  - resolucao de fallback de SFX;
  - throttling por cooldown/concorrencia/prioridade;
  - respeito ao `effectiveVolume`;
  - contratos do `EventBus` para eventos novos.

## Cenario 1 - Ataque real de torre toca som

1. Construa uma torre em alcance do caminho.
2. Inicie a onda.
3. Observe ataques reais da torre contra inimigos vivos.

**Esperado**:

- Cada ataque amostrado tem feedback sonoro curto ou fallback documentado.
- Nao ha som quando a torre esta sem alvo.
- Nao ha som extra durante recarga.
- Dano/economia permanecem iguais aos valores esperados antes da feature.

## Cenario 2 - Inimigo recebe dano, morre e vaza

1. Inicie uma onda com ao menos uma torre causando dano.
2. Ouça impactos/dano enquanto inimigos sobrevivem.
3. Deixe inimigos morrerem.
4. Em outra tentativa, construa pouco ou nada e deixe um inimigo chegar ao fim.

**Esperado**:

- Dano/impacto, derrota e vazamento sao distinguiveis.
- Vazamento tem alerta reconhecivel.
- Recompensa por morte e perda de vida por vazamento continuam corretas.
- Um inimigo morto nao emite som de vazamento.

## Cenario 3 - Mudo e volume

1. Com musica e SFX tocando, altere o volume pelo controle existente.
2. Acione mudo durante combate.
3. Desmute e ajuste volume novamente.

**Esperado**:

- Efeitos novos respeitam o volume imediatamente.
- Ao mutar, nenhum efeito novo fica audivel.
- Efeitos ja iniciados param ou ficam inaudiveis sem esperar o proximo evento.
- A trilha e os SFX usam a mesma preferencia de mudo/volume.

## Cenario 4 - Onda intensa e conforto

1. Monte pelo menos 3 torres.
2. Jogue por 2 minutos com varios inimigos em campo.
3. Continue por ate 10 minutos se possivel.

**Esperado**:

- Sons nao viram massa alta ou distorcida.
- Impactos repetidos sao limitados.
- Alertas importantes continuam perceptiveis.
- FPS/fluidez nao apresenta queda perceptivel causada por audio.
- Nenhum efeito repetitivo domina a trilha por mais de 2 segundos continuos.

## Cenario 5 - Pausa, reset e nova partida

1. Inicie combate com SFX audiveis.
2. Pause a partida.
3. Reinicie ou volte ao setup.
4. Comece uma nova partida.

**Esperado**:

- Durante pausa, nenhum novo evento de combate nasce.
- Sons da partida anterior nao tocam sobre a nova partida.
- Listeners nao duplicam: o mesmo evento nao toca duas vezes apos reset.
- A trilha sonora continua seguindo o contrato existente de `MusicManager`.

## Cenario 6 - Falha de asset SFX

1. Temporariamente force a ausencia de um asset SFX em ambiente local, ou altere a
   chave para simular falha.
2. Rode `npm run dev`.
3. Jogue uma onda completa.

**Esperado**:

- O console registra falha observavel com a chave do efeito.
- O jogo segue jogavel.
- Quando houver fallback, ele toca.
- Quando nao houver fallback, o jogo segue em silencio para aquele efeito.
- Nenhum erro visual interrompe a partida.

## Notas de implementacao (divergencias do plano)

- **A arma ganha do alvo no som de impacto.** O perfil da torre tem `attack` e
  `impact`; o do inimigo tem `damaged`, `killed` e `leaked`. Quando a torre declara
  `impact` (a chinelada da Mae de Havaianas), ele vence o `damaged` do inimigo — o
  baque do chinelo e do chinelo, nao do motoboy. Sem `impact` declarado (mordida do
  Caramelo), vale o som do alvo. Por isso `enemy-damaged` carrega `towerTypeId`: o
  impacto de um projetil acontece longe e depois do arremesso, entao quem toca o som
  precisa saber de qual torre ele saiu.
- **Assets gravados** (procedencia registrada aqui de proposito):
  - `chinelada-raw.wav` — gravacao propria do dono do projeto. Recortada em arremesso
    (0,64-1,00 s) e impacto (1,00-1,60 s).
  - `latido-raw.mp3` — "Animal Dog Bark And Growl 01" de abhisheky948 (Freesound,
    **CC0**, sem exigencia de atribuicao). Recortado no primeiro latido (0,63-0,84 s):
    o arquivo tem dois latidos e um rosnado, e o Caramelo ataca 2x/s — o latido duplo
    viraria parede de som.
  - Os dois passam por `npm run prepare:sfx`, que decodifica (via ffmpeg, quando a
    entrada e comprimida), conserta o cabecalho, mixa para mono, apara o silencio e
    normaliza o pico. O `chinelada-raw.wav` vinha com pico 0,33 e cabecalho quebrado
    (chunk `data` declarando 24.000 s); o `latido-raw.mp3` e um preview de 64 kbps —
    decodificar nao recupera qualidade, entao vale trocar pelo original se soar pobre.
- **Fallback em cadeia.** `enemy-leaked` -> `enemy-killed` -> `enemy-damaged` ->
  `tower-attack`. Se um asset faltar, o jogador ainda ouve algo em vez de silencio;
  se nenhum resolver, o evento fica mudo e a falha e registrada uma vez por chave.
- **Limitacao de repeticao** usa tres portas: cooldown por efeito, espacamento por
  categoria (`categorySpacingMs`) e teto global (`maxSimultaneous`). Prioridade
  >= `alwaysAudiblePriority` (hoje, so o vazamento) atravessa as duas ultimas — mas
  nunca o proprio cooldown.
- **Mudo tambem para o que ja esta soando.** Volume efetivo 0 nao so silencia os
  proximos: para os SFX ativos na hora (FR-005).

## Resultado da validacao automatizada (2026-07-12)

`npm run check`: 288 testes passam. **1 falha pre-existente e alheia a esta feature**
(`enemy.dois-caras-moto.base-stats`: `radius` runtime=20 vs contrato=25) — ja falhava
antes da 011 e exige decisao de design (reverter o runtime ou aceitar o contrato).

Validacao dirigindo o jogo em navegador headless (Playwright + instrumentacao da
WebAudio, contando cada `AudioBufferSourceNode.start` e identificando o efeito pela
duracao do buffer):

| Cenario | Resultado |
|---------|-----------|
| Boot | Os 4 `.wav` carregam com HTTP 200; console sem erro |
| 2 torres, 45 s de combate | 24 `tower-attack`, 24 `enemy-damaged`, 5 `enemy-killed` |
| Sem torre nenhuma, 85 s | 0 `tower-attack`, 0 `enemy-damaged` e 6 `enemy-leaked` (FR-002 e o alerta de vazamento) |
| Mudo durante o combate | 0 sons novos nos 15 s seguintes (SC-004) |
| Densidade | Pico de 4 sons numa janela de 2 s (teto global = 6) |
| So a Mae de Havaianas em campo, 50 s | 20 arremessos e 20 baques da chinelada, 10 derrotas, **zero** sons padrao de ataque/impacto (perfil por torre) |
| So o Vira-lata Caramelo em campo, 80 s | 15 latidos e 15 impactos padrao, **zero** som de ataque padrao |

**Ainda pendente (exige ouvido humano)**: a passada de conforto de 10 minutos
(SC-003/SC-005) — se os volumes relativos em `COMBAT_SFX.mix` competem com a trilha,
se o impacto repetido cansa e se o alerta de vazamento se destaca o suficiente. Os
numeros acima mostram que a limitacao funciona; eles nao dizem se soa bem.

## Checklist de aceite

- `npm run check` passa.
- Ataques reais de torre tem SFX; eventos sem alvo nao tem SFX.
- Dano, derrota e vazamento tem feedback distinguivel.
- Mudo/volume existentes controlam musica e SFX.
- Reset/shutdown nao deixam som atrasado nem listener duplicado.
- Falha de asset e observavel e nao fatal.
