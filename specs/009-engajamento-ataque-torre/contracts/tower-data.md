# Contrato — Dados da torre (`src/data/towers.ts` + `src/data/contracts.ts`)

Interface que o **designer de jogo** usa. A US3 vive ou morre aqui: adicionar ou
trocar um perfil de engajamento tem que ser uma edição de dado, e nada mais.

---

## 1. Esquema (delta)

```ts
export type EngagementProfile = 'stationary' | 'pursuer';

export interface AttackBehaviorSpec {
  id: string;
  kind: AttackKind;
  targetRule: TargetRule;
  visualCuePolicy: VisualCuePolicy;
  engagement: EngagementProfile;   // ← NOVO, obrigatório (FR-001)
  projectileSpeed?: number;
  area?: AttackArea;
  statusEffects?: readonly string[];
}
```

`engagement` é **obrigatório e sem default**: uma torre nova que o esqueça não
compila. É assim que o FR-001 ("toda torre MUST declarar") deixa de ser uma
convenção e vira uma garantia.

`attackBehaviorOf()` propaga o campo para o `AttackBehavior` resolvido — sem
duplicá-lo, mantendo a fonte única que a fatia 007 estabeleceu.

## 2. Entrada do Vira-lata Caramelo (delta)

```diff
  'vira-lata-caramelo': {
    cost: 50,
-   range: 120,
+   range: 200,          // FR-006: alcance alto — é o que dá caça a encadear
    damage: 5,           // inalterado (FR-inalterado por Assumption)
    fireRate: 2,         // inalterado — segue governando o encadeamento (FR-013)
    radius: 20,
    attack: {
      id: 'vira-lata-caramelo-bite',
      kind: 'direct',
      targetRule: 'most-advanced-in-range',
      visualCuePolicy: 'onCue',
+     engagement: 'pursuer',   // FR-005
    },
```

`attackAnimation` fica **como está**. `visualSpeedPxPerSec` (520) e
`arrivalDistancePx` (22) seguem sendo apresentação — a diferença é que agora são
*injetados* no sistema de regra em vez de aplicados por ele.

## 3. Contrato de gameplay (portão de deriva)

`src/data/contracts.ts` é um portão: mudar um stat no runtime sem mudar o contrato
**falha o teste de propósito**. Como a mudança é intencional, os dois contratos
abaixo mudam junto, com `reason` e `changedBy` (D8).

```diff
  'tower.vira-lata-caramelo.base-stats': {
    acceptedValues: {
      cost: 50,
-     range: 120,
+     range: 200,
      damage: 5,
      fireRate: 2,
      radius: 20,
    },
```

`reason` a registrar — o número tem que se justificar em tempo de jogo: a 90 px/s
(velocidade contratada do motoboy), um alcance de 200 px cobre ~4,4 s de pista
contra os ~2,3 s de antes. É a janela que permite encadear 2+ mordidas sem sair do
anel; a 120 px o cão mal terminava uma mordida antes de o alvo escapar, e o
encadeamento da US1 quase nunca teria caça para acontecer. Dano e cadência ficam
intocados de propósito: esta fatia muda *como* a torre engaja, não quanto ela mata.

`changedBy`: `009-engajamento-ataque-torre`.

```diff
  'tower.vira-lata-caramelo.attack-behavior': {
    acceptedValues: {
      kind: 'direct',
      targetRule: 'most-advanced-in-range',
      visualCuePolicy: 'onCue',
+     engagement: 'pursuer',
    },
```

`reason` a acrescentar: o Caramelo é um cão solto no quintal — sai da base, encadeia
alvos dentro da coleira (o alcance, medido da base) e só volta quando o caminho
esvazia. O perfil é dado, não regra: trocar para `stationary` devolve o
comportamento do roster antigo sem tocar em uma linha de sistema.

## 4. Verificações (testes de dado)

| Verificação | Arquivo | Porquê |
|-------------|---------|--------|
| Toda entrada de `TOWER_TYPES` declara um `engagement` conhecido | `src/data/towers.test.ts` | FR-001, mesmo contra um `as` futuro |
| `attackBehaviorOf()` propaga `engagement` sem alterá-lo | `src/data/towers.test.ts` | fonte única |
| Runtime do Caramelo casa com os dois contratos aceitos | `src/data/contracts.test.ts` | portão de deriva (já existe; passa a cobrir os novos valores) |
| Trocar o perfil para `stationary` não exige mudança fora de `src/data/` | `src/systems/engagement.test.ts` | US3 / SC-006 — o teste instancia o motor com perfil estacionário e verifica ataque sem deslocamento |
