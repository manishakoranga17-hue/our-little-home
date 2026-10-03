// Groceries sold at Love Mart, and recipes cooked at the stove.
// `shape` + `color` decide how the item looks inside the fridge.

export const GROCERIES = [
  { id: 'milk', name: 'Milk', icon: '🥛', price: 8, color: '#f4f4f0', shape: 'carton' },
  { id: 'eggs', name: 'Eggs', icon: '🥚', price: 10, color: '#f3e3c3', shape: 'box' },
  { id: 'bread', name: 'Bread', icon: '🍞', price: 8, color: '#d9a35f', shape: 'loaf' },
  { id: 'cheese', name: 'Cheese', icon: '🧀', price: 12, color: '#f2c94c', shape: 'wedge' },
  { id: 'vegetables', name: 'Vegetables', icon: '🥦', price: 10, color: '#5fa35a', shape: 'ball' },
  { id: 'fruit', name: 'Fruit', icon: '🍎', price: 10, color: '#e0524f', shape: 'ball' },
  { id: 'meat', name: 'Steak', icon: '🥩', price: 20, color: '#c4564a', shape: 'box' },
  { id: 'pasta', name: 'Pasta', icon: '🍝', price: 9, color: '#f0d48a', shape: 'box' },
  { id: 'sauce', name: 'Tomato Sauce', icon: '🍅', price: 7, color: '#d2442f', shape: 'jar' },
  { id: 'snacks', name: 'Snacks', icon: '🍿', price: 8, color: '#f7d25c', shape: 'box' },
  { id: 'drinks', name: 'Soda', icon: '🥤', price: 6, color: '#ef7a8a', shape: 'can' },
  { id: 'dessert', name: 'Ice Cream', icon: '🍨', price: 14, color: '#f6c6d8', shape: 'tub' },
];

export const GROCERIES_BY_ID = Object.fromEntries(GROCERIES.map((g) => [g.id, g]));

export const RECIPES = [
  { id: 'breakfast', name: 'Cozy Breakfast', icon: '🍳', needs: { eggs: 1, bread: 1 }, reward: 30, color: '#f7d25c' },
  { id: 'sandwich', name: 'Cheese Sandwich', icon: '🥪', needs: { bread: 1, cheese: 1 }, reward: 25, color: '#e8b45a' },
  { id: 'pasta', name: 'Pasta Night', icon: '🍝', needs: { pasta: 1, sauce: 1 }, reward: 40, color: '#e0703f' },
  { id: 'steak', name: 'Steak Dinner', icon: '🥩', needs: { meat: 1, vegetables: 1 }, reward: 50, color: '#a8503f' },
  { id: 'fruit_salad', name: 'Fruit Salad', icon: '🥗', needs: { fruit: 2 }, reward: 20, color: '#e0524f' },
  { id: 'movie_snacks', name: 'Movie Night Snacks', icon: '🍿', needs: { snacks: 1, drinks: 1 }, reward: 20, color: '#f7d25c' },
  { id: 'sundae', name: 'Ice Cream Sundae', icon: '🍨', needs: { dessert: 1, fruit: 1 }, reward: 30, color: '#f6c6d8' },
  { id: 'milkshake', name: 'Milkshake', icon: '🥤', needs: { milk: 1, dessert: 1 }, reward: 25, color: '#f6c6d8' },
];

export const KITCHEN = {
  restockPerItem: 4, // Love Points per grocery item put in the fridge
  restockMin: 10,
  restockDuration: 2.2,
  cookDuration: 3.2,
  eatReward: 5,
};
