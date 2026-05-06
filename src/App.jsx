import { useEffect, useMemo, useState } from "react";
import {
  Anchor,
  ChevronRight,
  CloudLightning,
  Coins,
  Droplets,
  Eye,
  Gauge,
  HeartPulse,
  Languages,
  MessageCircle,
  Package,
  RotateCcw,
  Scale,
  ScrollText,
  ShieldAlert,
  Users,
  VolumeX,
  Waves,
} from "lucide-react";
import {
  COMMAND_TYPES,
  applyCommand,
  createInitialState,
} from "./survival-core/engine.js";
import {
  characterJudgement,
  characterName,
  characterRole,
  formatLogEntry,
  getLanguageOptions,
  renderGameToText,
  setLanguage,
  translate,
} from "./game-adapters/display.js";
import {
  DEFAULT_SCENARIO_ID,
  getScenario,
} from "./game-adapters/scenario-registry.js";

const NAV_ITEMS = [
  { id: "trial", labelKey: "web.nav.trial", Icon: Waves },
  { id: "roster", labelKey: "web.nav.roster", Icon: Users },
  { id: "log", labelKey: "web.nav.log", Icon: ScrollText },
  { id: "judgement", labelKey: "web.nav.judgement", Icon: Scale },
];

const DEFAULT_SCENARIO = getScenario(DEFAULT_SCENARIO_ID);

const POWER_ICONS = {
  whisper_fear: Eye,
  nudge_greed: Coins,
  seed_doubt: ShieldAlert,
  false_comfort: MessageCircle,
  heavy_silence: VolumeX,
  reduce_water: Droplets,
  rumor: MessageCircle,
  hidden_food: Package,
  storm: CloudLightning,
};

const STATUS_ICONS = {
  gauge: Gauge,
  droplets: Droplets,
  waves: Waves,
  heart: HeartPulse,
  eye: Eye,
  scale: Scale,
};

const LIFEBOAT_POSITIONS = [
  { x: 100, y: 130, labelY: 172 },
  { x: 222, y: 96, labelY: 60 },
  { x: 322, y: 128, labelY: 171 },
  { x: 456, y: 96, labelY: 60 },
  { x: 200, y: 182, labelY: 224 },
  { x: 396, y: 182, labelY: 224 },
];

const cx = (...parts) => parts.filter(Boolean).join(" ");

export default function App() {
  const scenario = DEFAULT_SCENARIO;
  const [game, setGame] = useState(() => createInitialState(scenario));
  const [screen, setScreen] = useState("trial");
  const done = scenario.rules.isJudgementDone(game);
  const t = (key, params) => translate(game, key, params);

  useEffect(() => {
    document.title = t("ui.title.game");
    document.documentElement.lang = game.language;
  }, [game.language]);

  useEffect(() => {
    if (done && screen !== "judgement") {
      setScreen("judgement");
    }
  }, [done, screen]);

  useEffect(() => {
    const renderText = () => renderGameToText(game, screen, scenario);
    window.render_game_to_text = renderText;
    window.advanceTime = () => renderText();
    return () => {
      delete window.render_game_to_text;
      delete window.advanceTime;
    };
  }, [game, screen]);

  const languageOptions = useMemo(() => getLanguageOptions(game), [game.language]);

  const apply = (updater) => {
    setGame((current) => updater(current));
  };

  const runCommand = (command) => {
    setGame((current) => applyCommand(current, scenario, command));
  };

  const restart = () => {
    setGame(createInitialState(scenario, { language: game.language }));
    setScreen("trial");
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            <Anchor size={24} />
          </span>
          <div>
            <h1>{t("ui.title.chapter_1")}</h1>
            <p>{t("ui.title.game")}</p>
          </div>
        </div>

        <label className="language-select">
          <Languages size={18} aria-hidden="true" />
          <span>{t("ui.status.language")}</span>
          <select
            aria-label={t("ui.status.language")}
            value={game.language}
            onChange={(event) => apply((current) => setLanguage(current, event.target.value))}
          >
            {languageOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      <nav className="screen-tabs" aria-label="Screens">
        {NAV_ITEMS.map(({ id, labelKey, Icon }) => (
          <button
            id={`nav-${id}`}
            key={id}
            type="button"
            className={cx("screen-tab", screen === id && "active")}
            aria-pressed={screen === id}
            onClick={() => setScreen(id)}
          >
            <Icon size={18} aria-hidden="true" />
            <span>{t(labelKey)}</span>
          </button>
        ))}
      </nav>

      <StatusStrip game={game} scenario={scenario} t={t} />

      <main className="screen-frame">
        {screen === "trial" && (
          <TrialScreen
            game={game}
            scenario={scenario}
            t={t}
            onMinorPower={(powerId) =>
              runCommand({ type: COMMAND_TYPES.USE_MINOR_POWER, powerId })
            }
            onMajorPower={(powerId) =>
              runCommand({ type: COMMAND_TYPES.USE_MAJOR_POWER, powerId })
            }
          />
        )}
        {screen === "roster" && <RosterScreen game={game} scenario={scenario} t={t} />}
        {screen === "log" && <LogScreen game={game} t={t} />}
        {screen === "judgement" && <JudgementScreen game={game} scenario={scenario} t={t} />}
      </main>

      <footer className="action-bar">
        <button
          id="next-turn-btn"
          type="button"
          className="primary-action"
          disabled={done}
          onClick={() => runCommand({ type: COMMAND_TYPES.NEXT_TURN })}
        >
          <ChevronRight size={19} aria-hidden="true" />
          <span>{t("ui.button.next_turn")}</span>
        </button>
        <button
          id="finish-chapter-btn"
          type="button"
          disabled={done}
          onClick={() => runCommand({ type: COMMAND_TYPES.FINISH_CHAPTER })}
        >
          <Scale size={18} aria-hidden="true" />
          <span>{t("ui.button.finish")}</span>
        </button>
        <button id="restart-btn" type="button" onClick={restart}>
          <RotateCcw size={18} aria-hidden="true" />
          <span>{t("ui.button.restart")}</span>
        </button>
      </footer>
    </div>
  );
}

function StatusStrip({ game, scenario, t }) {
  const items = scenario.meters.status.map((metric) => {
    const Icon = STATUS_ICONS[metric.icon] || Gauge;
    return {
      Icon,
      delta: scenario.rules.getBoatDelta(game, metric.id),
      text: statusText(game, scenario, metric.id, metric.labelKey, t),
    };
  });

  return (
    <section className="status-strip" aria-label="Chapter status">
      {items.map(({ Icon, text, delta }) => (
        <div className="status-pill" key={text}>
          <Icon size={17} aria-hidden="true" />
          <span>{text}</span>
          <DeltaValue delta={delta} />
        </div>
      ))}
    </section>
  );
}

function TrialScreen({ game, scenario, t, onMinorPower, onMajorPower }) {
  return (
    <div className="trial-grid">
      <section className="panel lifeboat-panel">
        <PanelHeader icon={<Waves size={18} />} title={t("web.panel.lifeboat")} />
        <p className="boat-guide">{t("web.guide.color")}</p>
        <div className="crisis-block">
          <PanelHeader icon={<Gauge size={18} />} title={t("web.panel.crisis")} />
          <div className="crisis-grid">
            {scenario.meters.crisis.map((meter) => (
              <ScenarioMeter
                key={meter.id}
                game={game}
                scenario={scenario}
                meter={meter}
                t={t}
              />
            ))}
          </div>
        </div>
        <LifeboatVisual game={game} t={t} />
        <div className="boat-meters">
          {scenario.meters.support.map((meter) => (
            <ScenarioMeter
              key={meter.id}
              game={game}
              scenario={scenario}
              meter={meter}
              t={t}
            />
          ))}
        </div>
      </section>

      <section className="panel recent-log-panel">
        <PanelHeader icon={<ScrollText size={18} />} title={t("web.panel.recent_log")} />
        <LogList game={game} limit={5} />
      </section>

      <PowerPanel
        game={game}
        scenario={scenario}
        t={t}
        onMinorPower={onMinorPower}
        onMajorPower={onMajorPower}
      />
    </div>
  );
}

function PowerPanel({ game, scenario, t, onMinorPower, onMajorPower }) {
  const minorDisabled = !scenario.rules.canUseMinorPower(game);
  const majorDisabled = !scenario.rules.canUseMajorPower(game);

  return (
    <section className="panel power-panel">
      <div className="power-group">
        <PanelHeader icon={<Eye size={18} />} title={t("ui.panel.minor_powers")} />
        <div className="power-status">
          <span>
            {t("ui.power_status.minor", {
              minor: game.boat.minor_power,
              max_minor: game.boat.max_minor_power,
            })}
          </span>
          <DeltaValue delta={scenario.rules.getBoatDelta(game, "minor_power")} />
        </div>
        <div className="power-buttons">
          {scenario.powers.minor.map(({ id, labelKey }) => {
            const Icon = POWER_ICONS[id] || Eye;
            return (
            <button
              id={`power-${id}`}
              key={id}
              type="button"
              disabled={minorDisabled}
              onClick={() => onMinorPower(id)}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{t(labelKey)}</span>
            </button>
          );
          })}
        </div>
      </div>

      <div className="power-group major">
        <PanelHeader icon={<Scale size={18} />} title={t("ui.panel.major_powers")} />
        <div className="power-status">
          <span>{t("ui.power_status.major", { major: game.boat.major_power })}</span>
          <DeltaValue delta={scenario.rules.getBoatDelta(game, "major_power")} />
        </div>
        <div className="power-buttons">
          {scenario.powers.major.map(({ id, labelKey }) => {
            const Icon = POWER_ICONS[id] || Scale;
            return (
            <button
              id={`power-${id}`}
              key={id}
              type="button"
              disabled={majorDisabled}
              onClick={() => onMajorPower(id)}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{t(labelKey)}</span>
            </button>
          );
          })}
        </div>
      </div>
    </section>
  );
}

function RosterScreen({ game, scenario, t }) {
  return (
    <section className="wide-screen">
      <PanelHeader icon={<Users size={18} />} title={t("ui.panel.characters")} />
      <div className="character-grid">
        {game.characters.map((character) => (
          <CharacterCard
            key={character.id}
            game={game}
            scenario={scenario}
            character={character}
            t={t}
          />
        ))}
      </div>
    </section>
  );
}

function LogScreen({ game, t }) {
  return (
    <section className="wide-screen">
      <PanelHeader icon={<ScrollText size={18} />} title={t("web.nav.log")} />
      <LogList game={game} />
    </section>
  );
}

function JudgementScreen({ game, scenario, t }) {
  return (
    <section className="wide-screen judgement-screen">
      <PanelHeader icon={<Scale size={18} />} title={t("web.nav.judgement")} />
      {!scenario.rules.isJudgementDone(game) && <p className="pending-text">{t("web.judgement.pending")}</p>}
      <div className="judgement-list">
        {game.characters.map((character) => (
          <div className="judgement-row" key={character.id}>
            <div>
              <strong>{characterName(game, character)}</strong>
              <span>{characterRole(game, character)}</span>
            </div>
            <span className={cx("judgement-badge", character.alive ? "alive" : "dead")}>
              {character.judgement ? characterJudgement(game, character) : t("judgement.unjudged")}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function CharacterCard({ game, scenario, character, t }) {
  const statusKey = character.alive
    ? "ui.character.status_alive"
    : "ui.character.status_dead";

  return (
    <article className={cx("character-card", !character.alive && "dead")}>
      <header>
        <div>
          <h2>{characterName(game, character)}</h2>
          <p>{characterRole(game, character)}</p>
        </div>
        <span className={cx("status-token", character.alive ? "alive" : "dead")}>
          {t(statusKey)}
        </span>
      </header>

      <div className="stat-stack">
        <StatBar game={game} scenario={scenario} character={character} stat="health" label={t("web.stat.health")} />
        <StatBar game={game} scenario={scenario} character={character} stat="fear" label={t("web.stat.fear")} />
        <StatBar game={game} scenario={scenario} character={character} stat="greed" label={t("web.stat.greed")} />
        <StatBar game={game} scenario={scenario} character={character} stat="trust" label={t("web.stat.trust")} />
        <StatBar game={game} scenario={scenario} character={character} stat="morality" label={t("web.stat.morality")} />
        <StatBar game={game} scenario={scenario} character={character} stat="influence" label={t("web.stat.influence")} />
      </div>

      <div className="character-flags">
        {character.has_hidden_resource && <span>{t("web.status.hidden")}</span>}
        <MetricChip label={t("web.count.betrayal")} value={character.betrayal_count} delta={scenario.rules.getCharacterDelta(game, character.id, "betrayal_count")} />
        <MetricChip label={t("web.count.sacrifice")} value={character.sacrifice_count} delta={scenario.rules.getCharacterDelta(game, character.id, "sacrifice_count")} />
        <MetricChip label={t("web.count.hypocrisy")} value={character.hypocrisy_count} delta={scenario.rules.getCharacterDelta(game, character.id, "hypocrisy_count")} />
        <MetricChip label={t("web.count.instigation")} value={character.instigation_count} delta={scenario.rules.getCharacterDelta(game, character.id, "instigation_count")} />
        <MetricChip label={t("web.social.target_label")} value={character.target_pressure || 0} delta={scenario.rules.getCharacterDelta(game, character.id, "target_pressure")} />
        <MetricChip label={t("web.social.accusation")} value={character.accusation_score || 0} delta={scenario.rules.getCharacterDelta(game, character.id, "accusation_score")} />
        <span>
          {t("web.social.allies", {
            names: formatCharacterNames(game, character.alliances, t),
          })}
        </span>
        <span>
          {t("web.social.enemies", {
            names: formatCharacterNames(game, character.enemies, t),
          })}
        </span>
      </div>

      {scenario.rules.isJudgementDone(game) && (
        <div className="character-judgement">
          {t("ui.character.judgement", {
            judgement: characterJudgement(game, character),
          })}
        </div>
      )}
    </article>
  );
}

function StatBar({ game, scenario, character, stat, label }) {
  const delta = scenario.rules.getCharacterDelta(game, character.id, stat);
  const value = character[stat];
  return (
    <div className="stat-row">
      <div className="stat-label">
        <span>{label}</span>
        <StatValue value={value} delta={delta} />
      </div>
      <div className="stat-track" aria-hidden="true">
        <span style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function formatCharacterNames(game, ids = [], t) {
  const names = ids
    .map((id) => game.characters.find((character) => character.id === id))
    .filter(Boolean)
    .map((character) => characterName(game, character));
  return names.length > 0 ? names.join(", ") : t("web.social.none");
}

function ScenarioMeter({ game, scenario, meter, t }) {
  const value = scenarioMetricValue(game, scenario, meter.id);
  const label = t(meter.labelKey, { [meter.valueParam || "value"]: value });
  return (
    <Meter
      label={label}
      value={value}
      max={meter.max}
      delta={scenario.rules.getBoatDelta(game, meter.id)}
    />
  );
}

function scenarioMetricValue(game, scenario, id) {
  if (id === "alive_count") {
    return scenario.rules.aliveCount(game);
  }
  return Number(game.boat?.[id] || 0);
}

function statusText(game, scenario, id, labelKey, t) {
  if (id === "turn") {
    return t(labelKey, {
      turn: game.boat.turn,
      max_turn: game.boat.max_turn,
    });
  }
  if (id === "water") {
    return t(labelKey, { water: game.boat.water });
  }
  if (id === "stability") {
    return t(labelKey, { stability: game.boat.stability });
  }
  if (id === "rescue_chance") {
    return t(labelKey, { rescue: game.boat.rescue_chance });
  }
  if (id === "minor_power") {
    return t(labelKey, {
      minor: game.boat.minor_power,
      max_minor: game.boat.max_minor_power,
    });
  }
  if (id === "major_power") {
    return t(labelKey, { major: game.boat.major_power });
  }
  return t(labelKey, { value: scenarioMetricValue(game, scenario, id) });
}

function StatValue({ value, delta }) {
  return (
    <span className={cx("stat-value", delta > 0 && "up", delta < 0 && "down")}>
      {value}
      <DeltaValue delta={delta} />
    </span>
  );
}

function DeltaValue({ delta }) {
  if (!delta) {
    return null;
  }
  return (
    <span className={cx("delta-value", delta > 0 && "up", delta < 0 && "down")}>
      ({delta > 0 ? "+" : ""}
      {delta})
    </span>
  );
}

function MetricChip({ label, value, delta }) {
  return (
    <span className="metric-chip">
      {label} <StatValue value={value} delta={delta} />
    </span>
  );
}

function LogList({ game, limit }) {
  const entries = limit ? game.logs.slice(-limit) : game.logs;
  return (
    <div className="log-list">
      {entries.map((entry, index) => (
        <div className="log-entry" key={`${entry.key}-${index}`}>
          {formatLogEntry(game, entry)}
        </div>
      ))}
    </div>
  );
}

function LifeboatVisual({ game, t }) {
  return (
    <div className="boat-visual" role="img" aria-label={t("web.panel.lifeboat")}>
      <svg viewBox="0 0 600 280" focusable="false">
        <defs>
          <linearGradient id="seaGradient" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#d8eee7" />
            <stop offset="52%" stopColor="#8ec7bd" />
            <stop offset="100%" stopColor="#3d8a86" />
          </linearGradient>
          <linearGradient id="boatGradient" x1="0" x2="1">
            <stop offset="0%" stopColor="#8f5142" />
            <stop offset="52%" stopColor="#c98254" />
            <stop offset="100%" stopColor="#6e3f36" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="600" height="280" fill="url(#seaGradient)" />
        <path
          d="M35 214 C108 196 174 196 252 213 C330 230 408 229 565 207 L565 280 L35 280 Z"
          fill="#2f696d"
          opacity="0.42"
        />
        <path
          d="M67 174 C104 109 501 109 535 174 C498 223 113 226 67 174 Z"
          fill="url(#boatGradient)"
          stroke="#44251f"
          strokeWidth="8"
        />
        <path
          d="M116 165 C163 141 441 141 489 165"
          fill="none"
          stroke="#f4c16f"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M137 196 C206 213 392 213 464 196"
          fill="none"
          stroke="#522f2a"
          strokeWidth="7"
          strokeLinecap="round"
          opacity="0.45"
        />
        {game.characters.map((character, index) => {
          const position = LIFEBOAT_POSITIONS[index];
          const tone = characterTone(character);
          const name = characterName(game, character);
          const labelWidth = Math.max(62, Math.min(104, name.length * 12 + 20));
          return (
            <g key={character.id} className={cx("boat-person", !character.alive && "dead")}>
              <circle
                cx={position.x}
                cy={position.y}
                r="24"
                fill={tone.fill}
                stroke={tone.stroke}
                strokeWidth="4"
              />
              <rect
                x={position.x - labelWidth / 2}
                y={position.labelY - 14}
                width={labelWidth}
                height="26"
                rx="8"
                fill="#ffffff"
                stroke={tone.stroke}
                strokeWidth="2"
              />
              <text x={position.x} y={position.labelY + 4} textAnchor="middle">
                {name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function characterTone(character) {
  if (!character.alive) {
    return { fill: "#7b7e82", stroke: "#34383d" };
  }
  if (character.fear >= 80) {
    return { fill: "#d95f55", stroke: "#7d221e" };
  }
  if (character.greed >= 80) {
    return { fill: "#d9a63a", stroke: "#7a4e0f" };
  }
  if (character.morality >= 80) {
    return { fill: "#7ab87a", stroke: "#2f6c3f" };
  }
  return { fill: "#f4ede2", stroke: "#4d5961" };
}

function Meter({ label, value, max, delta = 0 }) {
  const width = `${Math.max(0, Math.min(100, (value / max) * 100))}%`;
  return (
    <div className="meter">
      <div className="meter-label">
        <span>{label}</span>
        <DeltaValue delta={delta} />
      </div>
      <div className="meter-track">
        <span style={{ width }} />
      </div>
    </div>
  );
}

function PanelHeader({ icon, title }) {
  return (
    <div className="panel-header">
      <span aria-hidden="true">{icon}</span>
      <h2>{title}</h2>
    </div>
  );
}
