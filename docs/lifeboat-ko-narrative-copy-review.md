# Lifeboat KO Narrative Copy Review

작성일: 2026-05-12 KST

## 범위

검토 대상은 한국어 내러티브 출력에 직접 영향을 주는 문장이다.

- `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js`
- `src/scenarios/lifeboat-of-greed/localization.ko.js`
- `src/scenarios/lifeboat-of-greed/narrative/lexicon.ko.js`

이 문서는 검토용 제안서다. 아직 소스 문장은 변경하지 않았다.

## 공통 문제

### 1. 토큰 뒤 고정 조사

현재 렌더러는 `{actorName}`, `{targetName}`, `{groupName}`, `{riskNoun}`, `{silence}`, `{damageSound}` 뒤의 조사를 자동 보정하지 않는다. 그래서 `{actorName}이`는 이름에 따라 `클라라이`, `미아이`, `늙은 테오이`처럼 깨질 수 있다.

제안 방향:

- 문장을 바꿀 때 가능하면 토큰 바로 뒤에 `이/가/은/는/을/를/와/과`를 붙이지 않는다.
- 이름 토큰은 `"{actorName}: ..."` 또는 `"{actorName}, ..."` 형태로 빼는 쪽이 안정적이다.
- 명사 토큰은 `{riskNoun}이`보다 `위험은`, `물이`, `보트 안에는`처럼 문맥상 고정 명사로 바꾸는 편이 자연스럽다.

특히 `templates.ko.js`의 4, 41, 107, 210, 300, 306, 342, 355 라인은 조사 문제가 실제 어색함으로 이어질 가능성이 높다.

### 2. 상태값 설명처럼 들리는 문장

`공포는 조금 낮아지지만`, `모두가 조금 덜 떱니다`, `다음 투표는 더 쉬워졌다는 사실입니다`처럼 게임 수치 변화를 문장으로 그대로 옮긴 표현이 있다. 의미는 맞지만 실제 한국어 서사 문장으로는 딱딱하고 번역투처럼 들린다.

제안 방향:

- 수치 변화는 몸짓, 시선, 침묵, 호흡으로 치환한다.
- `조금`, `더`, `사실입니다`, `됩니다`가 반복되는 문장은 우선 검토한다.

## templates.ko.js 제안 목록

| 우선순위 | 파일:라인 | 기존 문장 | 제안 문장 |
| --- | --- | --- | --- |
| P1 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:4` | 심판자의 손길이 닿자 {riskNoun}이 하나 줄어듭니다. {groupName}의 {silence}이 더 낮게 가라앉습니다. | 심판자의 손길이 지나가자 물 한 병이 조용히 사라집니다. 보트 위에는 {silence}만 낮게 깔립니다. |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:10` | 물통 하나가 비어 있는 채 발견됩니다. 누구도 마신 사람을 보지 못했습니다. | 비어 있는 물통 하나가 뒤늦게 발견됩니다. 누가 마셨는지는 아무도 보지 못했습니다. |
| P1 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:11` | {groupName}은 서로의 입술이 말라 가는 것만 확인합니다. | 보트 위에는 서로의 마른 입술만 남습니다. |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:16` | 누가 먼저 말했는지는 남지 않습니다. 다만 숨겨진 진실이 있다는 말만 보트 위를 돕니다. | 누가 처음 꺼낸 말인지는 아무도 모릅니다. 숨기는 게 있다는 소문만 보트 위를 맴돕니다. |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:17` | {groupName}의 시선이 한 사람씩 짧게 엇갈립니다. | 시선들이 짧게 부딪혔다가 흩어집니다. |
| P1 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:22` | 심판자가 의심의 씨앗을 던집니다. {silence} 사이로 작은 이름들이 떠오릅니다. | 심판자가 의심의 씨앗을 심습니다. 잠깐의 정적 사이로 이름 몇 개가 떠오릅니다. |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:34` | 젖은 바닥 아래에서 포장지가 바스락거립니다. {targetName}만 그 소리를 너무 빨리 알아챕니다. | 젖은 바닥 아래에서 포장지가 바스락거립니다. {targetName}만 누구보다 먼저 고개를 돌립니다. |
| P1 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:35` | {groupName}은 아직 모릅니다. 하지만 의심은 곧 냄새를 맡을 겁니다. | 아직 아무도 모릅니다. 하지만 숨긴 것은 오래 가지 못합니다. |
| P1 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:41` | {damageSound}이 들리자 {groupName}은 동시에 가장자리를 붙잡습니다. | 보트 아래에서 {damageSound} 같은 소리가 나자, 모두가 동시에 가장자리를 붙잡습니다. |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:46` | 먹구름이 너무 가까워집니다. 보트가 한 번 크게 기울고, {riskNoun}이 모두의 입을 막습니다. | 먹구름이 가까이 내려앉습니다. 보트가 한 번 크게 기울고, 모두의 입이 굳게 닫힙니다. |
| P1 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:53` | 심판자가 {targetName}의 공포 속으로 낮게 속삭입니다. | 심판자의 속삭임이 {targetName}의 공포를 파고듭니다. |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:54` | {targetName}은 {groupName}을 보며 이미 적의 숫자를 세기 시작합니다. | {targetName}, 이제 누가 적인지부터 세기 시작합니다. |
| P1 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:65` | 심판자가 {targetName}의 굶주림을 조용히 밀어 올립니다. | 심판자가 {targetName}의 허기를 조용히 부추깁니다. |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:71` | {targetName}은 또다시 보급품 쪽을 봅니다. 너무 오래, 너무 조용히. | {targetName}, 또다시 보급품 쪽을 봅니다. 오래, 말없이. |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:84` | 그 이름이 불리지 않아도, 보트 위의 시선은 이미 방향을 알고 있습니다. | 이름이 입 밖에 나오지 않아도, 시선은 이미 그쪽으로 향합니다. |
| P1 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:90` | 그 믿음이 사라지기 전까지는 모두가 조금 덜 떱니다. | 그 믿음이 사라지기 전까지, 보트 위의 긴장감은 잠시 낮아집니다. |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:95` | 먼 곳에서 들릴 리 없는 소리가 들린 듯합니다. 누군가 얼굴을 듭니다. | 먼 곳에서 들릴 리 없는 소리가 들린 듯합니다. 누군가 고개를 듭니다. |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:101` | 바다가 침묵합니다. 그래서 보트 위의 숨소리가 더 선명해집니다. | 바다가 침묵합니다. 보트 위의 숨소리가 더 선명해집니다. |
| P1 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:107` | {silence}이 너무 오래 이어집니다. 누구도 먼저 사람다운 말을 꺼내지 못합니다. | 침묵만 길어집니다. 누구도 먼저 말을 꺼내지 못합니다. |
| P1 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:108` | 그 사이 각자의 마음은 조금씩 작아집니다. | 그 사이 모두가 조금씩 더 움츠러듭니다. |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:120` | 포장지가 찢어지는 소리에 모두가 고개를 돌립니다. {targetName}의 손이 가장 늦게 물러납니다. | 포장지가 찢어지는 소리에 모두가 고개를 돌립니다. {targetName}의 손만 가장 늦게 떨어집니다. |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:132` | {actorName}의 말은 조심스럽지만 방향은 분명합니다. | {actorName}, 조심스럽게 말하지만 뜻은 분명합니다. |
| P1 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:133` | {actorName}: {targetLabel}을 계속 태우는 게 정말 모두를 위한 일인가? | {actorName}: {targetLabel}을 계속 보트에 두는 게 정말 모두를 위한 일이야? |
| P1 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:145` | {groupName}은 아무 말 없이 줄어든 물을 봅니다. | 아무도 말하지 않습니다. 시선은 줄어든 물통에 멈춰 있습니다. |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:157` | 그 작은 돌봄 때문에 보트 위의 잔혹함이 잠시 멈춥니다. | 그 작은 손길 앞에서, 보트 위의 잔혹함도 잠시 멈칫합니다. |
| P1 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:162` | {actorName}이 젖은 바닥을 발로 누르며 목소리를 세웁니다. | {actorName}, 젖은 바닥을 딛고 버티며 목소리를 높입니다. |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:163` | {actorName}: {opener}. 겁먹은 사람은 명령을 따라. 그게 사는 길이야. | {actorName}: {opener}. 겁먹었으면 내 말을 들어. 그래야 살아. |
| P1 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:169` | 공포는 조금 낮아지지만, 신뢰도 함께 깎여 나갑니다. | 겁은 잠시 잦아들지만, 믿음도 함께 닳아 갑니다. |
| P1 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:174` | {actorName}은 {targetName}을 직접 탓하지 않습니다. 대신 모두가 그쪽을 보게 만듭니다. | {actorName}, {targetName}을 직접 탓하지는 않습니다. 대신 모두의 시선을 그쪽으로 모읍니다. |
| P1 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:175` | {actorName}: {opener}. 우리를 위험하게 만드는 흐름은 분명히 있어요. | {actorName}: {opener}. 분명 누군가 우리를 위험하게 만들고 있어요. |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:180` | {actorName}의 목소리는 낮고 부드럽습니다. 그래서 더 멀리 퍼집니다. | {actorName}의 목소리는 낮고 부드럽습니다. 오히려 그래서 더 멀리 퍼집니다. |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:192` | {actorName}이 {targetName}의 과거를 묻기 시작합니다. 질문은 곧 고발처럼 변합니다. | {actorName}, {targetName}의 과거를 캐묻기 시작합니다. 질문은 금세 고발이 됩니다. |
| P1 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:193` | {groupName}은 대답보다 불안을 더 믿습니다. | 대답보다 불안에 귀를 기울이는 사람이 더 많아집니다. |
| P1 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:198` | {targetName}이 보트 가장자리에 손을 올립니다. 누구도 아직 이름을 부르지 않았습니다. | {targetName}, 보트 가장자리에 손을 올립니다. 아직 누구도 이름을 부르지 않았습니다. |
| P1 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:199` | {targetName}: 내가 줄어들면 너희가 조금이라도 가벼워지겠지. | {targetName}: 내가 빠지면 너희가 조금은 가벼워지겠지. |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:205` | 희생은 말보다 빠르게 일어나고, 남은 사람들은 그 무게를 뒤늦게 느낍니다. | 그 선택은 말보다 빨랐고, 남은 사람들은 뒤늦게 그 무게를 느낍니다. |
| P1 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:210` | {damageSound}이 보트 밑에서 솟구칩니다. 모두가 동시에 숨을 멈춥니다. | 보트 밑에서 {damageSound} 같은 소리가 터집니다. 모두가 동시에 숨을 멈춥니다. |
| P1 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:211` | {riskNoun}은 이제 소문이 아니라 손끝에 닿는 사실입니다. | 이제 위험은 소문이 아니라 손끝에 닿는 사실입니다. |
| P1 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:222` | {actorName}이 갑자기 몸을 일으켜 {targetName} 쪽으로 밀려듭니다. | {actorName}, 갑자기 몸을 일으켜 {targetName} 쪽으로 달려듭니다. |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:228` | 공포가 {actorName}의 얼굴에서 말보다 먼저 터집니다. | 말보다 먼저, {actorName}의 얼굴에 공포가 번집니다. |
| P1 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:246` | 아무도 말하지 않습니다. {silence}만 보트 바닥에 고입니다. | 아무도 말하지 않습니다. 보트 안에는 침묵만 고입니다. |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:247` | 바다는 대답하지 않지만, 모두가 조금씩 더 무너집니다. | 바다는 대답하지 않고, 남은 사람들은 조금씩 무너집니다. |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:253` | 말이 사라진 자리에 공포만 조금 더 자랍니다. | 말이 사라진 자리에 공포만 더 커집니다. |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:258` | 틈새로 물이 {waterMotion}. 손으로 퍼내는 속도보다 빠릅니다. | 틈새로 물이 {waterMotion}. 퍼내는 것보다 차오르는 게 빠릅니다. |
| P1 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:265` | {riskNoun}이 보트 안쪽으로 한 칸 더 들어옵니다. | 물이 보트 안쪽으로 한 뼘 더 밀려듭니다. |
| P1 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:271` | {damageSound} 뒤에, 모두가 남은 짐의 무게를 새로 봅니다. | {damageSound} 같은 소리가 지나간 뒤, 모두가 남은 짐을 다시 봅니다. |
| P1 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:276` | {riskNoun}이 숫자에서 소리로 바뀝니다. 선체가 짧게 대답합니다. | 하중은 더 이상 숫자가 아닙니다. 선체가 짧게 비명을 냅니다. |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:277` | 이제 물자도 사람도 같은 질문이 됩니다. 무엇을 버릴 것인가. | 이제 물자도 사람도 같은 질문 앞에 놓입니다. 무엇을 버릴 것인가. |
| P1 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:283` | {actorName}: {opener}. {targetLabel} 하나 때문에 {riskNoun}이 커지고 있어. | {actorName}: {opener}. {targetLabel} 하나 때문에 다 같이 위험해지고 있어. |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:288` | {actorName}은 바로 이름을 말하지 않습니다. 대신 모두가 {targetName}을 보게 만듭니다. | {actorName}, 바로 이름을 말하지는 않습니다. 대신 모두의 시선을 {targetName} 쪽으로 돌립니다. |
| P1 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:300` | {actorName}와 {targetName}이 거의 들리지 않는 목소리로 말을 맞춥니다. | 두 사람은 거의 들리지 않는 목소리로 말을 맞춥니다. |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:301` | 그들은 서로를 지키기로 하지만, 그 약속 밖의 사람은 더 외로워집니다. | 서로를 지키기로 한 순간, 약속 밖에 남은 사람들은 더 외로워집니다. |
| P1 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:306` | {actorName}이 {targetName} 쪽으로 조금 가까이 앉습니다. 아무도 동맹이라는 말을 쓰지 않습니다. | {actorName}, {targetName} 쪽으로 조금 더 가까이 앉습니다. 아무도 동맹이라는 말은 꺼내지 않습니다. |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:307` | 하지만 다음 고발이 어디로 향할지는 조금 더 분명해집니다. | 하지만 다음 고발이 향할 곳은 조금 더 분명해집니다. |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:312` | 결국 보트는 이름 하나를 고릅니다. {targetName}이 바다 쪽으로 밀려납니다. | 결국 사람들은 이름 하나를 고릅니다. {targetName}, 바다 쪽으로 밀려납니다. |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:318` | {targetName}의 손이 가장자리를 붙잡지만, 붙잡아 줄 손은 부족합니다. | {targetName}의 손이 가장자리를 붙잡지만, 붙잡아 줄 손은 모자랍니다. |
| P1 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:319` | 보트가 조금 가벼워지는 순간, {groupName}은 아무도 서로를 보지 못합니다. | 보트가 조금 가벼워진 순간, 누구도 서로의 얼굴을 보지 못합니다. |
| P1 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:324` | {targetName}은 끝내 버팁니다. 하지만 그 이름은 이제 보트 안에 안전하게 돌아오지 못합니다. | {targetName}, 끝내 버팁니다. 하지만 그 이름은 이제 예전 자리로 돌아오지 못합니다. |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:330` | 투표는 사람 하나를 던지지 못하고 되돌아옵니다. | 투표는 사람 하나를 바다로 밀어내지 못한 채 끝납니다. |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:331` | 그 대신 {targetName}의 주변에 보이지 않는 선이 그어집니다. | 대신 {targetName} 주변에 보이지 않는 선이 그어집니다. |
| P1 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:336` | 실패한 투표가 몸싸움으로 터집니다. {actorName}과 {targetName}이 좁은 바닥에서 부딪힙니다. | 실패한 투표가 몸싸움으로 번집니다. {actorName}과 {targetName}, 좁은 바닥에서 부딪힙니다. |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:337` | {damageSound}처럼 짧은 비명이 파도에 묻힙니다. | 짧은 비명이 파도에 묻힙니다. |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:343` | 확실한 것은 누군가 다쳤고, 다음 투표는 더 쉬워졌다는 사실입니다. | 누군가 다쳤고, 다음 투표가 더 쉬워졌다는 것만은 분명합니다. |
| P1 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:348` | {targetName}의 손에서 힘이 빠집니다. {targetRole}이라는 이름도 이 순간에는 너무 가볍습니다. | {targetName}의 손에서 힘이 빠집니다. 이 순간에는 직함도 아무 힘이 없습니다. |
| P1 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:355` | 보트 위의 {silence}은 방금 전보다 더 무겁습니다. | 보트 위의 침묵은 방금 전보다 더 무겁습니다. |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:361` | 파도는 설명하지 않고, {groupName}은 그 빈자리를 셉니다. | 파도는 아무 설명도 하지 않고, 남은 사람들은 빈자리를 셉니다. |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:373` | 보트는 가벼워졌지만, {groupName}의 얼굴은 더 가라앉습니다. | 보트는 가벼워졌지만, 남은 얼굴들은 더 가라앉습니다. |
| P1 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:378` | {targetName}은 이름이 투표로 바뀐 뒤 돌아오지 못합니다. | {targetName}, 투표로 이름이 지워진 뒤 돌아오지 못합니다. |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:379` | 누구도 승리하지 않았지만, 모두가 조금 더 살아남았습니다. | 누구도 이긴 사람은 없지만, 남은 사람들은 조금 더 살아남았습니다. |
| P1 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:390` | {targetName}의 희생은 물보다 조용히 보트 안으로 들어옵니다. | {targetName}의 희생은 물소리보다 조용하게 보트 안에 남습니다. |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:391` | 살아남은 사람들은 덜 무거워졌지만, 누구도 가벼워지지는 못합니다. | 살아남은 사람들은 짐을 덜었지만, 누구도 가벼워지지는 못합니다. |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:397` | {sacrificeCount}번의 희생은 기록됩니다. 심판은 그 선의를 죄로 세지 않습니다. | {sacrificeCount}번의 희생이 기록됩니다. 심판은 그 선의를 죄로 세지 않습니다. |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:409` | 그 이름은 선택한 죄보다 당한 압박으로 더 오래 남습니다. | 그 이름은 저지른 죄보다 견뎌 낸 압박으로 더 오래 남습니다. |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:421` | 배신 {betrayalCount}번. 살아남기 위한 선택은 숫자가 되어 돌아옵니다. | 배신 {betrayalCount}번. 살아남으려 한 선택이 숫자로 돌아옵니다. |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:433` | 위선 {hypocrisyCount}번. 말과 손이 같은 방향을 보지 않았습니다. | 위선 {hypocrisyCount}번. 말과 손은 같은 쪽을 향하지 않았습니다. |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:445` | 선동 {instigationCount}번. 그 목소리는 파도보다 오래 보트 위를 흔들었습니다. | 선동 {instigationCount}번. 그 목소리는 파도보다 오래 보트 위에 남았습니다. |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:463` | 보트는 목숨을 남겼고, 심판은 변한 마음을 남깁니다. | 보트는 목숨을 남겼고, 심판은 달라진 마음을 기록합니다. |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:469` | 바다로 밀려난 이름은 마지막 판정에서도 그대로 젖어 있습니다. | 바다로 밀려난 이름은 마지막 판정에서도 젖은 채 남습니다. |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/templates.ko.js:481` | 심판은 살아남은 사실과 살아남은 방식을 따로 저울에 올립니다. | 심판은 살아남았다는 사실과 살아남은 방식을 따로 적습니다. |

## localization.ko.js 제안 목록

이 파일의 `event.*`, `log.*` 문장은 현재 narrative template이 없을 때의 fallback 성격이다. 그래도 출력 가능성이 있으므로 같이 다듬는 편이 좋다.

| 우선순위 | 파일:라인 | 기존 문장 | 제안 문장 |
| --- | --- | --- | --- |
| P1 | `src/scenarios/lifeboat-of-greed/localization.ko.js:51` | {name}은 더 이상 심판을 견디지 못합니다. | {name}, 더 이상 심판을 견디지 못합니다. |
| P1 | `src/scenarios/lifeboat-of-greed/localization.ko.js:55` | 심판자가 {name}의 공포 속으로 속삭입니다.\n{name}은 이미 모두가 적이 된 것처럼 다른 이들을 바라봅니다. | 심판자의 속삭임이 {name}의 공포를 파고듭니다.\n{name}, 모두가 이미 적처럼 보이기 시작합니다. |
| P1 | `src/scenarios/lifeboat-of-greed/localization.ko.js:56` | 심판자가 {name}의 굶주림을 조용히 날카롭게 만듭니다.\n{name}은 다시 보급품을 세기 시작합니다. | 심판자가 {name}의 허기를 조용히 부추깁니다.\n{name}, 다시 보급품을 세기 시작합니다. |
| P2 | `src/scenarios/lifeboat-of-greed/localization.ko.js:57` | {name}을 둘러싼 작은 의심이 피어납니다.\n아무도 입 밖에 내지 않지만, 모두가 그것을 느낍니다. | {name} 주변에 작은 의심이 피어납니다.\n아무도 입 밖에 내지 않지만, 모두가 느낍니다. |
| P2 | `src/scenarios/lifeboat-of-greed/localization.ko.js:58` | 심판자가 거짓된 위안의 순간을 허락합니다.\n짧은 숨결 동안, 그들은 구조가 실제보다 가까이 있다고 믿습니다. | 심판자가 짧은 거짓 안도를 허락합니다.\n그 짧은 숨 동안, 구조가 실제보다 가까운 것처럼 느껴집니다. |
| P1 | `src/scenarios/lifeboat-of-greed/localization.ko.js:59` | 바다가 침묵합니다.\n그 침묵 속에서 모든 영혼은 조금 더 작아집니다. | 바다가 침묵합니다.\n그 침묵 속에서 모두가 조금씩 움츠러듭니다. |
| P2 | `src/scenarios/lifeboat-of-greed/localization.ko.js:60` | 비상식량을 숨기던 {name}의 모습이 발각됩니다.\n{name}: 적절한 순간을 기다렸을 뿐이야. 너희는 분명 낭비했을 테니까. | 숨기던 비상식량이 들킵니다.\n{name}: 적절한 순간을 기다렸을 뿐이야. 너희는 분명 낭비했을 테니까. |
| P1 | `src/scenarios/lifeboat-of-greed/localization.ko.js:62` | {name}이 다른 이들이 고개를 돌린 사이 물을 마십니다.\n{name}: 살아남아 쓸모 있으려면 필요한 만큼만 가져간 거야. | {name}, 다른 이들이 고개를 돌린 사이 물을 마십니다.\n{name}: 살아남아 쓸모 있으려면 필요한 만큼만 가져간 거야. |
| P1 | `src/scenarios/lifeboat-of-greed/localization.ko.js:63` | {name}는 자신의 손도 떨리기 시작했지만 가장 약한 승객을 돌봅니다.\n{name}: 누가 돌봄을 받을 자격이 있는지 고르기 시작하면, 우리는 이미 끝난 거예요. | {name}, 자기 손도 떨리기 시작했지만 가장 약한 승객을 돌봅니다.\n{name}: 누가 돌봄을 받을 자격이 있는지 고르기 시작하면, 우리는 이미 끝난 거예요. |
| P1 | `src/scenarios/lifeboat-of-greed/localization.ko.js:64` | {name}가 목소리를 높여 모두를 침묵시킵니다.\n{name}: 공포는 굶주림보다 빨리 죽인다. 지금부터는 질서를 따른다. | {name}, 목소리를 높여 모두를 침묵시킵니다.\n{name}: 공포는 굶주림보다 빨리 죽인다. 지금부터는 질서를 따른다. |
| P1 | `src/scenarios/lifeboat-of-greed/localization.ko.js:65` | {name}는 부드럽게 말하지만, 모두가 귀를 기울입니다.\n{name}: 이런 말 하긴 싫지만, 여기 몇몇 사람이 우리를 위험하게 만들고 있어요. | {name}, 부드럽게 말하지만 모두가 귀를 기울입니다.\n{name}: 이런 말 하긴 싫지만, 여기 몇몇 사람이 우리를 위험하게 만들고 있어요. |
| P1 | `src/scenarios/lifeboat-of-greed/localization.ko.js:67` | {name}이 가라앉는 보트 가장자리를 바라봅니다.\n{name}: 한 사람이 줄어 나머지가 살 수 있다면, 나를 좋게 기억해 줘. | {name}, 가라앉는 보트 가장자리를 바라봅니다.\n{name}: 내가 빠져서 나머지가 살 수 있다면, 좋게 기억해 줘. |
| P2 | `src/scenarios/lifeboat-of-greed/localization.ko.js:72` | 손으로 퍼내는 속도보다 빠르게 물이 틈새로 스며듭니다. | 퍼내는 것보다 빠르게 물이 틈새로 스며듭니다. |
| P1 | `src/scenarios/lifeboat-of-greed/localization.ko.js:74` | {actor}가 누구보다 먼저 {target}을 가리킵니다.\n{actor}: 짐 하나가 너무 많으면 우리 모두가 가라앉아. | {actor}, 누구보다 먼저 {target}을 가리킵니다.\n{actor}: 짐 하나가 너무 많으면 우리 모두가 가라앉아. |
| P1 | `src/scenarios/lifeboat-of-greed/localization.ko.js:75` | {actor}와 {target}이 조용해지더니, 서로의 말을 지키기 시작합니다. | 두 사람은 조용해지더니, 서로의 말을 지키기 시작합니다. |
| P2 | `src/scenarios/lifeboat-of-greed/localization.ko.js:76` | 보트가 짐을 하나 고릅니다. {target}은 바다로 던져집니다. | 보트 위 사람들이 짐 하나를 고릅니다. {target}, 바다로 밀려납니다. |
| P2 | `src/scenarios/lifeboat-of-greed/localization.ko.js:77` | {target}은 투표에서 살아남지만, 그들을 둘러싼 원은 다시 닫히지 않습니다. | {target}, 투표에서 살아남지만 주변의 틈은 다시 좁혀지지 않습니다. |
| P1 | `src/scenarios/lifeboat-of-greed/localization.ko.js:79` | {target}이 누군가 이름을 부르기 전에 보트 밖으로 발을 내딛습니다.\n{target}: 남은 너희라도 가벼워져. | {target}, 누군가 이름을 부르기 전에 보트 밖으로 발을 내딛습니다.\n{target}: 내가 빠지면 너희라도 조금은 가벼워지겠지. |

## lexicon.ko.js 제안 목록

토큰 구절은 여러 템플릿에 섞여 들어가므로, 단독으로 자연스러워도 앞뒤 조사와 붙으면 어색해질 수 있다.

| 우선순위 | 파일:라인 | 기존 구절 | 제안 구절 |
| --- | --- | --- | --- |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/lexicon.ko.js:6` | 가라앉는 속도 | 가라앉히는 무게 |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/lexicon.ko.js:10` | 무너진 침묵 | 짙어진 침묵 |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/lexicon.ko.js:35` | 눌린 시선 | 눌린 눈빛 |
| P2 | `src/scenarios/lifeboat-of-greed/narrative/lexicon.ko.js:36` | 마른 균열음 | 짧은 균열음 |

## 적용 메모

승인 후 적용할 때는 이 문서의 P1을 먼저 반영하고, P2는 톤을 보며 함께 반영하는 방식이 좋다. 다만 `localization.ko.js`는 현재 작업 트리에 이미 수정 흔적이 있으므로, 적용 전에 해당 파일의 최신 변경분을 다시 읽고 충돌 없이 패치해야 한다.
