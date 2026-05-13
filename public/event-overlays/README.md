Place future event overlay images in this folder. Files under `public` are served
from the site root, so `public/event-overlays/characters/soldier.png` is used in
code as `/event-overlays/characters/soldier.png`.

Recommended paths:
- `public/event-overlays/characters/<character-id>.png`
- `public/event-overlays/events/<event-id>/<slide-name>.png`
- `public/event-overlays/scenes/<scene-name>.png`

Wire those files through `src/event-overlay/event-overlay-assets.js`.
