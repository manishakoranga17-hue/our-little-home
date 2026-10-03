// Household task definitions.
//
// A task has one or more steps. Each step is performed at a "target" object in
// the world (a fixture or a placed item that declares `task: '<id>'`).
//
//   reward     Love Points granted when the final step completes
//   cooldown   [min, max] seconds of play time before the chore needs doing again
//   steps[]    verb     -> text on the interaction prompt
//              duration -> seconds the action takes (player plays `anim`)
//              anim     -> player animation: work | wipe | water | pickup
//              fx       -> particles while working: water | bubbles | sparkle
//              carry    -> prop the player carries after this step (multi-step chores)
//   priority   which prompt wins when an object offers several (default 10)
//   emoji      shown in the celebration pop-up
//
// To add a new chore: add an entry here, then tag any fixture/item with
// `task: '<id>'` (see src/data/house.js and src/data/items.js).

export const TASKS = {
  make_bed: {
    emoji: '🛏️',
    name: 'Make the Bed',
    reward: 20,
    cooldown: [240, 360],
    toast: 'Bed made — looks so cozy',
    steps: [{ verb: 'Make Bed', duration: 2.2, anim: 'work', fx: 'sparkle' }],
  },
  wash_dishes: {
    emoji: '🍽️',
    name: 'Wash the Dishes',
    reward: 25,
    cooldown: [220, 340],
    toast: 'Dishes sparkling clean',
    steps: [{ verb: 'Wash Dishes', duration: 3.0, anim: 'work', fx: 'bubbles' }],
  },
  water_plants: {
    emoji: '🌿',
    name: 'Water the Plants',
    reward: 15,
    cooldown: [180, 300],
    toast: 'The plant looks happy',
    steps: [{ verb: 'Water Plant', duration: 1.8, anim: 'water', fx: 'water' }],
  },
  clean_kitchen: {
    emoji: '✨',
    name: 'Clean the Kitchen',
    reward: 30,
    cooldown: [260, 400],
    toast: 'Kitchen counters spotless',
    steps: [{ verb: 'Wipe Counters', duration: 2.6, anim: 'wipe', fx: 'sparkle' }],
  },
  organize_desk: {
    name: 'Organize the Gaming Desk',
    reward: 25,
    cooldown: [240, 360],
    emoji: '🖥️',
    toast: 'Desk organized — battle station ready',
    steps: [{ verb: 'Organize Desk', duration: 2.4, anim: 'work', fx: 'sparkle' }],
  },
  play_games: {
    name: 'Play Video Games',
    reward: 15,
    cooldown: [120, 180],
    priority: 5,
    emoji: '🎮',
    toast: 'GG! You won the match',
    steps: [{ verb: 'Play Video Games', duration: 4.0, anim: 'game', fx: 'sparkle' }],
  },
  clean_bathroom: {
    name: 'Clean the Bathroom',
    reward: 30,
    cooldown: [260, 400],
    emoji: '🧼',
    toast: 'Bathroom sparkling',
    steps: [{ verb: 'Clean Bathroom', duration: 2.6, anim: 'wipe', fx: 'bubbles' }],
  },
  polish_glasses: {
    name: 'Polish the Bar Glasses',
    reward: 20,
    cooldown: [220, 340],
    emoji: '🍸',
    toast: 'Glasses shining',
    steps: [{ verb: 'Polish Glasses', duration: 2.2, anim: 'wipe', fx: 'sparkle' }],
  },
  mow_lawn: {
    name: 'Mow the Lawn',
    reward: 35,
    cooldown: [360, 520],
    emoji: '🌱',
    toast: 'Lawn freshly mowed',
    steps: [{ verb: 'Mow the Lawn', duration: 4.0, anim: 'push', fx: 'sparkle' }],
  },
  clean_pool: {
    name: 'Clean the Pool',
    reward: 40,
    cooldown: [360, 520],
    emoji: '🏊',
    toast: 'Pool crystal clear',
    steps: [{ verb: 'Skim the Pool', duration: 3.2, anim: 'wipe', fx: 'bubbles' }],
  },
  take_out_trash: {
    emoji: '🗑️',
    name: 'Take Out the Trash',
    reward: 20,
    cooldown: [300, 420],
    toast: 'Trash taken out',
    steps: [
      { verb: 'Pick Up Trash Bag', duration: 1.0, anim: 'pickup', carry: 'trashBag' },
      { verb: 'Throw Away Trash', duration: 0.8, anim: 'pickup' },
    ],
  },
};
