// The step-by-step guide shown in the top-left card. Each step completes when
// its event fires (optionally filtered by `match`), and pays a bonus.

export const GUIDE_STEPS = [
  { id: 'walk', icon: '🚶', text: 'Walk around with W A S D and look with the mouse', hint: 'Hold Shift to run, Space to jump', event: 'guide:walked', reward: 10 },
  { id: 'chore', icon: '❤', text: 'Do a chore: find a floating ❤ and press E', hint: 'Try making the bed in the bedroom', event: 'task:completed', reward: 25 },
  { id: 'shop', icon: '🛍️', text: 'Press B to open the Love Shop', hint: 'Spend Love Points on furniture & decor', event: 'shop:opened', reward: 10 },
  { id: 'decorate', icon: '🪄', text: 'Press F, click any furniture, then click to place it somewhere new', hint: 'R rotates · G stores · X sells', event: 'item:placed', reward: 25 },
  { id: 'wardrobe', icon: '👕', text: 'Press C (or use the bedroom wardrobe) to change your clothes', hint: 'Try the Date Night look', event: 'wardrobe:closed', reward: 15 },
  { id: 'gaming', icon: '🎮', text: 'Find the Gaming Room and play a game on the PC', hint: "It's next to the living room", event: 'task:completed', match: (p) => p.taskId === 'play_games', reward: 25 },
  { id: 'market', icon: '🛒', text: 'Walk out the front gate to Love Mart and buy groceries', hint: 'Talk to the cashier and press E', event: 'groceries:bought', reward: 25 },
  { id: 'fridge', icon: '🧊', text: 'Bring the groceries home and restock the fridge', hint: 'The fridge is in the kitchen', event: 'fridge:stocked', reward: 25 },
  { id: 'cook', icon: '🍳', text: 'Cook a meal at the stove', hint: 'Eggs + bread make breakfast', event: 'meal:cooked', reward: 30 },
  { id: 'swim', icon: '🏊', text: 'Jump into the pool (Space at the edge) and swim', hint: 'Out through the bar door — E at the edge climbs out', event: 'player:swim', reward: 25 },
];

export const GUIDE_DONE = { icon: '🏡', text: 'You know everything! Keep your castle cozy ❤' };
