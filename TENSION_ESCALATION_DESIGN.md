# Tension Escalation Design

## Purpose

The current MVP proves the core judgement loop, but the turn flow can feel repetitive because the same high-priority event remains valid across multiple turns. This document defines an additional structure that makes the lifeboat crisis tighten over time, creates pressure to sacrifice at least one person in most runs, and keeps a rare path where everyone survives.

## Current Repetition Cause

The current rule engine checks events in a fixed priority order and fires the first valid event each turn.

Example:

1. Basic changes are applied.
2. Event rules are checked in order.
3. The first valid event runs.
4. No event cooldown or recent-event suppression is applied.

This means a condition that stays true can dominate the log. For example, a high-greed character can repeatedly satisfy the secret water drinking condition until water is gone. Crisis events can also repeat once water or stability crosses a threshold.

Character stats already persist between turns, but the default pressure is too narrow: fear rises, while health, boat damage, water ingress, factions, accusations, and sacrifice pressure do not naturally escalate enough unless a specific event is triggered.

## Design Goals

- Every turn should make the situation materially worse unless the player spends power to delay it.
- Repeated events should be rare unless the story state justifies repetition.
- Most chapters should force one or more deaths, exile, or sacrifices.
- A perfect rescue should remain possible but rare, around 5%.
- Character choices should emerge from stats, relationships, and survival pressure.
- The player should feel that minor powers influence the direction of collapse, while major powers accelerate or redirect it.

## New Chapter Pacing

Increase the chapter length from 10 turns to 18 turns.

Recommended phases:

- Turns 1-4: discomfort phase. Fear rises slowly, trust starts to strain, health loss is light.
- Turns 5-9: scarcity phase. Water, food, leaks, and suspicion begin to matter.
- Turns 10-14: fracture phase. Alliances form, accusations escalate, and exile votes become likely.
- Turns 15-18: collapse phase. Boat damage and survival math make sacrifice or loss very likely.

The longer chapter gives tension room to build instead of immediately forcing the same crisis event.

## New Boat Pressure Model

Add these fields to boat state:

```js
{
  turn: 1,
  max_turn: 18,
  water: 5,
  food: 3,
  stability: 70,
  rescue_chance: 30,
  storm_level: 0,
  hull_damage: 0,
  water_ingress: 0,
  load_pressure: 32,
  despair: 0,
  rescue_signal_seen: false,
  minor_power: 3,
  max_minor_power: 3,
  major_power: 4,
  chapter_finished: false,
  judgement_done: false
}
```

Field intent:

- `hull_damage`: cumulative damage to the lifeboat. Higher values increase health loss and capsize risk.
- `water_ingress`: how much water is entering the boat. Raises fear and accelerates hull damage.
- `load_pressure`: pressure from living bodies and supplies. More survivors mean more weight and faster structural decay.
- `despair`: global psychological pressure. Rises with hunger, thirst, deaths, storm, and leaks.
- `rescue_signal_seen`: marks whether the rare everyone-survives route is still plausible.

## Default Turn Decay

Every turn should apply pressure before event selection.

Recommended baseline:

```text
turn +1
load_pressure = alive_count * 4 + water * 1 + food * 1
water_ingress += floor(hull_damage / 25)
hull_damage += max(0, floor((load_pressure - 22) / 8))
despair += 1

Each alive character:
- fear +2
- health -1
- trust -1 if despair >= 6
- health -1 additional if water_ingress >= 3
- health -1 additional if food <= 1
- fear +3 additional if water <= 2
- fear +3 additional if hull_damage >= 35
- fear +4 additional if storm_level >= 2
```

This makes time itself dangerous. Even without dramatic events, the group is deteriorating.

## Survival Math

The game should communicate that saving everyone is nearly impossible because the boat is overloaded.

Suggested pressure thresholds:

- `load_pressure <= 22`: manageable.
- `23-30`: hull damage begins creeping up.
- `31-38`: leaks and cracks become common.
- `39+`: severe overload; exile/sacrifice pressure becomes very high.

With six survivors, initial `load_pressure` is:

```text
6 survivors * 4 + 5 water + 3 food = 32
```

This means the boat starts overloaded. The player may delay collapse, but the system naturally pushes toward reducing weight, losing supplies, or damaging the boat.

## Event Selection Rewrite

Replace strict first-match priority with weighted eligible events.

Each event should define:

```js
{
  id: "secret_water_drinking",
  baseWeight: 8,
  cooldown: 3,
  phases: ["scarcity", "fracture"],
  canRun(state) {},
  weight(state) {},
  apply(state) {}
}
```

Selection rules:

- Build all eligible events.
- Remove events on cooldown.
- Reduce weight if the same event appeared in the last 5 turns.
- Increase weight for events matching the current phase.
- Pick weighted random event.
- If no event qualifies, run a low-impact silent pressure event.

This keeps the simulation rule-based but prevents one condition from monopolizing turns.

## Event Memory

Add event history:

```js
{
  event_history: [
    { turn: 2, id: "secret_water_drinking", actor_id: "chairman", target_id: null }
  ],
  event_cooldowns: {
    secret_water_drinking: 2,
    exile_vote: 1
  }
}
```

Implemented cooldown guidance:

- Secret water drinking: 3 turns.
- Exile vote: 3 turns.
- Boat damage: 2 turns.
- Panic outburst: 4 turns.
- Public accusation: 4 turns.
- Alliance formation: 4 turns.
- Final sacrifice vote: no cooldown after turn 14.

## Relationship Model

Add lightweight relationships without building a full social sim.

Each character gets:

```js
{
  alliances: [],
  enemies: [],
  accusation_score: 0,
  target_pressure: 0,
  last_actor_turn: -99,
  last_target_turn: -99
}
```

Relationship rules:

- Characters with high trust and similar morality can form alliances.
- Characters with low trust, high fear, or betrayal history become targets.
- High influence characters can direct group suspicion.
- Greedy or hypocritical characters attract accusations.
- Low health or low influence characters become easier sacrifice targets.

## New Social Pressure Scores

Calculate each turn:

```text
survival_pressure =
  despair
  + water_ingress * 2
  + hull_damage / 10
  + max(0, alive_count - 4) * 3

target_pressure(character) =
  fear / 10
  + greed / 12
  + betrayal_count * 6
  + hypocrisy_count * 5
  - trust / 12
  - influence / 14
  - morality / 16
  + low_health_penalty
```

`target_pressure` should not instantly kill anyone. It should make accusations, alliances, votes, and exile events more likely.

## New Event Families

### 1. Leak and Damage Events

`leak_spreads`

Condition:

- `water_ingress >= 2` or `hull_damage >= 25`

Effect:

- `water_ingress +1`
- all alive `fear +4`
- low-health characters `health -2`

`supplies_shift_and_crack_hull`

Condition:

- `load_pressure >= 30`

Effect:

- `hull_damage +5`
- `stability -4`
- all alive `fear +3`

### 2. Accusation Events

`public_accusation`

Condition:

- `despair >= 5`
- at least one character has `target_pressure >= 8`

Effect:

- highest influence survivor accuses highest target pressure survivor.
- target `trust -10`, `fear +8`
- accuser `instigation_count +1`
- group `morality -2`

### 3. Alliance Events

`survival_pact`

Condition:

- `despair >= 6`
- two characters have trust >= 45 and no direct enemy relation.

Effect:

- add each other to alliances.
- both `trust +4`
- their shared enemy or highest target pressure character gets `target_pressure +4`.

This creates visible cooperation that can still turn predatory.

### 4. Exile Vote Events

`exile_vote_called`

Condition:

- `survival_pressure >= 12`
- `alive_count >= 4`
- a target has `target_pressure >= 12`

Effect:

- group starts a vote against the target.
- if target has no alliance protection, target is thrown overboard.
- if protected, target survives but loses trust and health.

Suggested failure/success:

```text
exile_score = target_pressure + accuser.influence / 10 + despair / 2
defense_score = target.trust / 8 + target.influence / 10 + alliance_count * 5
if exile_score > defense_score:
  target dies
else:
  target survives, but trust -15 and fear +15
```

### 5. Voluntary Sacrifice Events

`voluntary_sacrifice`

Condition:

- `survival_pressure >= 16`
- at least one high morality survivor.

Effect:

- high morality survivor may sacrifice themselves if it saves at least 3 others.
- sacrificed character gets `sacrifice_count +3`.
- `load_pressure` drops because survivor count drops.
- group `morality +4`, `trust +6`.

### 6. Mutiny Events

`failed_exile_turns_violent`

Condition:

- an exile vote failed recently.
- average fear >= 75.

Effect:

- target and accuser both lose health.
- alliances harden.
- one random bystander may be injured.

## Rare Everyone-Survives Route

Everyone surviving should be possible but around 5%.

Required conditions:

- `rescue_chance >= 55`
- `hull_damage <= 25`
- `water_ingress <= 2`
- `average_trust >= 55`
- `alive_count == 6`
- turn >= 14

Then each turn:

```text
rescue_success_chance = 5% + (rescue_chance - 55) * 0.5%
cap at 15%
```

This keeps perfect survival possible but unlikely. The player must avoid overusing destructive powers, maintain trust, and prevent structural collapse.

## Player Power Adjustments

Minor powers should steer the social graph:

- Whisper Fear: increases target pressure on the most fearful person.
- Nudge Greed: makes resource betrayal more likely.
- Seed Doubt: weakens alliance defense.
- False Comfort: lowers fear but raises complacency; `rescue_chance -3` remains.
- Heavy Silence: raises despair slightly.

Major powers should strongly change the crisis:

- Reduce Water: increases scarcity and target pressure for greedy characters.
- Rumor: raises accusation weights.
- Hidden Food: creates hypocrisy evidence.
- Storm: increases hull damage and water ingress, not only fear.

## UI Additions

Add a compact crisis panel:

```text
Crisis
- Hull Damage: 18
- Water Ingress: 2
- Load Pressure: 32
- Despair: 6
```

Character cards should show:

```text
Allies: Clara
Enemies: Mr. Vale
Target Pressure: 11
```

Log entries should name both actor and target where possible:

```text
Mia points at Nox before anyone else can speak.
Nox is no longer a passenger. He is a burden.
```

## Balance Targets

Run 100 simulated games with no player powers:

- 0 deaths: 0-5%
- 1 death: 25-40%
- 2 deaths: 25-35%
- 3+ deaths: 15-30%
- capsize: 5-15%

Run 100 simulated games with destructive major powers:

- 0 deaths: under 2%
- 2+ deaths: over 60%
- capsize: 15-30%

Run 100 simulated games with trust-preserving play:

- 0 deaths: up to 5%
- 1 death: 35-50%
- 2 deaths: 25-35%

## Implementation Phases

### Phase 1: Stop Repetition

- Add event history and cooldowns.
- Convert current fixed event selection into weighted eligible event selection.
- Add recent-event suppression.
- Keep existing event effects mostly unchanged.

### Phase 2: Add Time Pressure

- Add `hull_damage`, `water_ingress`, `load_pressure`, and `despair`.
- Add default health decay.
- Increase `max_turn` to 18.
- Add crisis panel UI.

### Phase 3: Add Social Targeting

- Add alliances, enemies, accusation score, and target pressure.
- Add public accusation and survival pact events.
- Show social state on character cards.

### Phase 4: Add Sacrifice and Exile

- Add exile vote, failed exile, voluntary sacrifice, and mutiny events.
- Add death reasons for final judgement.
- Tune everyone-survives route to around 5%.

### Phase 5: Simulation Balance

- Add a deterministic headless simulation script.
- Run 100 to 1000 seeded games.
- Tune weights and thresholds until death distribution matches balance targets.

## Acceptance Criteria

- Same event should not appear more than twice in a 5-turn window unless explicitly allowed.
- Every turn changes at least one boat crisis value and one survivor-facing pressure value.
- Health can decline without storms, making time dangerous.
- At least one sacrifice, exile, death, or severe injury occurs in most runs.
- Six-survivor rescue remains possible but rare.
- Logs show varied social dynamics: accusation, alliance, betrayal, fear, and structural danger.
- Existing minor and major powers still work and now feed into the new crisis systems.
