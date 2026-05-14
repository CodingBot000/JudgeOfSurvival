# Lifeboat Character Speech Bubble Implementation Plan

작성일: 2026-05-14 KST

## 1. 목적

구명보트 위 캐릭터들이 상황에 맞는 짧은 혼잣말을 말풍선으로 표시하도록 한다.

이 기능의 목적은 게임을 살아 있게 만드는 것이다. 말풍선은 핵심 UI가 아니라 분위기와 상태 전달을 보조하는 장치이므로, 버튼/상태값/카드/인물 선택을 방해하면 안 된다.

핵심 원칙:

- 말풍선은 보트 위 캐릭터 아이콘 머리 위에 표시한다.
- 말풍선은 작고 짧아야 한다.
- 말풍선 표시/소멸은 레이아웃을 절대 밀어내지 않는다.
- 동시에 표시되는 말풍선은 최대 3개다.
- 대사 본문은 반드시 별도 파일로 분리한다.
- 다국어 대응을 전제로 한국어/영어 파일 구조를 처음부터 잡는다.
- portrait는 지원 대상이 아니므로 landscape 모바일 기준으로 설계한다.

## 2. 관련 기존 기획

이 계획서는 아래 기존 문서의 2차 구현 항목을 구체화한다.

- `docs/refact/lifeboat_judge_change_history_update.md`
- `docs/refact/codex_realtime_judge_development_plan.md`
- `docs/interfact_refact/llm_like_dialogue_variation_plan.md`
- `docs/report/20260513-201342-CURRENT_IMPLEMENTATION_AUDIT.md`

기존 문서에서 확정된 전제:

- 실제 중얼거림 대사 출력은 아직 구현되지 않았다.
- `dialogueSignals` selector는 대사 세트 선택 기준으로 사용한다.
- 혼잣말은 로그 본문보다 보트 위 말풍선으로 먼저 구현한다.

## 3. 구현 범위

이번 구현에서 할 것:

- 캐릭터별 혼잣말 대사 데이터 파일 추가.
- 언어별 대사 파일 분리.
- 현재 상태와 `dialogueSignals`에 맞는 대사 후보 선택.
- 캐릭터별 랜덤 발화 스케줄링.
- 보트 위 캐릭터 아이콘 머리 위 말풍선 UI 추가.
- 말풍선 4초 유지 후 자동 제거.
- 동시 말풍선 최대 3개 제한.
- 같은 캐릭터 3초 재발화 제한.
- landscape 모바일 화면에서 UI를 해치지 않도록 작은 말풍선 스타일 적용.
- smoke/browser 검증 추가 또는 기존 테스트 확장.

이번 구현에서 하지 않을 것:

- 런타임 LLM 연결.
- 서버 기반 대사 생성.
- 대사 로그 영구 저장.
- 모든 캐릭터별 수백 개 대사 작성.
- portrait 대응.
- 음성/사운드 출력.
- 말풍선 클릭 인터랙션.

## 4. 권장 파일 구조

대사 본문은 UI 컴포넌트나 룰 파일에 직접 쓰지 않는다.

권장 신규 구조:

```txt
src/scenarios/lifeboat-of-greed/dialogue/
  index.js
  lines.ko.js
  lines.en.js
  line-sets.js
  select-dialogue-line.js
```

역할:

- `lines.ko.js`: 한국어 대사 본문.
- `lines.en.js`: 영어 대사 본문.
- `line-sets.js`: setKey, 캐릭터, 상황 tag, weight 메타데이터.
- `select-dialogue-line.js`: 현재 상태와 캐릭터 상태에 맞는 대사 선택.
- `index.js`: 시나리오에서 사용할 public export 정리.

UI 쪽 권장 구조:

```txt
src/ui/speech-bubbles/
  SpeechBubbleLayer.jsx
  speech-bubble-scheduler.js
```

단, 현재 UI가 `App.jsx` 중심으로 되어 있으므로 1차 구현에서는 `App.jsx`에 얇게 연결하고, 말풍선 표시 컴포넌트와 스케줄러만 별도 파일로 분리해도 된다.

## 5. 대사 데이터 설계

대사는 line id와 언어별 본문을 분리한다.

예시:

```js
// lines.ko.js
export const dialogueLinesKo = {
  "chairman.water_low.1": "물은 감정으로 늘어나지 않아.",
  "nurse.panic_high.1": "숨을 천천히 쉬어요. 아직 끝난 게 아니에요.",
  "soldier.boat_breaking.1": "움직이지 마. 한쪽으로 쏠리면 끝장이야."
};
```

```js
// lines.en.js
export const dialogueLinesEn = {
  "chairman.water_low.1": "Feelings will not make more water.",
  "nurse.panic_high.1": "Breathe slowly. This is not over yet.",
  "soldier.boat_breaking.1": "Do not move. If we lean too far, we are done."
};
```

대사 세트 메타데이터 예시:

```js
export const dialogueLineSets = [
  {
    id: "chairman.water_low.1",
    characterId: "chairman",
    setKeys: ["water_low", "resource_scarcity"],
    tags: ["calculation", "cold"],
    weight: 10,
    maxUrgency: "high"
  }
];
```

원칙:

- line id는 모든 언어 파일에서 동일해야 한다.
- UI는 line id를 받고 현재 언어 파일에서 본문을 찾는다.
- 번역 누락 시 한국어 fallback을 허용하되, 테스트에서 누락 목록을 알려야 한다.
- 한 줄은 짧게 작성한다.
- 모바일 말풍선에는 기본적으로 1-2줄만 표시한다.
- 긴 문장은 말풍선용 대사가 아니라 로그/이벤트 내러티브로 분류한다.

## 6. 발화 상태 설계

말풍선은 게임 진행 결과를 바꾸지 않는 transient UI 상태다.

권장 상태:

```js
speechBubbles: {
  activeCount,
  items: [
    {
      id,
      characterId,
      lineId,
      text,
      anchor,
      startedAtMs,
      expiresAtMs
    }
  ],
  lastSpokenAtByCharacter: {
    [characterId]: timestampMs
  }
}
```

상태 위치:

- 1차 구현은 React local state로 충분하다.
- 저장/불러오기 대상에는 포함하지 않는다.
- `render_game_to_text`에는 디버그용 요약만 포함할 수 있다.
- 재현성 테스트가 필요하면 selection seed와 simulation elapsed time을 함께 사용한다.

## 7. 발화 스케줄링 규칙

기본 규칙:

- 말풍선은 4초 동안 유지한다.
- 한 화면에 동시에 보이는 말풍선은 최대 3개다.
- `activeCount >= 3`이면 새 발화를 만들지 않는다.
- 같은 캐릭터는 마지막 발화 시점으로부터 3초가 지나야 다시 말할 수 있다.
- 랜덤으로 선택된 캐릭터가 3초 쿨다운 중이면 다른 발화 가능 캐릭터를 찾는다.
- 다른 발화 가능 캐릭터가 없으면 이번 발화는 스킵한다.
- 사망 캐릭터는 후보에서 제외한다.
- 현재 보트 위에 아이콘이 표시되지 않는 캐릭터도 후보에서 제외한다.

스케줄링 주기:

- 매 프레임이 아니라 짧은 interval 기반으로 평가한다.
- 권장 발화 평가 간격은 900-1500ms 범위다.
- 실제 발화 확률은 상태에 따라 낮게 유지한다.
- 위기 상황일수록 발화 확률을 올릴 수 있지만, UI가 시끄러워지지 않게 최대 3개 제한을 우선한다.

발화 후보 선택:

1. 살아 있고 화면에 보이는 캐릭터 목록을 만든다.
2. 최근 3초 안에 말한 캐릭터를 제외한다.
3. `dialogueSignals`와 캐릭터별 상태에서 `mutterSetKeys`를 얻는다.
4. 캐릭터 id와 setKey가 맞는 line 후보를 찾는다.
5. weight 기반 랜덤으로 line id를 선택한다.
6. 최근에 같은 line id가 반복되었으면 penalty를 적용한다.
7. 말풍선 item을 생성하고 `lastSpokenAtByCharacter`를 갱신한다.

## 8. UI 배치 규칙

말풍선은 보트 시각화 위에 absolute overlay로 배치한다. DOM 흐름에 참여하지 않으므로 레이아웃을 밀어내지 않는다.

배치 기준:

- anchor는 캐릭터 아이콘 중심 상단이다.
- 말풍선은 아이콘 위쪽으로 뜬다.
- 말풍선이 보트/scene panel 밖으로 나가면 x축 위치를 보정한다.
- 위쪽 공간이 부족하면 조금 옆으로 밀거나 표시를 스킵한다.
- event overlay, modal, debug panel이 열려 있으면 새 말풍선 생성을 멈춘다.
- 말풍선은 pointer-events를 받지 않는다.

크기/가독성 기준:

- 글씨 크기는 작게 유지한다.
- 권장 font-size: 10px-11px.
- line-height: 1.25-1.35.
- 최대 2줄 표시.
- 넘치는 텍스트는 clamp 처리한다.
- 말풍선 최대 너비는 캐릭터 간격과 화면폭에 맞춰 제한한다.
- 667x375 landscape에서도 버튼과 카드 패널을 가리지 않아야 한다.

스타일 기준:

- 배경은 반투명 dark panel 계열.
- 테두리는 낮은 대비.
- 강한 색상이나 큰 애니메이션을 피한다.
- opacity fade-in/fade-out은 가능하지만 위치 변화 애니메이션은 최소화한다.
- z-index는 보트 캐릭터보다 위, modal/event overlay보다 아래다.

이 기능은 플레이어가 반드시 읽어야 하는 정보가 아니다. 읽히면 좋고, 놓쳐도 게임 진행 이해에 문제가 없어야 한다.

## 9. 대사 세트 초안

초기에는 세트 수를 작게 시작한다.

권장 setKey:

```txt
water_low
food_low
boat_breaking
panic_personal
distrust_group
selfish_calculation
moral_grief
hidden_resource_secret
hostile_relationship
hope_rescue
collapse_phase
```

캐릭터별 최소 대사 수:

- 각 캐릭터별 공통/중립 대사 3개.
- 주요 setKey별 1-2개.
- 전체 1차 목표는 40-70개 정도로 제한한다.

예시 방향:

- `chairman`: 계산, 합리화, 손익, 부담.
- `nurse`: 진정, 보호, 죄책감, 생명.
- `soldier`: 질서, 위치, 위험 통제.
- `influencer`: 눈치, 여론, 부드러운 의심.
- `elder`: 체력 저하, 기억, 체념, 조용한 양보.
- `stowaway`: 불신, 방어, 들키지 않으려는 긴장.

## 10. 기존 시스템과의 연결

재사용할 것:

- `dialogueSignals`: 전역/캐릭터별 대사 세트 선택 기준.
- 기존 seed/RNG 유틸: 발화와 대사 선택 재현성.
- 캐릭터 위치/보트 아이콘 렌더링: 말풍선 anchor 계산.
- 현재 language 상태: `lines.ko.js` / `lines.en.js` 선택.

분리할 것:

- 이벤트 narrative log와 혼잣말 말풍선은 저장 목적이 다르다.
- narrative log는 사건 기록이고, 말풍선은 transient ambient UI다.
- 혼잣말 문구는 `localization.js`에 넣지 않는다.
- UI 컴포넌트 안에 대사 문자열을 직접 넣지 않는다.

## 11. 구현 순서

1. 대사 파일 구조 추가.
2. 한국어/영어 line 파일과 line set 메타데이터 추가.
3. 언어별 line resolver 추가.
4. `dialogueSignals` 기반 후보 선택 함수 추가.
5. speech bubble transient state와 scheduler 추가.
6. 보트 캐릭터 아이콘 위치를 anchor로 받을 수 있게 UI 연결.
7. `SpeechBubbleLayer` 추가.
8. 4초 만료/최대 3개/캐릭터별 3초 쿨다운 적용.
9. modal/event overlay/debug open 상태에서 발화 중지.
10. small landscape CSS 조정.
11. smoke 테스트 추가.
12. Playwright로 667x375, 844x390 landscape 확인.

## 12. 테스트 계획

데이터 테스트:

- 모든 line id가 현재 언어 파일에 존재한다.
- 영어 누락 시 한국어 fallback이 동작한다.
- line set의 characterId가 실제 캐릭터 id와 맞는다.
- line set의 setKey가 허용 목록에 속한다.

스케줄러 테스트:

- 동시에 active item이 3개를 넘지 않는다.
- 4초가 지난 item은 제거된다.
- 같은 캐릭터는 3초 안에 다시 말하지 않는다.
- 쿨다운 중인 캐릭터가 선택되면 다른 캐릭터가 선택된다.
- 후보 캐릭터가 없으면 생성하지 않는다.

브라우저 테스트:

- 667x375 landscape에서 말풍선이 footer/action bar/card panel을 가리지 않는다.
- 844x390 landscape에서 보트 위 캐릭터 머리 위에 붙어 보인다.
- event overlay가 열려 있을 때 새 말풍선이 생성되지 않는다.
- 일시정지 상태에서 말풍선을 계속 생성할지 여부는 UX 결정에 따른다. 1차 권장은 pause 중 새 발화 중지다.

실행 검증:

```txt
npm run architecture
npm run dialogue-smoke
npm run smoke
npm run build
```

필요하면 신규 스크립트:

```txt
scripts/speech-bubble-smoke.mjs
npm run speech-bubble-smoke
```

## 13. 수용 기준

구현 완료 조건:

- 대사 본문이 별도 파일로 분리되어 있다.
- 한국어/영어 대사 파일 구조가 있다.
- UI/logic 파일에 대사 본문이 직접 하드코딩되지 않는다.
- 보트 위 캐릭터 아이콘 머리 위에 말풍선이 뜬다.
- 말풍선은 4초 뒤 사라진다.
- 동시에 3개를 초과하지 않는다.
- 같은 캐릭터가 3초 안에 연속 발화하지 않는다.
- 말풍선 표시가 레이아웃을 밀어내지 않는다.
- 글씨 크기가 작고, 최대 2줄 내에서 표시된다.
- landscape 모바일 화면에서 주요 UI를 해치지 않는다.
- 빌드와 smoke 테스트가 통과한다.

## 14. 위험 요소와 대응

### 말풍선이 UI를 가림

대응:

- scene panel 내부에만 표시한다.
- max width와 line clamp를 강제한다.
- 버튼/카드 패널 영역과 겹치면 위치 보정하거나 생성 스킵한다.

### 대사가 너무 자주 나와 산만함

대응:

- activeCount 최대 3개 제한.
- 캐릭터별 3초 쿨다운.
- 전역 발화 interval을 너무 짧게 잡지 않는다.
- 상황이 평온할 때 발화 확률을 낮춘다.

### 다국어 추가 시 누락 발생

대응:

- line id 기반 구조 사용.
- fallback은 허용하되 테스트에서 누락 목록을 출력한다.
- 대사 추가 PR/커밋 시 데이터 smoke를 필수로 돌린다.

### App.jsx 비대화

대응:

- 문자열 데이터, 선택 로직, scheduler, UI layer를 분리한다.
- App.jsx에는 state 연결과 props 전달만 남긴다.

## 15. 구현 판단 메모

말풍선은 게임의 분위기를 살리는 요소이지, 핵심 조작 UI가 아니다. 따라서 “많이 보이게”보다 “거슬리지 않게”가 우선이다.

처음에는 대사 수보다 동작 품질을 먼저 맞춘다.

- 짧다.
- 작다.
- 겹치지 않는다.
- 반복되지 않는다.
- 사라질 때 레이아웃을 흔들지 않는다.

이 기준을 만족한 뒤 캐릭터별 대사량을 늘린다.
