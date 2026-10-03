// Wardrobe: clothing styles, colours and ready-made looks.
// The character's appearance is saved as one `outfit` object in the game state.

export const TOPS = {
  tshirt: { name: 'T-Shirt', icon: '👕' },
  shirt: { name: 'Button Shirt', icon: '👔' },
  longsleeve: { name: 'Long Sleeve', icon: '🧥' },
  hoodie: { name: 'Hoodie', icon: '🧶' },
  tank: { name: 'Tank Top', icon: '🎽' },
  none: { name: 'Shirtless', icon: '💪' },
};

export const BOTTOMS = {
  jeans: { name: 'Jeans', icon: '👖' },
  chinos: { name: 'Chinos', icon: '👖' },
  shorts: { name: 'Shorts', icon: '🩳' },
  swim: { name: 'Swim Trunks', icon: '🩲' },
};

export const SHOES = {
  sneakers: { name: 'Sneakers', icon: '👟' },
  boots: { name: 'Boots', icon: '🥾' },
  slides: { name: 'Slides', icon: '🩴' },
  none: { name: 'Barefoot', icon: '🦶' },
};

export const HAIR = {
  short: { name: 'Short' },
  curly: { name: 'Curly' },
  buzz: { name: 'Buzz Cut' },
  swept: { name: 'Swept Back' },
};

export const FACIAL_HAIR = {
  none: { name: 'Clean Shaven' },
  stubble: { name: 'Stubble' },
  beard: { name: 'Beard' },
};

export const COLORS = ['#f4f1ec', '#2b2d33', '#5b7fb5', '#8fa9c9', '#3f5d8a', '#e8768a', '#c94f5a', '#7fb38f', '#4f7a55', '#f0c987', '#d9a35f', '#8a6446', '#b48ee0', '#ff9f68', '#9aa3ab', '#33475b'];
export const SKIN_TONES = ['#f6d3bd', '#eebc9c', '#e0a885', '#c98e6a', '#a86f4c', '#7d5038'];
export const HAIR_COLORS = ['#2a1e17', '#4a3226', '#6b4429', '#9a6b3f', '#c9a36b', '#1b1b1d', '#8d8d8d'];

export const DEFAULT_OUTFIT = {
  top: 'tshirt', topColor: '#f4f1ec',
  bottom: 'jeans', bottomColor: '#3f5d8a',
  shoes: 'sneakers', shoesColor: '#f4f1ec',
  hair: 'short', hairColor: '#4a3226',
  facialHair: 'stubble',
  skin: '#e0a885',
  autoSwimwear: true, // change into swim trunks automatically in the pool
};

export const SWIM_OUTFIT = { top: 'none', bottom: 'swim', shoes: 'none' };

export const PRESETS = [
  { name: 'Casual', icon: '😎', outfit: { top: 'tshirt', topColor: '#f4f1ec', bottom: 'jeans', bottomColor: '#3f5d8a', shoes: 'sneakers', shoesColor: '#f4f1ec' } },
  { name: 'Cozy', icon: '🧸', outfit: { top: 'hoodie', topColor: '#8fa9c9', bottom: 'chinos', bottomColor: '#2b2d33', shoes: 'sneakers', shoesColor: '#2b2d33' } },
  { name: 'Date Night', icon: '🌹', outfit: { top: 'shirt', topColor: '#33475b', bottom: 'chinos', bottomColor: '#d9a35f', shoes: 'boots', shoesColor: '#8a6446' } },
  { name: 'Summer', icon: '🌞', outfit: { top: 'tank', topColor: '#ff9f68', bottom: 'shorts', bottomColor: '#f0c987', shoes: 'slides', shoesColor: '#2b2d33' } },
  { name: 'Gamer', icon: '🎮', outfit: { top: 'hoodie', topColor: '#2b2d33', bottom: 'shorts', bottomColor: '#2b2d33', shoes: 'slides', shoesColor: '#e8768a' } },
  { name: 'Pool Day', icon: '🏊', outfit: { top: 'none', bottom: 'swim', bottomColor: '#e8768a', shoes: 'slides', shoesColor: '#f4f1ec' } },
];
