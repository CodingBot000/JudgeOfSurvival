import {
  characterName,
  characterRole,
  formatLogEntry,
  translate,
} from "../game-adapters/display.js";
import {
  CHARACTER_OVERLAY_ASSETS,
  EVENT_OVERLAY_ASSETS,
} from "./event-overlay-assets.js";

const STRONG_EVENT_IDS = new Set([
  "death",
  "log.death",
  "power_storm",
  "boat_damage",
  "leak_spreads",
  "supplies_crack_hull",
  "panic_outburst",
  "exile_vote",
  "exile_resisted",
  "failed_exile_violent",
  "voluntary_sacrifice",
]);

const STRONG_EVENT_TAGS = new Set([
  "damage",
  "death",
  "exile",
  "sacrifice",
  "violence",
]);

const EVENT_TITLES = {
  death: { ko: "사망", en: "Death" },
  power_storm: { ko: "폭풍", en: "Storm" },
  boat_damage: { ko: "선체 파손", en: "Hull Damage" },
  leak_spreads: { ko: "침수 확산", en: "Leak Spreading" },
  supplies_crack_hull: { ko: "선체 균열", en: "Hull Crack" },
  panic_outburst: { ko: "공포의 폭발", en: "Panic Outburst" },
  exile_vote: { ko: "추방", en: "Exile" },
  exile_resisted: { ko: "추방 저항", en: "Exile Resisted" },
  failed_exile_violent: { ko: "폭력 사태", en: "Violence" },
  voluntary_sacrifice: { ko: "희생", en: "Sacrifice" },
};

export function buildEventOverlayEvent(game, scenario) {
  const entryIndex = latestStrongEntryIndex(game?.logs || []);
  if (entryIndex < 0) {
    return null;
  }

  const entry = game.logs[entryIndex];
  const eventId = entry.eventId || entry.id || entry.key;
  const actor = characterSummary(game, entry.actorId);
  const target = characterSummary(game, entry.targetId);
  const renderedText = formatLogEntry(game, entry, scenario);
  const assetConfig =
    EVENT_OVERLAY_ASSETS[eventId] ||
    EVENT_OVERLAY_ASSETS[entry.id] ||
    EVENT_OVERLAY_ASSETS[entry.key] ||
    {};
  const title = localizedTitle(game, eventId);
  const subtitle = translate(game, "ui.status.turn", {
    turn: game.boat?.turn || entry.turn || 0,
    max_turn: game.boat?.max_turn || 0,
  });
  const overlayId = [
    entryIndex,
    eventId,
    entry.variantSeed || entry.turn || game.boat?.turn || 0,
  ].join(":");

  return {
    id: overlayId,
    eventId,
    title,
    subtitle,
    actor,
    target,
    slides: buildSlides({
      assetConfig,
      actor,
      target,
      entry,
      eventId,
      renderedText,
      title,
    }),
  };
}

export function isStrongOverlayEntry(entry) {
  const eventId = entry?.eventId || entry?.id || entry?.key || "";
  if (STRONG_EVENT_IDS.has(eventId) || STRONG_EVENT_IDS.has(entry?.id)) {
    return true;
  }
  return (entry?.tags || []).some((tag) => STRONG_EVENT_TAGS.has(tag));
}

function latestStrongEntryIndex(logs) {
  for (let index = logs.length - 1; index >= 0; index -= 1) {
    if (isStrongOverlayEntry(logs[index])) {
      return index;
    }
  }
  return -1;
}

function buildSlides({
  assetConfig,
  actor,
  target,
  entry,
  eventId,
  renderedText,
  title,
}) {
  const configuredSlides = Array.isArray(assetConfig.slides)
    ? assetConfig.slides
    : [];
  const slides = configuredSlides.length > 0 ? configuredSlides : [{}];

  return slides.map((slide, index) =>
    normalizeSlide({
      slide,
      actor,
      target,
      entry,
      eventId,
      index,
      renderedText,
      title,
    }),
  );
}

function normalizeSlide({
  slide,
  actor,
  target,
  entry,
  eventId,
  index,
  renderedText,
  title,
}) {
  const imageMode = slide.imageMode || (slide.sceneImageSrc ? "scene" : "character");
  const imageSrc = slide.imageSrc || slide.sceneImageSrc || "";
  const speaker = speakerName(slide, actor, target);
  const text = slide.text || slide.description || renderedText;

  return {
    id: slide.id || `${eventId || entry.id || entry.key}-${index}`,
    imageMode,
    imageSrc,
    imageAlt: slide.imageAlt || title,
    title: slide.title || title,
    text,
    dialogue: slide.dialogue || "",
    speaker,
    caption: slide.caption || "",
    characters: normalizeCharacters(slide, actor, target, imageMode, imageSrc),
  };
}

function normalizeCharacters(slide, actor, target, imageMode, imageSrc) {
  if (imageMode === "scene") {
    return [];
  }

  if (Array.isArray(slide.characters)) {
    return slide.characters
      .map((character) => ({
        id: character.id || character.name || "",
        name: character.name || "",
        role: character.role || "",
        imageSrc: character.imageSrc || "",
        imageAlt: character.imageAlt || character.name || "",
      }))
      .filter((character) => character.imageSrc);
  }

  if (imageSrc) {
    const subject = actor || target;
    return [
      {
        id: subject?.id || "event-image",
        name: slide.characterName || subject?.name || "",
        role: slide.characterRole || subject?.role || "",
        imageSrc,
        imageAlt: slide.imageAlt || subject?.name || "",
      },
    ];
  }

  return [actor, target].filter((character) => character?.imageSrc);
}

function characterSummary(game, characterId) {
  if (!characterId) {
    return null;
  }

  const character = game.characters?.find((candidate) => candidate.id === characterId);
  if (!character) {
    return null;
  }

  return {
    id: character.id,
    name: characterName(game, character),
    role: characterRole(game, character),
    alive: character.alive,
    imageSrc: CHARACTER_OVERLAY_ASSETS[character.id] || "",
  };
}

function speakerName(slide, actor, target) {
  if (slide.speaker) {
    return slide.speaker;
  }
  if (slide.speakerId && actor?.id === slide.speakerId) {
    return actor.name;
  }
  if (slide.speakerId && target?.id === slide.speakerId) {
    return target.name;
  }
  return actor?.name || target?.name || "";
}

function localizedTitle(game, eventId) {
  const language = game.language || "ko";
  const title = EVENT_TITLES[eventId];
  if (title) {
    return title[language] || title.ko || title.en;
  }
  return translate(game, "web.event_overlay.major_event");
}
