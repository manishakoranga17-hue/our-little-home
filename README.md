# Our Little Home ❤

A cozy 3D home-life sim made as a Boyfriend's Day gift. Walk around the house and garden, do little chores to earn **❤ Love Points**, and spend them in the Love Shop to decorate.

## Run locally

No build step and no Node required. Three.js is vendored in `vendor/`.

```bash
cd Game
python3 -m http.server 8123
# open http://localhost:8123
```

(Any static server works. Opening `index.html` directly via `file://` will **not** work, because ES modules need http.)

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Walk (Shift = run, Space = jump) |
| C | Wardrobe: clothes, hair, beard, skin tone (also at the bedroom wardrobe) |
| Pool | Walk or jump (Space) in to swim; E at the edge to climb out |
| Mouse | Look around (click the game to capture the mouse) |
| E | Interact: do chores, sit, swim, open fridge, cook, shop at Love Mart |
| B | Love Shop (and Storage) |
| F | Decorate mode on/off |
| Decorate: Click | Pick up / place furniture |
| Decorate: R / G / X | Rotate / Store / Sell (50% refund) |
| Decorate: Right-drag, Scroll | Rotate / zoom the view |
| H | How-to-play manual (any time) |
| M | Sound on/off |
| Esc | Pause / close menus / cancel |

Progress autosaves to `localStorage`. **Pause → Start over** wipes it.

## Personalise it ❤

Edit `src/data/personal.js` to set his name and the title/welcome messages.

## Project layout

```
index.html            entry page + import map
styles/main.css       all UI styling
vendor/three/         three.js r169 (+ RoundedBoxGeometry addon)
src/
  main.js             boot
  Game.js             composition root, main loop, modes (title/explore/decorate/menu)
  config.js           tuning numbers & key bindings
  core/               EventBus, Input, CollisionWorld, GameState (+ sanitising), SaveSystem
  data/               ← game content lives here
    personal.js       his name + title / welcome text
    items.js          furniture catalogue (shop + starter items)
    tasks.js          chores, rewards, cooldowns
    house.js          rooms (+ first-visit tips), doors/windows, fixtures, starter layout, outdoor areas
    garden.js         fence, gate, pool deck, lawn, trees, paths
    market.js         Love Mart building, cashier, shelves
    groceries.js      groceries, recipes, kitchen rewards
    guide.js          step-by-step onboarding objectives
    outfits.js        wardrobe: tops, bottoms, shoes, hair, colours, preset looks
  world/              Materials (procedural textures), Models / ModelsRooms / ModelsOutdoor
                      (procedural models), Human (skinned human + clothes), House (walls/floors/cutaway),
                      Garden, Neighborhood (street + Love Mart), Lighting
  entities/           Player (movement, jump, swim, sit) + HumanAnimator (procedural animation)
  systems/            Camera, Interaction, Task, Behaviours, Furniture, Placement,
                      Groceries, Guide, Economy, Time, Effects, Audio
  ui/                 HUD/overlays, Panel base, Shop, Help/Welcome/Grocery/Fridge/Cook panels
```

See `docs/ARCHITECTURE.md` for how the systems talk to each other.

## Adding content

- **New item:** add an entry to `src/data/items.js`. Reuse an existing `model` with different `opts`, or add a builder to `MODELS` in `src/world/Models.js`. Give it `behaviour: { type: 'sit' | 'lamp' | 'tv' | 'fridge' }` and/or `task: '<taskId>'` to make it interactive.
- **New chore:** add to `src/data/tasks.js`, then tag any fixture/item with `task: '<id>'`.
- **New room:** add a rectangle to `ROOMS` in `src/data/house.js` sharing an edge with the house, and a `door` in `OPENINGS`. Walls, floors, colliders and cutaway are generated.
- **New grocery / recipe:** add to `src/data/groceries.js`.
- **New guide step:** add to `src/data/guide.js` (completes when its event fires).
- **Change rewards/prices/starting points:** `src/data/tasks.js`, `src/data/items.js`, `src/config.js`.
