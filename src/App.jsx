import { useEffect, useMemo, useRef, useState } from "react";
import {
  Anchor,
  Bug,
  ChevronRight,
  CloudLightning,
  Coins,
  Droplets,
  Eye,
  FastForward,
  FolderOpen,
  Gauge,
  HeartPulse,
  Languages,
  MessageCircle,
  Package,
  Pause,
  Play,
  RotateCcw,
  Save,
  Scale,
  ScrollText,
  ShieldAlert,
  Skull,
  Users,
  VolumeX,
  Waves,
  X,
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
import {
  hasCompatibleSave,
  loadSavedGame,
  saveGameToStorage,
} from "./game-adapters/local-save.js";
import { EventOverlay } from "./event-overlay/EventOverlay.jsx";
import { buildEventOverlayEvent } from "./event-overlay/event-overlay-model.js";

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
  package: Package,
  waves: Waves,
  heart: HeartPulse,
  eye: Eye,
  scale: Scale,
};

const STATUS_OVERVIEW = [
  { id: "water", icon: "droplets", labelKey: "ui.status.water" },
  { id: "food", icon: "package", labelKey: "web.status.food" },
  { id: "stability", icon: "waves", labelKey: "ui.status.stability" },
  { id: "rescue_chance", icon: "heart", labelKey: "ui.status.rescue" },
  { id: "minor_power", icon: "eye", labelKey: "ui.status.minor_power" },
  { id: "major_power", icon: "scale", labelKey: "ui.status.major_power" },
];

const PORTRAIT_PATHS = {
  chairman: "/character/portrait/portrait_vale_rich.png",
  nurse: "/character/portrait/portrait_clara_nurse.png",
  soldier: "/character/portrait/portrait_grant_soldier.png",
  influencer: "/character/portrait/portrait_mia_influencer.png",
  elder: "/character/portrait/portrait_theo_old_man.png",
  stowaway: "/character/portrait/portrait_nox_hooded_man.png",
};

const SCENE_POSITIONS = {
  chairman: { left: 30, top: 42 },
  nurse: { left: 47, top: 33 },
  soldier: { left: 64, top: 43 },
  influencer: { left: 38, top: 62 },
  elder: { left: 55, top: 61 },
  stowaway: { left: 72, top: 62 },
};

const CHARACTER_BADGES = {
  chairman: { ko: "탐욕", en: "Greedy", tone: "greed" },
  nurse: { ko: "도덕", en: "Moral", tone: "moral" },
  soldier: { ko: "질서", en: "Order", tone: "order" },
  influencer: { ko: "선동", en: "Instigator", tone: "instigator" },
  elder: { ko: "쇠약", en: "Weak", tone: "weak" },
  stowaway: { ko: "의심", en: "Suspect", tone: "suspect" },
};

const cx = (...parts) => parts.filter(Boolean).join(" ");

export default function App() {
  const scenario = DEFAULT_SCENARIO;
  const [game, setGame] = useState(() => createInitialState(scenario));
  const [screen, setScreen] = useState("trial");
  const [activePanel, setActivePanel] = useState(null);
  const [debugOpen, setDebugOpen] = useState(false);
  const [dismissedOverlayId, setDismissedOverlayId] = useState("");
  const [hasSavedGame, setHasSavedGame] = useState(() => hasCompatibleSave(scenario));
  const done = scenario.rules.isJudgementDone(game);
  const previousDone = useRef(done);
  const autoSaveElapsed = useRef(game.simulation?.elapsedSeconds || 0);
  const t = (key, params) => translate(game, key, params);
  const pendingEventOverlay = useMemo(
    () => buildEventOverlayEvent(game, scenario),
    [game, scenario],
  );
  const eventOverlay =
    pendingEventOverlay?.id === dismissedOverlayId ? null : pendingEventOverlay;

  useEffect(() => {
    document.title = t("ui.title.game");
    document.documentElement.lang = game.language;
  }, [game.language]);

  useEffect(() => {
    if (done && !previousDone.current) {
      setScreen("judgement");
      setActivePanel("judgement");
      saveCurrentGame(game);
    }
    previousDone.current = done;
  }, [done]);

  useEffect(() => {
    if (done || game.simulation?.isPaused) {
      return undefined;
    }
    let previousTimestamp = performance.now();
    const intervalId = window.setInterval(() => {
      const now = performance.now();
      const deltaSeconds = (now - previousTimestamp) / 1000;
      previousTimestamp = now;
      setGame((current) =>
        applyCommand(current, scenario, {
          type: COMMAND_TYPES.ADVANCE_TIME,
          deltaSeconds,
        }),
      );
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [done, game.simulation?.isPaused, scenario]);

  useEffect(() => {
    const elapsed = game.simulation?.elapsedSeconds || 0;
    if (!done && elapsed - autoSaveElapsed.current >= 30) {
      saveCurrentGame(game);
    }
  }, [done, game]);

  useEffect(() => {
    const renderTextFor = (state) => {
      const snapshot = JSON.parse(renderGameToText(state, screen, scenario));
      snapshot.event_overlay = eventOverlay
        ? {
            id: eventOverlay.id,
            eventId: eventOverlay.eventId,
            title: eventOverlay.title,
            slide_count: eventOverlay.slides.length,
          }
        : null;
      return JSON.stringify(snapshot);
    };
    const renderText = () => renderTextFor(game);
    window.render_game_to_text = renderText;
    window.advanceTime = (seconds = 60) => {
      const next = applyCommand(game, scenario, {
        type: COMMAND_TYPES.ADVANCE_TIME,
        deltaSeconds: seconds,
        ignorePause: true,
        useTimeScale: false,
      });
      setGame(next);
      return renderTextFor(next);
    };
    return () => {
      delete window.render_game_to_text;
      delete window.advanceTime;
    };
  }, [eventOverlay, game, scenario, screen]);

  const languageOptions = useMemo(() => getLanguageOptions(game), [game.language]);

  const apply = (updater) => {
    setGame((current) => updater(current));
  };

  const runCommand = (command) => {
    setGame((current) => applyCommand(current, scenario, command));
  };

  const saveCurrentGame = (state = game) => {
    saveGameToStorage(state, scenario);
    autoSaveElapsed.current = state.simulation?.elapsedSeconds || 0;
    setHasSavedGame(true);
  };

  const continueSavedGame = () => {
    const saved = loadSavedGame(scenario);
    if (!saved) {
      setHasSavedGame(false);
      return;
    }
    setGame(saved);
    setScreen("trial");
    setActivePanel(null);
    setDismissedOverlayId("");
    autoSaveElapsed.current = saved.simulation?.elapsedSeconds || 0;
  };

  const restart = () => {
    setGame(createInitialState(scenario, { language: game.language }));
    setScreen("trial");
    setActivePanel(null);
    setDismissedOverlayId("");
  };

  const openPanel = (panel) => {
    setActivePanel(panel);
    setScreen(panel);
  };

  const closePanel = () => {
    setActivePanel(null);
    setScreen("trial");
  };

  const closeEventOverlay = () => {
    if (pendingEventOverlay) {
      setDismissedOverlayId(pendingEventOverlay.id);
    }
  };

  return (
    <div className={cx("app-shell", debugOpen && "debug-open")}>
      <header className="app-header">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            <Anchor size={26} />
          </span>
          <div>
            <h1>{t("ui.title.game")}</h1>
            <p>
              {t("ui.title.chapter_1")} ·{" "}
              {t("ui.status.turn", {
                turn: game.boat.turn,
                max_turn: game.boat.max_turn,
              })}
            </p>
          </div>
        </div>

        <StatusStrip game={game} scenario={scenario} t={t} />
      </header>

      <TimeControlBar
        game={game}
        done={done}
        t={t}
        onPausedChange={(isPaused) =>
          runCommand({ type: COMMAND_TYPES.SET_PAUSED, isPaused })
        }
        onTimeScaleChange={(timeScale) =>
          runCommand({ type: COMMAND_TYPES.SET_TIME_SCALE, timeScale })
        }
      />

      {debugOpen && (
        <NarrativeDebugPanel
          game={game}
          scenario={scenario}
          onClose={() => setDebugOpen(false)}
        />
      )}

      <main className="screen-frame">
        <TrialScreen
          game={game}
          scenario={scenario}
          t={t}
          onOpenPanel={openPanel}
          onPlayCard={(cardId) =>
            runCommand({ type: COMMAND_TYPES.PLAY_CARD, cardId })
          }
        />
      </main>

      <footer className="action-bar">
        <button
          id="nav-roster"
          type="button"
          className="utility-action"
          onClick={() => openPanel("roster")}
        >
          <Users size={17} aria-hidden="true" />
          <span>{t("web.nav.roster")}</span>
        </button>
        <button
          id="nav-log"
          type="button"
          className="utility-action"
          onClick={() => openPanel("log")}
        >
          <ScrollText size={17} aria-hidden="true" />
          <span>{t("web.nav.log")}</span>
        </button>
        <button
          id="details-panel-btn"
          type="button"
          className="utility-action"
          onClick={() => openPanel("details")}
        >
          <Gauge size={17} aria-hidden="true" />
          <span>{t("web.panel.crisis")}</span>
        </button>
        <button
          id="nav-judgement"
          type="button"
          className="utility-action"
          onClick={() => openPanel("judgement")}
        >
          <Scale size={17} aria-hidden="true" />
          <span>{t("web.nav.judgement")}</span>
        </button>
        <button
          id="settings-panel-btn"
          type="button"
          className="utility-action"
          onClick={() => openPanel("settings")}
        >
          <Languages size={17} aria-hidden="true" />
          <span>{t("ui.status.language")}</span>
        </button>
        <button
          id="debug-toggle-btn"
          type="button"
          className={cx("utility-action", "debug-toggle", debugOpen && "active")}
          aria-controls="narrative-debug-panel"
          aria-expanded={debugOpen}
          onClick={() => setDebugOpen((current) => !current)}
        >
          <Bug size={17} aria-hidden="true" />
          <span>디버그</span>
        </button>
        <button
          id="continue-save-btn"
          type="button"
          className="utility-action"
          disabled={!hasSavedGame}
          onClick={continueSavedGame}
        >
          <FolderOpen size={17} aria-hidden="true" />
          <span>{t("web.continue")}</span>
        </button>
        <button
          id="save-game-btn"
          type="button"
          className="utility-action"
          onClick={() => saveCurrentGame(game)}
        >
          <Save size={17} aria-hidden="true" />
          <span>{t("web.save")}</span>
        </button>
        <div className="action-spacer" />
        <button id="restart-btn" type="button" onClick={restart}>
          <RotateCcw size={18} aria-hidden="true" />
          <span>{t("ui.button.restart")}</span>
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
        {debugOpen && (
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
        )}
      </footer>

      {activePanel && (
        <OverlayPanel
          title={overlayTitle(activePanel, t)}
          icon={overlayIcon(activePanel)}
          onClose={closePanel}
        >
          {activePanel === "roster" && (
            <RosterScreen game={game} scenario={scenario} t={t} />
          )}
          {activePanel === "log" && <LogScreen game={game} t={t} />}
          {activePanel === "judgement" && (
            <JudgementScreen game={game} scenario={scenario} t={t} />
          )}
          {activePanel === "details" && (
            <DetailsPanel game={game} scenario={scenario} t={t} />
          )}
          {activePanel === "settings" && (
            <SettingsPanel
              game={game}
              languageOptions={languageOptions}
              t={t}
              onLanguageChange={(language) =>
                apply((current) => setLanguage(current, language))
              }
              hasSavedGame={hasSavedGame}
              onSave={() => saveCurrentGame(game)}
              onLoad={continueSavedGame}
            />
          )}
        </OverlayPanel>
      )}

      <EventOverlay
        event={eventOverlay}
        labels={{
          close: t("web.event_overlay.close"),
          nextImage: t("web.event_overlay.next_image"),
        }}
        onClose={closeEventOverlay}
      />
    </div>
  );
}

function overlayTitle(panel, t) {
  if (panel === "details") {
    return t("web.panel.crisis");
  }
  if (panel === "settings") {
    return t("ui.status.language");
  }
  const navItem = NAV_ITEMS.find((item) => item.id === panel);
  return navItem ? t(navItem.labelKey) : panel;
}

function overlayIcon(panel) {
  if (panel === "details") {
    return <Gauge size={19} />;
  }
  if (panel === "settings") {
    return <Languages size={19} />;
  }
  const navItem = NAV_ITEMS.find((item) => item.id === panel);
  const Icon = navItem?.Icon || ScrollText;
  return <Icon size={19} />;
}

function OverlayPanel({ title, icon, children, onClose }) {
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <aside className="modal-panel" role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header">
          <PanelHeader icon={icon} title={title} />
          <button type="button" className="modal-close" onClick={onClose} aria-label="닫기">
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </aside>
    </div>
  );
}

function NarrativeDebugPanel({ game, scenario, onClose }) {
  const entries = game.logs.slice(-6).map((entry, index) => ({
    index: Math.max(0, game.logs.length - 6) + index + 1,
    id: entry.id || entry.key,
    type: entry.type || "legacy",
    eventId: entry.eventId || "",
    storyletId: entry.storyletId || "",
    templateId: entry.templateId || "",
    actorId: entry.actorId || "",
    targetId: entry.targetId || "",
    text: formatLogEntry(game, entry, scenario),
  }));
  const memory = game.narrativeMemory || {};

  return (
    <aside
      id="narrative-debug-panel"
      className="debug-panel"
      aria-label="Narrative debug"
    >
      <header className="debug-panel-header">
        <div>
          <h2>내러티브 디버그</h2>
          <p>최근 로그 6개의 storylet/template 추적</p>
        </div>
        <button type="button" className="debug-close" onClick={onClose} aria-label="디버그 닫기">
          <X size={18} aria-hidden="true" />
        </button>
      </header>

      <div className="debug-memory">
        <DebugMemoryChip label="storylets" value={memory.recentStoryletIds?.length || 0} />
        <DebugMemoryChip label="templates" value={memory.recentTemplateIds?.length || 0} />
        <DebugMemoryChip label="phrases" value={memory.recentPhraseIds?.length || 0} />
      </div>

      <div className="debug-log-list">
        {entries.length === 0 && <p className="debug-empty">기록 없음</p>}
        {entries.map((entry) => (
          <article className="debug-log-entry" key={`${entry.index}-${entry.id}`}>
            <div className="debug-log-title">
              <strong>#{entry.index}</strong>
              <span className={cx("debug-type", entry.type === "narrative" && "narrative")}>
                {entry.type}
              </span>
            </div>
            <div className="debug-fields">
              <DebugField label="id" value={entry.id} />
              <DebugField label="event" value={entry.eventId} />
              <DebugField label="storylet" value={entry.storyletId} />
              <DebugField label="template" value={entry.templateId} />
              <DebugField label="actor" value={entry.actorId} />
              <DebugField label="target" value={entry.targetId} />
            </div>
            <p className="debug-rendered">{entry.text}</p>
          </article>
        ))}
      </div>
    </aside>
  );
}

function DebugMemoryChip({ label, value }) {
  return (
    <span className="debug-memory-chip">
      {label} <strong>{value}</strong>
    </span>
  );
}

function DebugField({ label, value }) {
  return (
    <div className="debug-field">
      <span>{label}</span>
      <code>{value || "-"}</code>
    </div>
  );
}

function TimeControlBar({
  game,
  done,
  t,
  onPausedChange,
  onTimeScaleChange,
}) {
  const simulation = game.simulation || {};
  const elapsed = simulation.elapsedSeconds || 0;
  const duration = simulation.runDurationSeconds || 1;
  const nextEventIn = Math.max(0, (simulation.nextEventAtSeconds || 0) - elapsed);
  const nextCardAt = game.cards?.nextDrawAtSeconds || simulation.nextCardDrawAtSeconds || 0;
  const nextCardIn = Math.max(0, nextCardAt - elapsed);
  const progress = `${Math.max(0, Math.min(100, (elapsed / duration) * 100))}%`;

  return (
    <section className="time-control-bar" aria-label="Simulation time controls">
      <div className="time-progress" aria-hidden="true">
        <i style={{ width: progress }} />
      </div>
      <div className="time-readout">
        <strong>
          {t("web.time.elapsed", {
            elapsed: formatDuration(elapsed),
            duration: formatDuration(duration),
          })}
        </strong>
        <span>{t("web.time.next_event", { time: formatDuration(nextEventIn) })}</span>
        <span>{t("web.time.next_card", { time: formatDuration(nextCardIn) })}</span>
      </div>
      <div className="time-actions">
        <button
          id="time-play-toggle"
          type="button"
          disabled={done}
          onClick={() => onPausedChange(!simulation.isPaused)}
        >
          {simulation.isPaused ? (
            <Play size={16} aria-hidden="true" />
          ) : (
            <Pause size={16} aria-hidden="true" />
          )}
          <span>{simulation.isPaused ? t("web.time.resume") : t("web.time.pause")}</span>
        </button>
        <button
          id="time-scale-1"
          type="button"
          className={cx(simulation.timeScale === 1 && "active")}
          disabled={done}
          onClick={() => onTimeScaleChange(1)}
        >
          <Play size={15} aria-hidden="true" />
          <span>{t("web.time.speed_1x")}</span>
        </button>
        <button
          id="time-scale-2"
          type="button"
          className={cx(simulation.timeScale === 2 && "active")}
          disabled={done}
          onClick={() => onTimeScaleChange(2)}
        >
          <FastForward size={15} aria-hidden="true" />
          <span>{t("web.time.speed_2x")}</span>
        </button>
      </div>
    </section>
  );
}

function StatusStrip({ game, scenario, t }) {
  const items = STATUS_OVERVIEW.map((metric) => {
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

function TrialScreen({ game, scenario, t, onOpenPanel, onPlayCard }) {
  const focusCharacter = selectFocusCharacter(game);

  return (
    <div className="trial-grid">
      <section className="panel survivor-panel">
        <div className="panel-title-row">
          <PanelHeader icon={<Users size={18} />} title={t("ui.panel.characters")} />
          <span className="alive-badge">
            {t("web.status.alive", { count: scenario.rules.aliveCount(game) })}
          </span>
        </div>
        <CompactRoster game={game} scenario={scenario} t={t} />
      </section>

      <section className="panel scene-panel">
        <div className="panel-title-row">
          <PanelHeader icon={<Waves size={18} />} title={t("web.panel.lifeboat")} />
          <button
            type="button"
            className="tiny-panel-button"
            onClick={() => onOpenPanel("details")}
          >
            <Gauge size={15} aria-hidden="true" />
            <span>{t("web.panel.crisis")}</span>
          </button>
        </div>
        <LifeboatVisual game={game} t={t} />
        <CurrentFocus game={game} scenario={scenario} character={focusCharacter} t={t} />
        <section className="recent-log-panel">
          <div className="panel-title-row">
            <PanelHeader icon={<ScrollText size={18} />} title={t("web.panel.recent_log")} />
            <button
              type="button"
              className="tiny-panel-button"
              onClick={() => onOpenPanel("log")}
            >
              <span>{t("web.nav.log")}</span>
            </button>
          </div>
          <LogList game={game} limit={4} t={t} />
        </section>
      </section>

      <CardHandPanel
        game={game}
        scenario={scenario}
        t={t}
        onPlayCard={onPlayCard}
      />
    </div>
  );
}

function CompactRoster({ game, scenario, t }) {
  return (
    <div className="compact-roster">
      {game.characters.map((character) => (
        <article
          key={character.id}
          className={cx("compact-character", !character.alive && "dead")}
        >
          <img src={portraitPath(character)} alt="" aria-hidden="true" draggable="false" />
          <div className="compact-character-main">
            <div className="compact-character-header">
              <div>
                <h2>{characterName(game, character)}</h2>
                <p>{characterRole(game, character)}</p>
              </div>
              <CharacterBadge game={game} character={character} />
            </div>
            <div className="mini-stat-grid">
              <MiniStat
                label={t("web.stat.health")}
                value={character.health}
                delta={scenario.rules.getCharacterDelta(game, character.id, "health")}
                tone="health"
              />
              <MiniStat
                label={t("web.stat.fear")}
                value={character.fear}
                delta={scenario.rules.getCharacterDelta(game, character.id, "fear")}
                tone="fear"
              />
              <MiniStat
                label={t("web.stat.greed")}
                value={character.greed}
                delta={scenario.rules.getCharacterDelta(game, character.id, "greed")}
                tone="greed"
              />
              <MiniStat
                label={t("web.stat.trust")}
                value={character.trust}
                delta={scenario.rules.getCharacterDelta(game, character.id, "trust")}
                tone="trust"
              />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function CharacterBadge({ game, character }) {
  const badge = CHARACTER_BADGES[character.id] || {
    ko: character.alive ? "생존" : "사망",
    en: character.alive ? "Alive" : "Dead",
    tone: character.alive ? "order" : "dead",
  };
  return (
    <span className={cx("character-badge", badge.tone, !character.alive && "dead")}>
      {game.language === "en" ? badge.en : badge.ko}
    </span>
  );
}

function MiniStat({ label, value, delta, tone }) {
  const width = `${Math.max(0, Math.min(100, value))}%`;
  return (
    <div className={cx("mini-stat", tone)}>
      <span>{label}</span>
      <div className="mini-track" aria-hidden="true">
        <i style={{ width }} />
      </div>
      <StatValue value={value} delta={delta} />
    </div>
  );
}

function CardHandPanel({ game, scenario, t, onPlayCard }) {
  const hand = game.cards?.hand || [];
  const cardsById = scenario.cards?.byId || {};
  const disabled = scenario.rules.isJudgementDone(game) || game.simulation?.isPaused;

  return (
    <section className="panel card-hand-panel">
      <div className="panel-title-row">
        <PanelHeader icon={<Scale size={18} />} title={t("web.card.hand")} />
        {game.simulation?.isPaused && (
          <span className="card-paused-chip">{t("web.card.paused")}</span>
        )}
      </div>
      <div className="card-pile-status">
        {t("web.card.pile_counts", {
          draw: game.cards?.drawPile?.length || 0,
          discard: game.cards?.discardPile?.length || 0,
          exhaust: game.cards?.exhaustPile?.length || 0,
        })}
      </div>
      <div className="card-list">
        {hand.length === 0 && <p className="empty-card-hand">{t("web.card.empty")}</p>}
        {hand.map((cardId) => {
          const card = cardsById[cardId];
          const Icon = POWER_ICONS[card?.sourcePowerId] || Scale;
          return (
            <button
              id={`card-${cardId}`}
              key={cardId}
              type="button"
              className={cx("card-button", card?.tier)}
              title={card ? t(card.descriptionKey) : cardId}
              disabled={disabled || !card}
              onClick={() => onPlayCard(cardId)}
            >
              <span className="card-button-header">
                <Icon size={17} aria-hidden="true" />
                <strong>{card ? t(card.labelKey) : cardId}</strong>
                <em>{card?.rarity || ""}</em>
              </span>
              <span className="card-description">
                {card ? t(card.descriptionKey) : ""}
              </span>
            </button>
          );
        })}
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
      <LogList game={game} t={t} />
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

function DetailsPanel({ game, scenario, t }) {
  return (
    <section className="details-panel">
      <div className="details-grid">
        <div className="details-block">
          <PanelHeader icon={<Gauge size={18} />} title={t("web.panel.crisis")} />
          <div className="meter-grid">
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
        <div className="details-block">
          <PanelHeader icon={<Package size={18} />} title={t("web.panel.supplies")} />
          <div className="meter-grid">
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
        </div>
      </div>
      <p className="boat-guide">{t("web.guide.color")}</p>
    </section>
  );
}

function SettingsPanel({
  game,
  languageOptions,
  t,
  onLanguageChange,
  hasSavedGame,
  onSave,
  onLoad,
}) {
  return (
    <section className="settings-panel">
      <label className="language-select">
        <Languages size={18} aria-hidden="true" />
        <span>{t("ui.status.language")}</span>
        <select
          aria-label={t("ui.status.language")}
          value={game.language}
          onChange={(event) => onLanguageChange(event.target.value)}
        >
          {languageOptions.map((option) => (
            <option key={option.code} value={option.code}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <div className="save-actions">
        <button type="button" onClick={onSave}>
          <Save size={16} aria-hidden="true" />
          <span>{t("web.save")}</span>
        </button>
        <button type="button" disabled={!hasSavedGame} onClick={onLoad}>
          <FolderOpen size={16} aria-hidden="true" />
          <span>{t("web.continue")}</span>
        </button>
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
  if (id === "food") {
    return t(labelKey, { food: game.boat.food });
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

function formatDuration(seconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds || 0)));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
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

function LogList({ game, limit, t }) {
  const listRef = useRef(null);
  const startIndex = limit ? Math.max(0, game.logs.length - limit) : 0;
  const entries = game.logs.slice(startIndex);
  const translateLog = t || ((key, params) => translate(game, key, params));

  useEffect(() => {
    const list = listRef.current;
    if (!list) {
      return undefined;
    }
    const frame = requestAnimationFrame(() => {
      list.scrollTop = list.scrollHeight;
    });
    return () => cancelAnimationFrame(frame);
  }, [game.logs.length, limit]);

  return (
    <div className="log-list" ref={listRef}>
      {entries.map((entry, index) => (
        <div
          className={cx("log-entry", isDeathLogEntry(entry) && "death-log-entry")}
          key={`${entry.key || entry.id}-${startIndex + index}`}
        >
          {isDeathLogEntry(entry) && (
            <DeathLogAlert game={game} entry={entry} t={translateLog} />
          )}
          <div className="log-entry-text">{formatLogEntry(game, entry)}</div>
        </div>
      ))}
    </div>
  );
}

function DeathLogAlert({ game, entry, t }) {
  const name = deathLogTargetName(game, entry);
  return (
    <div className="death-log-alert" role="status">
      <Skull size={18} aria-hidden="true" />
      <strong>{t("web.log.death_alert", { name })}</strong>
    </div>
  );
}

function isDeathLogEntry(entry) {
  return (
    entry?.eventId === "death" ||
    entry?.id === "log.death" ||
    entry?.key === "log.death"
  );
}

function deathLogTargetName(game, entry) {
  const target = game.characters.find((character) => character.id === entry.targetId);
  if (target) {
    return characterName(game, target);
  }
  if (entry.params?.name_key) {
    return translate(game, entry.params.name_key);
  }
  return entry.params?.name || translate(game, "web.log.unknown_deceased");
}

function LifeboatVisual({ game, t }) {
  return (
    <div className="boat-visual" role="img" aria-label={t("web.panel.lifeboat")}>
      <div className="sea-glow" aria-hidden="true" />
      <img
        className="boat-asset"
        src="/background/boat_cutout.png"
        alt=""
        aria-hidden="true"
        draggable="false"
      />
      {game.characters.map((character) => {
        const position = SCENE_POSITIONS[character.id] || { left: 50, top: 50 };
        return (
          <div
            key={character.id}
            className={cx("boat-person", !character.alive && "dead")}
            style={{ left: `${position.left}%`, top: `${position.top}%` }}
          >
            <img src={portraitPath(character)} alt="" aria-hidden="true" draggable="false" />
            <span>{characterName(game, character)}</span>
          </div>
        );
      })}
    </div>
  );
}

function CurrentFocus({ game, scenario, character, t }) {
  if (!character) {
    return null;
  }
  return (
    <section className="current-focus">
      <span className="focus-kicker">{game.language === "en" ? "Current Focus" : "현재 주시"}</span>
      <img src={portraitPath(character)} alt="" aria-hidden="true" draggable="false" />
      <div>
        <h2>
          {characterName(game, character)}
          <span>· {characterRole(game, character)}</span>
        </h2>
        <p>{focusReaction(game, character)}</p>
        <div className="focus-stats">
          <MetricChip
            label={t("web.social.target_label")}
            value={character.target_pressure || 0}
            delta={scenario.rules.getCharacterDelta(game, character.id, "target_pressure")}
          />
          <MetricChip
            label={t("web.social.accusation")}
            value={character.accusation_score || 0}
            delta={scenario.rules.getCharacterDelta(game, character.id, "accusation_score")}
          />
        </div>
      </div>
    </section>
  );
}

function selectFocusCharacter(game) {
  const alive = game.characters.filter((character) => character.alive);
  const candidates = alive.length > 0 ? alive : game.characters;
  return [...candidates].sort((a, b) => focusScore(b) - focusScore(a))[0];
}

function focusScore(character) {
  return (
    Number(character.target_pressure || 0) * 2 +
    Number(character.accusation_score || 0) +
    Number(character.greed || 0) +
    Number(character.fear || 0) -
    Number(character.trust || 0) * 0.3
  );
}

function focusReaction(game, character) {
  const ko = game.language !== "en";
  if (!character.alive) {
    return ko
      ? "더 이상 심판에 응답하지 않습니다."
      : "No longer responds to the trial.";
  }
  if (character.greed >= 75) {
    return ko
      ? "개인 보급품을 지키려는 반응이 가장 강합니다."
      : "Likely reaction: will protect personal resources.";
  }
  if (character.fear >= 70) {
    return ko
      ? "공포가 높아 작은 의심에도 크게 흔들립니다."
      : "Likely reaction: fear makes every doubt sharper.";
  }
  if (character.trust <= 30) {
    return ko
      ? "신뢰가 낮아 표적이 되기 쉽습니다."
      : "Likely reaction: low trust makes them an easy target.";
  }
  if (character.morality >= 75) {
    return ko
      ? "약자를 보호하려는 선택을 할 가능성이 높습니다."
      : "Likely reaction: will try to protect the vulnerable.";
  }
  return ko
    ? "상황 변화에 따라 빠르게 입장을 바꿀 수 있습니다."
    : "Likely reaction: may shift quickly as pressure changes.";
}

function portraitPath(character) {
  return PORTRAIT_PATHS[character.id] || "/character/portrait/portrait_nox_hooded_man.png";
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
