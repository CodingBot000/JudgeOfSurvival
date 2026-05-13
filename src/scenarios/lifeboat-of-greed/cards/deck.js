import { cardDefinitions, findCardDefinition } from "./definitions.js";

const INITIAL_HAND_SIZE = 3;
const MAX_HAND_SIZE = 4;
const DRAW_INTERVAL_SECONDS = 90;

export function initializeCardsMut(state) {
  state.cards = {
    drawPile: seededShuffle(
      cardDefinitions.map((card) => card.id),
      Number(state.rngSeed || 1),
    ),
    hand: [],
    discardPile: [],
    exhaustPile: [],
    maxHandSize: MAX_HAND_SIZE,
    drawIntervalSeconds: DRAW_INTERVAL_SECONDS,
    nextDrawAtSeconds: DRAW_INTERVAL_SECONDS,
    cardsPlayed: 0,
    lastPlayedCardId: null,
    selectedCardId: null,
    pendingTargetPolicy: null,
  };
  drawCardsMut(state, INITIAL_HAND_SIZE);
}

export function ensureCardStateMut(state) {
  if (!state.cards) {
    initializeCardsMut(state);
    return state.cards;
  }

  state.cards.drawPile ||= [];
  state.cards.hand ||= [];
  state.cards.discardPile ||= [];
  state.cards.exhaustPile ||= [];
  state.cards.maxHandSize = Number(state.cards.maxHandSize || MAX_HAND_SIZE);
  state.cards.drawIntervalSeconds = Number(
    state.cards.drawIntervalSeconds || DRAW_INTERVAL_SECONDS,
  );
  state.cards.nextDrawAtSeconds = Number(
    state.cards.nextDrawAtSeconds || DRAW_INTERVAL_SECONDS,
  );
  state.cards.cardsPlayed = Number(state.cards.cardsPlayed || 0);
  state.cards.lastPlayedCardId ||= null;
  state.cards.selectedCardId ||= null;
  state.cards.pendingTargetPolicy ||= null;
  return state.cards;
}

export function drawCardsMut(state, count = 1) {
  const cards = ensureCardStateMut(state);
  const drawn = [];
  for (let index = 0; index < count; index += 1) {
    if (cards.hand.length >= cards.maxHandSize) {
      break;
    }
    if (cards.drawPile.length === 0) {
      recycleDiscardIntoDrawMut(state);
    }
    const cardId = cards.drawPile.shift();
    if (!cardId) {
      break;
    }
    cards.hand.push(cardId);
    drawn.push(cardId);
  }
  return drawn;
}

export function takeCardFromHandMut(state, cardId) {
  const cards = ensureCardStateMut(state);
  const index = cards.hand.indexOf(cardId);
  if (index < 0) {
    return null;
  }
  const [removedCardId] = cards.hand.splice(index, 1);
  return findCardDefinition(removedCardId);
}

export function movePlayedCardMut(state, card) {
  const cards = ensureCardStateMut(state);
  if (card.exhaustOnPlay) {
    cards.exhaustPile.push(card.id);
  } else {
    cards.discardPile.push(card.id);
  }
  cards.cardsPlayed += 1;
  cards.lastPlayedCardId = card.id;
  cards.selectedCardId = null;
  cards.pendingTargetPolicy = null;
}

function recycleDiscardIntoDrawMut(state) {
  const cards = ensureCardStateMut(state);
  if (cards.discardPile.length === 0) {
    return;
  }
  const shuffleSeed =
    Number(state.rngSeed || 1) +
    cards.cardsPlayed * 97 +
    Math.floor(Number(state.simulation?.elapsedSeconds || 0));
  cards.drawPile = seededShuffle(cards.discardPile, shuffleSeed);
  cards.discardPile = [];
}

function seededShuffle(items, seed) {
  const result = [...items];
  let currentSeed = normalizeSeed(seed);
  for (let index = result.length - 1; index > 0; index -= 1) {
    currentSeed = (currentSeed * 1664525 + 1013904223) >>> 0;
    const swapIndex = currentSeed % (index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function normalizeSeed(seed) {
  const normalized = Number(seed);
  if (!Number.isFinite(normalized)) {
    return 1;
  }
  return Math.abs(Math.floor(normalized)) || 1;
}
