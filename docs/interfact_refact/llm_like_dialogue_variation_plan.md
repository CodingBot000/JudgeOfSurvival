# LLM-like Dialogue Variation Refactor Plan

## 작성 목적

현재 게임의 사건 로그와 상황 설명은 `event.public_accusation`, `log.power_storm` 같은 고정 localization key를 `params`로 치환해 출력한다. 구조는 단순하고 안정적이지만, 같은 이벤트가 반복될 때 문장, 말투, 상황 묘사가 거의 동일하게 보인다.

목표는 실제 LLM을 런타임에 붙이지 않고도, 플레이어가 보기에는 “상황을 읽고 즉석에서 써준 것처럼” 느끼는 대사/묘사 시스템을 설계하는 것이다.

이 문서는 다음 작업자가 구현할 때 참고할 기준 문서다.

- 방법론 정의
- 기존 소스 변경 지점
- 신규 폴더/파일 구조
- 처음부터 다시 만드는 방식과 점진 리팩토링 방식 비교
- 단계별 구현 순서와 검증 기준

## 결론

처음부터 다시 만들 필요는 없다. 현재 코드에는 이미 다음 기반이 있다.

- seeded RNG: `src/survival-core/rng.js`
- 이벤트 가중치/쿨다운: `src/survival-core/event-runner.js`
- 구조화 로그: `state.logs = [{ key, params }]`
- 시나리오 분리 구조: `src/scenarios/lifeboat-of-greed/`
- 표시 어댑터: `src/game-adapters/display.js`

따라서 권장 방향은 **기존 이벤트 룰은 유지하고, 로그 생성 계층만 “의미 로그 -> 내러티브 렌더링”으로 확장하는 점진 리팩토링**이다.

핵심 방식:

```text
이벤트/권능 실행
  -> 수치 변경
  -> 의미 로그 기록
  -> 상황 태그 생성
  -> 후보 대사/묘사 storylet 검색
  -> seed 기반 후보 선택
  -> actor voice/tone/lexicon 적용
  -> 최종 문장 출력
```

## 현재 구조 분석

현재 관련 파일:

```text
src/scenarios/lifeboat-of-greed/rules.js
src/content/localization.js
src/game-adapters/display.js
src/survival-core/event-runner.js
```

### 현재 로그 흐름

`rules.js`에서 이벤트가 직접 고정 key를 추가한다.

```js
addLogMut(state, "event.public_accusation", actorTargetParams(actor, target));
```

`display.js`에서 고정 key를 번역한다.

```js
export function formatLogEntry(state, entry) {
  return translate(state, entry.key, entry.params || {});
}
```

`localization.js`에는 완성 문장 하나가 들어 있다.

```js
"event.public_accusation": "{actor}가 누구보다 먼저 {target}을 가리킵니다.\n{actor}: 짐 하나가 너무 많으면 우리 모두가 가라앉아."
```

### 현재 방식의 한계

- 같은 이벤트는 항상 같은 문장으로 보인다.
- 캐릭터별 말투가 없다.
- 공포, 탐욕, 신뢰, 관계 같은 상태가 문장 선택에 거의 반영되지 않는다.
- 이벤트 결과가 같아도 상황 맥락이 다르면 다른 대사가 나와야 하는데 표현 계층이 그 차이를 모른다.
- `localization.js`가 UI 번역과 이야기 문장을 모두 품고 있어 시나리오 확장 시 비대해진다.

## 목표 경험

같은 `event.public_accusation`이라도 상황에 따라 다르게 보이게 한다.

예시:

```text
그랜트가 물통 쪽으로 고개를 돌린 뒤 베일 씨를 노려봅니다.
그랜트: 더는 계산할 것도 없어. 저 사람 하나 때문에 보트가 가라앉고 있어.
```

```text
미아는 바로 이름을 말하지 않습니다. 대신 모두가 베일 씨를 보게 만듭니다.
미아: 나는 누구 탓이라고 말하고 싶지 않아요. 하지만 우리를 위험하게 만드는 사람이 있죠.
```

```text
늙은 테오의 손이 떨립니다. 누군가가 그를 향해 몸을 돌리는 순간, 보트 위의 침묵이 깨집니다.
베일 씨: 감정으로는 아무도 못 살려. 숫자로 봐야 해.
```

세 문장은 모두 “공개 비난”이라는 같은 이벤트 계열이지만 다음 차이를 반영한다.

- 발화자 성격
- 타깃 상태
- 현재 위기 종류
- 보트 환경
- 공포/탐욕/신뢰 수치
- 동맹/적대 관계
- 최근 반복된 사건

## 혼잣말 말풍선 UX 규칙

캐릭터별 혼잣말은 로그 본문이 아니라, 보트 위 캐릭터 아이콘 머리 위에 뜨는 말풍선으로 먼저 구현한다.

기본 표시 규칙:

- 말풍선은 해당 캐릭터 아이콘의 머리 위에 표시한다.
- 각 말풍선은 표시 시작 시점부터 4초 동안 유지한 뒤 사라진다.
- 말풍선에 들어갈 문구는 캐릭터별 대사 후보 중에서 랜덤하게 선택한다.
- 랜덤 선택은 seed 기반 재현성을 유지하되, 캐릭터의 현재 상태와 `dialogueSignals`에 맞는 후보를 우선한다.
- 한 화면에 동시에 표시되는 말풍선은 최대 3개까지만 허용한다.

동시 표시 관리는 공통 UI 상태로 처리한다.

```js
speechBubbles: {
  activeCount,
  items: [
    {
      id,
      characterId,
      text,
      startedAtSeconds,
      expiresAtSeconds
    }
  ],
  lastSpokenAtByCharacter
}
```

동작 규칙:

- `activeCount`는 현재 화면에 살아 있는 말풍선 개수를 나타내는 공통 카운터다.
- 새 말풍선을 띄우려 할 때 `activeCount >= 3`이면 이번 발화 시도는 건너뛴다.
- 말풍선이 4초 유지 후 만료되면 `items`에서 제거하고 `activeCount`를 다시 계산한다.
- 랜덤으로 선택된 캐릭터가 이미 말한 캐릭터라면 `lastSpokenAtByCharacter[characterId]`를 확인한다.
- 마지막 발화 시점으로부터 3초가 지나지 않았다면, 가능한 다른 캐릭터를 찾아 발화 순서를 변경한다.
- 다른 발화 가능 캐릭터가 없으면 억지로 같은 캐릭터를 다시 말하게 하지 않고 이번 발화 시도를 건너뛴다.
- 캐릭터가 사망했거나 화면에 표시되지 않는 상태라면 말풍선 후보에서 제외한다.

이 규칙의 목적은 보트 위가 항상 살아 있는 것처럼 보이게 하되, 말풍선이 화면을 덮거나 같은 캐릭터가 짧은 시간 안에 반복해서 말하는 느낌을 줄이는 것이다.

## 방법론

### 1. Template-based NLG

완성 문장 대신 슬롯이 있는 템플릿을 둔다.

```js
{
  id: "accuse.load_pressure.direct.ko",
  text: "{actorName}가 {targetName}을 향해 몸을 돌립니다.\n{actorName}: {targetLabel} 하나 때문에 {riskNoun}이 커지고 있어."
}
```

장점:

- 구현 난이도가 낮다.
- 번역과 검수가 쉽다.
- 런타임 비용이 거의 없다.

단점:

- 템플릿 수가 적으면 금방 반복감이 생긴다.

### 2. Storylet-based Dialogue

대사 후보를 “조건이 있는 작은 이야기 조각”으로 관리한다.

```js
{
  id: "public_accusation_greed_low_trust",
  intent: "accuse",
  eventIds: ["public_accusation"],
  conditions: {
    minDespair: 5,
    targetTrustBelow: 45,
    actorInfluenceAbove: 55
  },
  tags: ["social", "accusation", "fracture"],
  weight: 10,
  templateIds: [
    "accuse.low_trust.cold.ko",
    "accuse.low_trust.rational.ko"
  ]
}
```

장점:

- 이벤트와 대사를 1:1로 묶지 않고 상황별로 확장할 수 있다.
- 산악 캠프, 빌딩 재난 시나리오도 같은 엔진을 쓸 수 있다.

단점:

- 조건/가중치 설계가 필요하다.

### 3. Utility Scoring

현재 상태와 후보 대사의 적합도를 점수화한다.

점수 요소:

- 이벤트 id 일치
- 현재 phase 일치
- actor voice 일치
- target 상태 일치
- crisis tag 일치
- 최근 사용된 template penalty
- 같은 speaker 반복 penalty
- 높은 수치 변화가 있는 stat에 bonus

예시:

```js
score =
  baseWeight
  + phaseMatchBonus
  + actorVoiceBonus
  + crisisMatchBonus
  + statDeltaBonus
  - recentTemplatePenalty
  - recentPhrasePenalty;
```

### 4. Seeded Variation

문장 변주는 반드시 `state.rngSeed`를 사용한다. 그래야 같은 command replay가 같은 결과를 재현할 수 있다.

금지:

```js
Math.random()
```

권장:

```js
const selected = weightedRandomMut(state, candidates);
```

### 5. Actor Voice Profile

캐릭터마다 말투와 선호 단어를 정의한다.

```js
export const voiceProfiles = {
  chairman: {
    register: "rationalizing",
    directness: 0.8,
    empathy: 0.2,
    favoredIntents: ["justify", "accuse", "bargain"],
    phraseTags: ["calculation", "efficiency", "burden"]
  },
  nurse: {
    register: "empathetic",
    directness: 0.45,
    empathy: 0.9,
    favoredIntents: ["defend", "plead", "warn"],
    phraseTags: ["care", "line", "humanity"]
  }
};
```

이 프로필은 대사 선택에만 쓰고, 실제 생존 수치 계산에는 직접 개입하지 않는다.

### 6. Lexicon Layer

명사/동사/수식어를 언어별로 관리한다.

```js
export const lexiconKo = {
  riskNoun: {
    load_pressure: ["하중", "무게", "가라앉는 속도"],
    water: ["식수", "물통", "마지막 물"],
    hull_damage: ["균열", "선체", "갈라진 틈"]
  },
  accusationVerb: {
    cold: ["가리킵니다", "지목합니다", "몰아세웁니다"],
    indirect: ["시선을 돌리게 만듭니다", "이름을 흘립니다"]
  }
};
```

문장 전체 후보와 단어 후보를 함께 쓰면 반복감이 크게 줄어든다.

### 7. Repetition Guard

최근 출력된 narrative id, template id, phrase id를 state에 남긴다.

```js
state.narrativeMemory = {
  recentTemplateIds: [],
  recentPhraseIds: [],
  recentSpeakerIds: [],
  recentIntentIds: []
};
```

사용 방식:

- 최근 4턴 내 같은 template은 강한 penalty
- 최근 2턴 내 같은 speaker는 약한 penalty
- 같은 event id라도 다른 intent 후보가 있으면 우선 선택
- 후보가 하나뿐이면 출력은 허용하되 lexicon 변주를 강하게 적용

## 제안 구조

### 공통 엔진

```text
src/survival-core/narrative/
  narrative-engine.js
  semantic-log.js
  storylet-runner.js
  template-renderer.js
  repetition-memory.js
  context-builder.js
  token-resolver.js
```

역할:

- 특정 시나리오 단어를 몰라야 한다.
- storylet 선택, 반복 억제, seed 기반 랜덤, 템플릿 렌더링만 담당한다.

### 보트 시나리오

```text
src/scenarios/lifeboat-of-greed/narrative/
  index.js
  storylets.js
  templates.ko.js
  templates.en.js
  lexicon.ko.js
  lexicon.en.js
  voice-profiles.js
  situation-tags.js
```

역할:

- 보트 전용 단어, 장면, 대사 후보, 캐릭터별 말투를 둔다.
- 산악 캠프나 빌딩 재난은 같은 구조를 복사해 시나리오별로 구현한다.

### 표시 어댑터

```text
src/game-adapters/display.js
```

역할 변경:

- 지금은 `translate(entry.key, entry.params)`만 한다.
- 변경 후에는 `formatLogEntry`가 narrative entry면 narrative renderer를 사용하고, legacy entry면 기존 translate를 사용한다.

## 로그 데이터 구조 변경안

### 현재

```js
{
  key: "event.public_accusation",
  params: {
    actor_key: "character.soldier.name",
    target_key: "character.elder.name"
  }
}
```

### 변경 후

```js
{
  type: "narrative",
  id: "event.public_accusation",
  turn: 7,
  eventId: "public_accusation",
  intent: "accuse",
  actorId: "soldier",
  targetId: "elder",
  params: {
    actor_key: "character.soldier.name",
    target_key: "character.elder.name"
  },
  tags: ["social", "accusation", "fracture", "load_pressure"],
  deltas: {
    actor: { instigation_count: 1 },
    target: { trust: -10, fear: 8, accusation_score: 4 },
    environment: { despair: 0 }
  },
  variantSeed: 18374291
}
```

호환성:

- `key` 기반 legacy log도 계속 지원한다.
- 1단계에서는 기존 `addLogMut`를 유지하고, 새 `addNarrativeLogMut`만 추가한다.
- 모든 이벤트를 한 번에 바꾸지 말고, 반복감이 큰 이벤트부터 바꾼다.

## Narrative Context

renderer에 넘길 context는 UI가 아니라 룰 상태에서 만든다.

```js
{
  language: "ko",
  scenarioId: "lifeboat-of-greed",
  turn: 7,
  phase: "fracture",
  eventId: "public_accusation",
  intent: "accuse",
  actor,
  target,
  aliveActors,
  environment: state.boat,
  resources: {
    water: state.boat.water,
    food: state.boat.food
  },
  tags: ["social", "accusation", "fracture"],
  recentMemory: state.narrativeMemory
}
```

보트 시나리오에서는 `environment`가 `boat`를 참조해도 된다. 장기적으로는 multi-scenario refactor 문서의 방향대로 `environment/resources/actors` 일반화가 끝나면 context builder만 수정하면 된다.

## 기존 소스 변경 계획

### 1. `src/survival-core/narrative/semantic-log.js`

신규 생성.

역할:

- legacy log와 narrative log 구조를 표준화한다.
- narrative entry 생성 helper를 제공한다.

예상 API:

```js
export function createNarrativeLogEntry(state, input) {
  return {
    type: "narrative",
    id: input.id,
    turn: state.environment?.turn ?? state.boat?.turn ?? 0,
    eventId: input.eventId,
    intent: input.intent,
    actorId: input.actor?.id || input.actorId || null,
    targetId: input.target?.id || input.targetId || null,
    params: input.params || {},
    tags: input.tags || [],
    deltas: input.deltas || {},
    variantSeed: nextNarrativeSeed(state)
  };
}
```

### 2. `src/survival-core/narrative/storylet-runner.js`

신규 생성.

역할:

- storylet 후보 필터링
- utility scoring
- recent memory penalty
- seed 기반 선택

예상 API:

```js
export function selectStorylet(state, scenario, context) {
  const candidates = scenario.narrative.storylets.filter((storylet) =>
    canUseStorylet(storylet, context),
  );
  return weightedRandomMut(state, scoreStorylets(candidates, context));
}
```

### 3. `src/survival-core/narrative/template-renderer.js`

신규 생성.

역할:

- `{actorName}`, `{targetName}`, `{riskNoun}` 같은 token 해석
- 줄바꿈 포함 문장 렌더링
- template part 조합

예상 API:

```js
export function renderTemplate(template, context, tokenResolver) {
  return template.replaceAll(/\{([a-zA-Z0-9_]+)\}/g, (_, token) =>
    tokenResolver(token, context),
  );
}
```

### 4. `src/survival-core/narrative/repetition-memory.js`

신규 생성.

역할:

- 최근 사용 template/storylet/phrase/speaker 저장
- 오래된 항목 trim
- penalty 계산

주의:

- memory는 시뮬레이션 상태에 포함된다.
- 저장/로드/리플레이 대상이다.

### 5. `src/survival-core/narrative/context-builder.js`

신규 생성.

역할:

- state와 log entry를 받아 renderer용 context를 만든다.
- core는 field 이름을 모를 수 있으므로 scenario hook을 우선 사용한다.

예상 API:

```js
export function buildNarrativeContext(state, scenario, entry) {
  if (scenario.narrative?.buildContext) {
    return scenario.narrative.buildContext(state, entry);
  }
  return buildGenericContext(state, entry);
}
```

### 6. `src/scenarios/lifeboat-of-greed/narrative/index.js`

신규 생성.

역할:

- 보트 narrative manifest.

```js
import { storylets } from "./storylets.js";
import { templatesKo } from "./templates.ko.js";
import { templatesEn } from "./templates.en.js";
import { lexiconKo } from "./lexicon.ko.js";
import { lexiconEn } from "./lexicon.en.js";
import { voiceProfiles } from "./voice-profiles.js";
import { buildLifeboatNarrativeContext } from "./situation-tags.js";

export const narrative = {
  storylets,
  templates: { ko: templatesKo, en: templatesEn },
  lexicon: { ko: lexiconKo, en: lexiconEn },
  voiceProfiles,
  buildContext: buildLifeboatNarrativeContext
};
```

### 7. `src/scenarios/lifeboat-of-greed/scenario.js`

변경.

```js
import { narrative } from "./narrative/index.js";

export const lifeboatOfGreedScenario = {
  ...
  narrative,
};
```

### 8. `src/scenarios/lifeboat-of-greed/rules.js`

변경.

현재:

```js
addLogMut(state, "event.public_accusation", actorTargetParams(actor, target));
```

1단계 변경:

```js
addNarrativeLogMut(state, {
  id: "event.public_accusation",
  eventId: "public_accusation",
  intent: "accuse",
  actor,
  target,
  params: actorTargetParams(actor, target),
  tags: ["social", "accusation", phaseForTurn(state.boat.turn)]
});
```

주의:

- 이벤트 수치 변경 로직은 그대로 둔다.
- 처음에는 `public_accusation`, `exile_vote`, `secret_water_drinking`, `survival_pact`, `panic_outburst`만 narrative log로 바꾼다.
- 안정화 후 권능 로그와 환경 로그까지 확장한다.

### 9. `src/game-adapters/display.js`

변경.

현재:

```js
export function formatLogEntry(state, entry) {
  return translate(state, entry.key, entry.params || {});
}
```

변경:

```js
export function formatLogEntry(state, entry, scenario = getScenario(state.scenarioId)) {
  if (entry.type === "narrative" && scenario.narrative) {
    return renderNarrativeLog(state, scenario, entry);
  }
  return translate(state, entry.key, entry.params || {});
}
```

`renderGameToText`의 `recent_logs`도 같은 함수를 사용하므로 브라우저와 테스트 출력이 함께 바뀐다.

### 10. `src/content/localization.js`

변경 방향:

- UI 번역과 legacy fallback만 남긴다.
- 이벤트 대사 본문은 점진적으로 `src/scenarios/lifeboat-of-greed/narrative/templates.*.js`로 이동한다.
- 기존 key는 fallback으로 유지해 테스트 안정성을 보장한다.

## 보트 시나리오 Narrative 설계

### storylet 예시

```js
export const storylets = [
  {
    id: "public_accusation.direct_load_pressure",
    eventIds: ["public_accusation"],
    intents: ["accuse"],
    phases: ["fracture", "collapse"],
    tags: ["social", "accusation", "load_pressure"],
    baseWeight: 12,
    conditions: {
      minLoadPressure: 25,
      minDespair: 5
    },
    voiceTags: ["rationalizing", "authoritarian", "manipulative"],
    templateIds: [
      "ko.accuse.load.direct.1",
      "ko.accuse.load.direct.2",
      "ko.accuse.load.indirect.1"
    ]
  }
];
```

### template 예시

```js
export const templatesKo = {
  "ko.accuse.load.direct.1": {
    parts: [
      "{actorName}가 {targetName}을 향해 몸을 돌립니다.",
      "{actorName}: {targetLabel} 하나 때문에 {riskNoun}이 커지고 있어."
    ],
    tokenHints: {
      riskNoun: ["load_pressure", "hull_damage"]
    }
  },
  "ko.accuse.load.indirect.1": {
    parts: [
      "{actorName}는 바로 이름을 말하지 않습니다. 대신 모두가 {targetName}을 보게 만듭니다.",
      "{actorName}: 누군가를 탓하고 싶은 건 아니야. 하지만 우리를 가라앉히는 무게는 분명히 있어."
    ]
  }
};
```

### voice profile 예시

```js
export const voiceProfiles = {
  chairman: {
    voiceTags: ["rationalizing", "cold", "calculation"],
    preferredIntents: ["accuse", "justify", "bargain"],
    forbiddenPhraseTags: ["self_sacrifice_plain"],
    lineOpeners: ["냉정하게 보자면", "숫자로 봐야 해", "감정은 잠깐 내려놓고"]
  },
  nurse: {
    voiceTags: ["empathetic", "protective", "moral"],
    preferredIntents: ["defend", "warn", "plead"],
    lineOpeners: ["그렇게 말하면 안 돼요", "아직 사람을 숫자로 보면 안 돼요"]
  },
  influencer: {
    voiceTags: ["indirect", "manipulative", "soft"],
    preferredIntents: ["accuse", "redirect", "seed_doubt"],
    lineOpeners: ["이런 말 하고 싶진 않은데", "다들 느끼고 있잖아요"]
  }
};
```

## 이벤트별 우선 적용 대상

반복 체감이 큰 이벤트부터 적용한다.

1. `event.public_accusation`
   - actor/target이 있고 사회적 긴장 표현이 핵심이다.
   - voice profile 효과가 가장 잘 드러난다.

2. `event.exile_vote`
   - 성공/실패 분기가 있어 묘사 변주 가치가 크다.
   - 생존자들의 잔혹함을 보여주는 핵심 이벤트다.

3. `event.exile_resisted`
   - 실패한 투표 이후 관계 악화를 설명하기 좋다.

4. `event.survival_pact`
   - 동맹 형성과 배신 가능성을 암시할 수 있다.

5. `event.secret_water_drinking`
   - greed, water, trust 감소가 문장에 잘 반영된다.

6. `event.panic_outburst`
   - fear 수치와 타깃 피해를 대사/행동으로 표현하기 좋다.

7. `log.power_*`
   - 플레이어 권능 사용 결과도 매번 같은 문장이므로 2차 적용 대상으로 둔다.

## 기존 테스트 변경 계획

### `scripts/logic-smoke.mjs`

현재는 특정 문장 일부를 검사한다.

```js
assert.ok(formatLogEntry(state, state.logs.at(-1)).includes("심판이 시작됩니다"));
```

narrative 변주 후에는 완성 문장 고정 검사를 줄이고 구조 검사를 늘린다.

권장:

```js
const rendered = formatLogEntry(state, state.logs.at(-1));
assert.equal(typeof rendered, "string");
assert.ok(rendered.length > 0);
assert.ok(state.logs.at(-1).eventId || state.logs.at(-1).key);
```

대사 변주 전용 테스트는 다음을 검증한다.

- 같은 seed + 같은 command replay -> 같은 로그 문장
- 다른 seed -> 일부 로그 문장 변경
- 같은 이벤트 반복 -> template id 반복률이 낮음
- actor voice에 맞는 template tag가 선택됨
- legacy log가 여전히 출력됨

### 신규 스모크 테스트

```text
scripts/narrative-smoke.mjs
```

검증 항목:

- `public_accusation` narrative entry 렌더링
- ko/en 렌더링
- fallback 동작
- recent memory penalty
- seed 재현성

## 구현 단계

### Phase 1. Narrative 기반만 추가

목표:

- 기존 출력은 유지하면서 새 narrative log entry를 렌더링할 수 있게 한다.

작업:

- `src/survival-core/narrative/` 생성
- legacy/narrative log 호환 renderer 추가
- `scenario.narrative` manifest 연결
- `narrative-smoke.mjs` 추가

위험:

- 낮음. 기존 이벤트를 아직 바꾸지 않는다.

### Phase 2. 공개 비난 이벤트 1개 전환

목표:

- `event.public_accusation`만 narrative log로 전환한다.

작업:

- `public_accusation` storylet/template/voice profile 추가
- `addNarrativeLogMut` 도입
- `display.js` 렌더링 연결
- screenshot/text smoke로 실제 로그 확인

위험:

- 중간. `formatLogEntry`가 UI와 `renderGameToText` 모두에 영향을 준다.

### Phase 3. 사회 이벤트 묶음 전환

목표:

- actor/target 관계가 있는 이벤트를 narrative화한다.

대상:

- `event.exile_vote`
- `event.exile_resisted`
- `event.failed_exile_violent`
- `event.survival_pact`
- `event.secret_water_drinking`
- `event.panic_outburst`

작업:

- event별 intent/tags 정의
- 성공/실패 결과 tag 추가
- delta 기반 token 추가

### Phase 4. 환경/권능 로그 전환

목표:

- 플레이어가 같은 권능을 써도 상황에 따라 다른 묘사가 나오게 한다.

대상:

- `log.power_reduce_water`
- `log.power_rumor`
- `log.power_hidden_food`
- `log.power_storm`
- `event.leak_spreads`
- `event.supplies_crack_hull`
- `event.boat_damage`

작업:

- environment metric 기반 token resolver 작성
- crisis tag 계산
- 권능별 observer voice 또는 Judge voice 추가

### Phase 4-1. 보트 위 혼잣말 말풍선 MVP

목표:

- `dialogueSignals`와 캐릭터별 voice profile을 실제 보트 위 말풍선 출력으로 연결한다.

작업:

- 말풍선 전용 transient UI 상태를 추가한다.
- 캐릭터별 마지막 발화 시각을 기록한다.
- 말풍선 표시 시간 4초, 캐릭터별 재발화 제한 3초, 동시 표시 최대 3개 규칙을 적용한다.
- 랜덤으로 선택된 캐릭터가 3초 쿨다운 중이면 다른 발화 가능 캐릭터로 순서를 변경한다.
- 말풍선은 캐릭터 아이콘 머리 위에 배치하고, 화면 밖으로 넘치지 않게 위치 보정한다.
- 로그 저장 여부는 별도 결정 전까지 보류하고, 1차 MVP에서는 화면 표시만 담당한다.

검증:

- 동시에 보이는 말풍선이 3개를 넘지 않는다.
- 각 말풍선은 4초 뒤 사라진다.
- 같은 캐릭터가 마지막 발화 후 3초 이내에 다시 선택되면 다른 캐릭터가 말한다.
- 발화 가능 캐릭터가 없을 때는 말풍선 생성이 건너뛰어진다.
- 667x375, 844x390 landscape 화면에서 말풍선이 주요 버튼/패널을 가리지 않는다.

### Phase 5. localization 정리

목표:

- UI 번역과 narrative content를 분리한다.

작업:

- `src/content/localization.js`에서 narrative 본문을 scenario narrative templates로 이동
- legacy fallback key는 당분간 유지
- 새 시나리오가 `content/localization.js`를 수정하지 않아도 되게 한다.

## 처음부터 다시 만드는 방식 검토

### 장점

- `state.boat`, `state.characters`, `logs.key` 같은 legacy 구조를 한 번에 제거할 수 있다.
- `actors/environment/resources/narrative` 구조를 처음부터 깨끗하게 설계할 수 있다.
- 테스트도 새 contract 기준으로 만들 수 있다.

### 단점

- 현재 동작하는 보트 시나리오의 밸런스와 이벤트 흐름을 다시 맞춰야 한다.
- UI, smoke test, display adapter, scenario manifest를 동시에 크게 바꿔야 한다.
- seed 재현성 문제를 추적하기 어려워진다.
- 지금 게임은 룰보다 콘텐츠 밀도가 더 부족한 단계라, 엔진 전체 재작성보다 narrative layer 확장이 체감 효과가 크다.

### 판단

처음부터 다시 만들지 않는 편이 낫다.

권장 이유:

- 기존 이벤트 시스템이 이미 storylet 선택과 유사한 구조다.
- `state.logs`가 구조화되어 있어 narrative entry로 확장하기 쉽다.
- multi-scenario 분리가 시작되어 있어 시나리오별 narrative 폴더를 붙일 위치가 명확하다.
- 가장 큰 체감 문제는 룰 엔진이 아니라 “표현 다양성”이다.

예외적으로 처음부터 다시 만드는 것이 나은 경우:

- 보트 시나리오 자체를 폐기하고 완전히 다른 게임 루프로 바꿀 때
- 저장/로드, 리플레이, 멀티 시나리오 state schema를 동시에 breaking change로 바꿀 때
- runtime LLM API를 정식 핵심 기능으로 넣고 비용/지연/검열 실패까지 게임 설계에 포함할 때

현재 요구에는 해당하지 않는다.

## Runtime LLM 사용 여부

### 런타임 LLM은 비권장

이 게임의 핵심은 생존 룰, 수치, 재현 가능한 턴 진행이다. 런타임 LLM을 직접 붙이면 다음 문제가 생긴다.

- 비용 발생
- 네트워크 지연
- 같은 seed replay가 같은 문장을 보장하지 않음
- 부적절한 문장 출력 가능성
- 번역 품질과 말투 일관성 통제 어려움
- Vercel 배포 시 API key, rate limit, abuse 대응 필요

### 권장 사용 방식

LLM은 런타임이 아니라 **콘텐츠 제작 도구**로 쓰는 것이 좋다.

예:

- 캐릭터별 voice profile 초안 생성
- storylet 후보 대량 생성
- 같은 intent에 대한 템플릿 30개 생성
- 한국어/영어 변주 초안 생성
- 금칙어/말투 검수용 보조 도구

이렇게 만든 결과를 사람이 정리해서 `templates.ko.js`, `templates.en.js`에 하드코딩한다.

## 품질 기준

### 반복감 기준

최소 목표:

- 같은 이벤트가 5번 발생했을 때 완전히 같은 문장 2회 이하
- 같은 speaker가 3턴 연속 같은 말투 opener를 쓰지 않음
- actor/target이 바뀌면 문장 안에서도 그 관계 변화가 드러남

### 재현성 기준

- 같은 initial seed와 command list는 같은 로그 문장을 생성해야 한다.
- 다른 seed는 이벤트 결과가 같더라도 일부 문장이 달라질 수 있다.

### 시나리오 분리 기준

공통 narrative core에 들어가면 안 되는 단어:

- 구명보트
- 선체
- 침수
- 식수
- 폭풍
- 산악 캠프
- 저체온
- 빌딩

이 단어들은 반드시 `src/scenarios/<scenario-id>/narrative/` 아래에 둔다.

## 구현 시 주의사항

- `Math.random()` 사용 금지.
- 로그 entry에는 최종 문자열만 저장하지 않는다. 최종 문자열은 표시 계층에서 렌더링한다.
- 단, 사용된 `storyletId`, `templateId`, `variantSeed`는 저장해 디버깅 가능하게 한다.
- 초기 구현에서는 모든 이벤트를 한 번에 바꾸지 않는다.
- 기존 `translate` fallback은 유지한다.
- `renderGameToText`도 실제 UI와 같은 문장을 반환해야 한다.
- `docs/`는 현재 `.gitignore` 대상이므로 구현 계획 문서는 커밋되지 않을 수 있다.

## 최종 목표 구조

```text
src/survival-core/
  narrative/
    context-builder.js
    narrative-engine.js
    repetition-memory.js
    semantic-log.js
    storylet-runner.js
    template-renderer.js
    token-resolver.js

src/scenarios/
  lifeboat-of-greed/
    narrative/
      index.js
      lexicon.en.js
      lexicon.ko.js
      situation-tags.js
      storylets.js
      templates.en.js
      templates.ko.js
      voice-profiles.js

src/game-adapters/
  display.js
```

이 구조가 잡히면 다음 시나리오인 산악 캠프나 빌딩 재난은 공통 narrative core를 그대로 쓰고, 시나리오별 `narrative/` 폴더만 추가하면 된다.
