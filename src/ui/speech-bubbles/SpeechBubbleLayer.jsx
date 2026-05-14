import React from "react";

export function SpeechBubbleLayer({ bubbles }) {
  const items = bubbles?.items || [];

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="speech-bubble-layer" aria-hidden="true">
      {items.map((item) => (
        <div
          className="speech-bubble"
          key={item.id}
          data-character-id={item.characterId}
          style={{
            "--bubble-left": `${item.anchor.left}%`,
            "--bubble-top": `${item.anchor.top}%`,
          }}
        >
          {item.text}
        </div>
      ))}
    </div>
  );
}
