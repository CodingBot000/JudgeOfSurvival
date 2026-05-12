import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, X } from "lucide-react";
import "./event-overlay.css";

const cx = (...parts) => parts.filter(Boolean).join(" ");

export function EventOverlay({ event, labels, onClose }) {
  const [slideIndex, setSlideIndex] = useState(0);
  const actionButtonRef = useRef(null);
  const slides = useMemo(() => event?.slides || [], [event]);
  const slide = slides[Math.min(slideIndex, Math.max(slides.length - 1, 0))] || null;
  const hasNext = slideIndex < slides.length - 1;
  const sceneImageSrc =
    slide?.imageMode === "scene" && slide.imageSrc ? slide.imageSrc : "";
  const advanceOrClose = useCallback(() => {
    if (hasNext) {
      setSlideIndex((current) => Math.min(current + 1, slides.length - 1));
      return;
    }
    onClose();
  }, [hasNext, onClose, slides.length]);

  useEffect(() => {
    setSlideIndex(0);
  }, [event?.id]);

  useEffect(() => {
    if (event) {
      actionButtonRef.current?.focus();
    }
  }, [event]);

  useEffect(() => {
    if (!event) {
      return undefined;
    }

    const handleKeyDown = (keyboardEvent) => {
      if (keyboardEvent.key === "Escape") {
        keyboardEvent.preventDefault();
        onClose();
      }
      if (keyboardEvent.key === "ArrowRight") {
        keyboardEvent.preventDefault();
        advanceOrClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [advanceOrClose, event, onClose]);

  if (!event || !slide) {
    return null;
  }

  return (
    <div
      id="event-overlay"
      className="event-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-overlay-title"
    >
      {sceneImageSrc && (
        <div
          className="event-overlay-scene-image"
          aria-hidden="true"
          style={{ backgroundImage: `url("${sceneImageSrc}")` }}
        />
      )}
      <div className="event-overlay-scrim" aria-hidden="true" />

      <div className="event-overlay-topbar">
        {slides.length > 1 && (
          <span className="event-overlay-counter">
            {slideIndex + 1}/{slides.length}
          </span>
        )}
        <button
          id="event-overlay-action-btn"
          ref={actionButtonRef}
          type="button"
          className="event-overlay-action"
          onClick={advanceOrClose}
        >
          {hasNext ? (
            <ChevronRight size={18} aria-hidden="true" />
          ) : (
            <X size={18} aria-hidden="true" />
          )}
          <span>{hasNext ? labels.nextImage : labels.close}</span>
        </button>
      </div>

      <section className={cx("event-overlay-stage", sceneImageSrc && "scene-mode")}>
        {!sceneImageSrc && slide.characters.length > 0 && (
          <div className="event-overlay-characters" aria-label="Event characters">
            {slide.characters.map((character) => (
              <figure className="event-overlay-character" key={character.id}>
                <img
                  src={character.imageSrc}
                  alt={character.imageAlt || character.name}
                  onError={(imageEvent) => {
                    imageEvent.currentTarget.hidden = true;
                  }}
                />
                {(character.name || character.role) && (
                  <figcaption>
                    {character.name && <strong>{character.name}</strong>}
                    {character.role && <span>{character.role}</span>}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        )}

        <div className="event-overlay-copy">
          <p className="event-overlay-kicker">{event.subtitle}</p>
          <h2 id="event-overlay-title">{slide.title}</h2>
          {slide.text && <p className="event-overlay-description">{slide.text}</p>}
          {slide.dialogue && (
            <blockquote className="event-overlay-dialogue">
              {slide.speaker && <cite>{slide.speaker}</cite>}
              <p>{slide.dialogue}</p>
            </blockquote>
          )}
          {slide.caption && <p className="event-overlay-caption">{slide.caption}</p>}
        </div>
      </section>
    </div>
  );
}
