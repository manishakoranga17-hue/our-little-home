# Architecture

## Tech choice

**Three.js + vanilla ES modules, no build step.** It runs in any modern browser, deploys as static files (GitHub Pages / Netlify / Vercel), needs no installs, and every model and texture is generated in code, so there are no asset pipelines.

## Core ideas

1. **Data-driven content.** Rooms, items, chores and the garden are plain data in `src/data/`. Systems never hard-code content.
2. **One serialisable state.** `GameState` holds everything that persists (points, placed items, inventory, task progress, object state, clock, stats, flags). The `SaveSystem` writes it to localStorage with a backup copy, and `sanitizeState()` merges loaded saves onto defaults, so new fields and bad data never crash a load.
3. **Composable components on world objects.** A fixture or item can carry:
   - a **collider** (auto-computed from its bounding box)
   - a **behaviour** (`Behaviours.js`: sit, lamp, tv, fridge…)
   - a **task target** (`TaskSystem.register`)

   All of them register **interactables** with the `InteractionSystem`, which chooses the best one near the player and shows the prompt.
4. **Events, not references.** Systems emit on the `EventBus` (`points:changed`, `task:completed`, `item:placed`, `mode:changed`, `state:dirty`…). The HUD listens to points, and the SaveSystem listens to `state:dirty`. Phase 3 achievements and daily tasks will subscribe to the same events.

## Frame loop (Game._frame)

```
input → time → player → interactions → tasks → furniture behaviours → placement
      → camera → wall cutaway → lighting → effects → HUD → render → autosave
```

## Modes

`title` → `explore` (pointer-locked third-person) ⇄ `decorate` (free cursor, high camera) ⇄ `menu` (shop).
`Game.setMode` handles pointer lock and drag-to-look fallback.

## Key flows

- **Chore:** InteractionSystem picks the task interactable → E → player plays the step animation for `duration` → `TaskSystem._advance` → Economy.earn → hearts, floating "+N ❤", toast → `task:completed` → `state:dirty` → save. Chores respawn after a random cooldown, and their models animate between clean and messy via `userData.setDirt(t)`.
- **Buy → place:** ShopUI → Economy.spend → inventory +1 → PlacementSystem.beginFromInventory (inventory −1, loose entry follows the cursor) → validity check (zone + colliders + player) → place → `state.placed` record → FurnitureSystem.activate (collider/behaviour/task).
- **Move / store / sell:** pick up deactivates the entry's components. Placing reactivates them, storing returns the item to inventory, and selling refunds `sellRefund × price`.
- **Wall cutaway:** wall parts between the camera and the player drop to stubs (`House.updateCutaway`). Invisible shadow proxies keep the lighting stable. Wall art hides with its wall.

## Extension points for later phases

| Phase | Hook |
| --- | --- |
| 2: new rooms, pool | `ROOMS` / `OPENINGS` / `FIXTURES` data; new models; `swim` behaviour |
| 3: fridge, groceries, cooking | `fridge` behaviour already opens; `userData.contents` group is ready for grocery props |
| 3: achievements, daily tasks, levels | subscribe to EventBus events; `state.stats` already counts; items have `unlockLevel` |
| 4: day/night | `TimeSystem.hour` + `Lighting` (sky uniforms, sun); lamps already toggle |
| 4: personal gift content | new data file + hidden interactable objects |
