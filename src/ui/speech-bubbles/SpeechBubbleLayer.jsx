export function SpeechBubbleLayer({ bubble }) {
  if (!bubble) {
    return null;
  }

  return (
    <div
      className="speech-bubble"
      aria-hidden="true"
      data-character-id={bubble.characterId}
    >
      {bubble.text}
    </div>
  );
}
