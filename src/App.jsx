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
  aliveCount,
  canUseMajorPower,
  canUseMinorPower,
  characterJudgement,
  characterName,
  characterRole,
  createInitialState,
  formatLogEntry,
  getCharacterDelta,
  getLanguageOptions,
  isJudgementDone,
  nextTurn,
  renderGameToText,
  requestFinishChapter,
  setLanguage,
  translate,
  useMajorPower,
  useMinorPower,
} from "./game/logic.js";

const NAV_ITEMS = [
  { id: "trial", labelKey: "web.nav.trial", Icon: Waves },
  { id: "roster", labelKey: "web.nav.roster", Icon: Users },
  { id: "log", labelKey: "web.nav.log", Icon: ScrollText },
  { id: "judgement", labelKey: "web.nav.judgement", Icon: Scale },
];

const MINOR_POWERS = [
  { id: "whisper_fear", labelKey: "ui.button.whisper_fear", Icon: Eye },
  { id: "nudge_greed", labelKey: "ui.button.nudge_greed", Icon: Coins },
  { id: "seed_doubt", labelKey: "ui.button.seed_doubt", Icon: ShieldAlert },
  { id: "false_comfort", labelKey: "ui.button.false_comfort", Icon: MessageCircle },
  { id: "heavy_silence", labelKey: "ui.button.heavy_silence", Icon: VolumeX },
];

const MAJOR_POWERS = [
  { id: "reduce_water", labelKey: "ui.button.reduce_water", Icon: Droplets },
  { id: "rumor", labelKey: "ui.button.rumor", Icon: MessageCircle },
  { id: "hidden_food", labelKey: "ui.button.hidden_food", Icon: Package },
  { id: "storm", labelKey: "ui.button.storm", Icon: CloudLightning },
];

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
  const [game, setGame] = useState(() => createInitialState());
  const [screen, setScreen] = useState("trial");
  const done = isJudgementDone(game);
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
    const renderText = () => renderGameToText(game, screen);
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

  const restart = () => {
    setGame(createInitialState(game.language));
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

      <StatusStrip game={game} t={t} />

      <main className="screen-frame">
        {screen === "trial" && (
          <TrialScreen
            game={game}
            t={t}
            onMinorPower={(powerId) => apply((current) => useMinorPower(current, powerId))}
            onMajorPower={(powerId) => apply((current) => useMajorPower(current, powerId))}
          />
        )}
        {screen === "roster" && <RosterScreen game={game} t={t} />}
        {screen === "log" && <LogScreen game={game} t={t} />}
        {screen === "judgement" && <JudgementScreen game={game} t={t} />}
      </main>

      <footer className="action-bar">
        <button
          id="next-turn-btn"
          type="button"
          className="primary-action"
          disabled={done}
          onClick={() => apply(nextTurn)}
        >
          <ChevronRight size={19} aria-hidden="true" />
          <span>{t("ui.button.next_turn")}</span>
        </button>
        <button
          id="finish-chapter-btn"
          type="button"
          disabled={done}
          onClick={() => apply(requestFinishChapter)}
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

function StatusStrip({ game, t }) {
  const items = [
    {
      Icon: Gauge,
      text: t("ui.status.turn", {
        turn: game.boat.turn,
        max_turn: game.boat.max_turn,
      }),
    },
    { Icon: Droplets, text: t("ui.status.water", { water: game.boat.water }) },
    {
      Icon: Waves,
      text: t("ui.status.stability", { stability: game.boat.stability }),
    },
    {
      Icon: HeartPulse,
      text: t("ui.status.rescue", { rescue: game.boat.rescue_chance }),
    },
    {
      Icon: Eye,
      text: t("ui.status.minor_power", {
        minor: game.boat.minor_power,
        max_minor: game.boat.max_minor_power,
      }),
    },
    { Icon: Scale, text: t("ui.status.major_power", { major: game.boat.major_power }) },
  ];

  return (
    <section className="status-strip" aria-label="Chapter status">
      {items.map(({ Icon, text }) => (
        <div className="status-pill" key={text}>
          <Icon size={17} aria-hidden="true" />
          <span>{text}</span>
        </div>
      ))}
    </section>
  );
}

function TrialScreen({ game, t, onMinorPower, onMajorPower }) {
  return (
    <div className="trial-grid">
      <section className="panel lifeboat-panel">
        <PanelHeader icon={<Waves size={18} />} title={t("web.panel.lifeboat")} />
        <p className="boat-guide">{t("web.guide.color")}</p>
        <div className="crisis-block">
          <PanelHeader icon={<Gauge size={18} />} title={t("web.panel.crisis")} />
          <div className="crisis-grid">
            <Meter label={t("web.status.hull", { value: game.boat.hull_damage })} value={game.boat.hull_damage} max={100} />
            <Meter label={t("web.status.ingress", { value: game.boat.water_ingress })} value={game.boat.water_ingress} max={10} />
            <Meter label={t("web.status.load", { value: game.boat.load_pressure })} value={game.boat.load_pressure} max={45} />
            <Meter label={t("web.status.despair", { value: game.boat.despair })} value={game.boat.despair} max={25} />
          </div>
        </div>
        <LifeboatVisual game={game} t={t} />
        <div className="boat-meters">
          <Meter label={t("web.status.food", { food: game.boat.food })} value={game.boat.food} max={6} />
          <Meter label={t("web.status.storm", { level: game.boat.storm_level })} value={game.boat.storm_level} max={4} />
          <Meter label={t("web.status.alive", { count: aliveCount(game) })} value={aliveCount(game)} max={6} />
        </div>
      </section>

      <section className="panel recent-log-panel">
        <PanelHeader icon={<ScrollText size={18} />} title={t("web.panel.recent_log")} />
        <LogList game={game} limit={5} />
      </section>

      <PowerPanel
        game={game}
        t={t}
        onMinorPower={onMinorPower}
        onMajorPower={onMajorPower}
      />
    </div>
  );
}

function PowerPanel({ game, t, onMinorPower, onMajorPower }) {
  const minorDisabled = !canUseMinorPower(game);
  const majorDisabled = !canUseMajorPower(game);

  return (
    <section className="panel power-panel">
      <div className="power-group">
        <PanelHeader icon={<Eye size={18} />} title={t("ui.panel.minor_powers")} />
        <div className="power-status">
          {t("ui.power_status.minor", {
            minor: game.boat.minor_power,
            max_minor: game.boat.max_minor_power,
          })}
        </div>
        <div className="power-buttons">
          {MINOR_POWERS.map(({ id, labelKey, Icon }) => (
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
          ))}
        </div>
      </div>

      <div className="power-group major">
        <PanelHeader icon={<Scale size={18} />} title={t("ui.panel.major_powers")} />
        <div className="power-status">{t("ui.power_status.major", { major: game.boat.major_power })}</div>
        <div className="power-buttons">
          {MAJOR_POWERS.map(({ id, labelKey, Icon }) => (
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
          ))}
        </div>
      </div>
    </section>
  );
}

function RosterScreen({ game, t }) {
  return (
    <section className="wide-screen">
      <PanelHeader icon={<Users size={18} />} title={t("ui.panel.characters")} />
      <div className="character-grid">
        {game.characters.map((character) => (
          <CharacterCard key={character.id} game={game} character={character} t={t} />
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

function JudgementScreen({ game, t }) {
  return (
    <section className="wide-screen judgement-screen">
      <PanelHeader icon={<Scale size={18} />} title={t("web.nav.judgement")} />
      {!isJudgementDone(game) && <p className="pending-text">{t("web.judgement.pending")}</p>}
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

function CharacterCard({ game, character, t }) {
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
        <StatBar game={game} character={character} stat="health" label={t("web.stat.health")} />
        <StatBar game={game} character={character} stat="fear" label={t("web.stat.fear")} />
        <StatBar game={game} character={character} stat="greed" label={t("web.stat.greed")} />
        <StatBar game={game} character={character} stat="trust" label={t("web.stat.trust")} />
        <StatBar game={game} character={character} stat="morality" label={t("web.stat.morality")} />
        <StatBar game={game} character={character} stat="influence" label={t("web.stat.influence")} />
      </div>

      <div className="character-flags">
        {character.has_hidden_resource && <span>{t("web.status.hidden")}</span>}
        <span>
          {t("web.status.counts", {
            betrayal: character.betrayal_count,
            sacrifice: character.sacrifice_count,
            hypocrisy: character.hypocrisy_count,
            instigation: character.instigation_count,
          })}
        </span>
        <span>{t("web.social.target", { value: character.target_pressure || 0 })}</span>
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

      {isJudgementDone(game) && (
        <div className="character-judgement">
          {t("ui.character.judgement", {
            judgement: characterJudgement(game, character),
          })}
        </div>
      )}
    </article>
  );
}

function StatBar({ game, character, stat, label }) {
  const delta = getCharacterDelta(game, character.id, stat);
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

function StatValue({ value, delta }) {
  return (
    <span className={cx("stat-value", delta > 0 && "up", delta < 0 && "down")}>
      {value}
      {delta !== 0 && (
        <span>
          {" "}
          ({delta > 0 ? "+" : ""}
          {delta})
        </span>
      )}
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

function Meter({ label, value, max }) {
  const width = `${Math.max(0, Math.min(100, (value / max) * 100))}%`;
  return (
    <div className="meter">
      <div className="meter-label">
        <span>{label}</span>
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
