// Tiny publish/subscribe hub. Systems talk to each other through events so
// they stay decoupled (e.g. Economy doesn't know the HUD exists).
//
// Events used across the game:
//   points:changed   { balance, delta, reason }
//   task:completed   { taskId, instanceId, reward }
//   task:step        { taskId, instanceId, step }
//   item:purchased   { itemId }
//   item:placed      { uid, itemId }
//   item:stored      { itemId }
//   item:sold        { itemId, refund }
//   mode:changed     { mode, prev }
//   day:changed      { day }
//   state:dirty      (no payload) -> triggers a debounced save

export class EventBus {
  constructor() {
    this.handlers = new Map();
  }

  on(event, fn) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event).add(fn);
    return () => this.off(event, fn);
  }

  off(event, fn) {
    this.handlers.get(event)?.delete(fn);
  }

  emit(event, payload) {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const fn of [...set]) {
      try {
        fn(payload);
      } catch (err) {
        console.error(`[EventBus] handler for "${event}" failed`, err);
      }
    }
  }
}
