// Keyboard + mouse state, polled once per frame by the systems that need it.

const isTyping = (e) => {
  const t = e.target;
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
};

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.down = new Set();
    this.pressed = new Set();
    this.lookDX = 0;
    this.lookDY = 0;
    this.wheel = 0;
    this.mouse = { x: 0, y: 0 };
    this.clicks = [];
    this.dragging = false;
    this.dragButtons = []; // which mouse buttons rotate the camera while held

    window.addEventListener('keydown', (e) => {
      if (isTyping(e)) return;
      if (!this.down.has(e.code)) this.pressed.add(e.code);
      this.down.add(e.code);
      if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => {
      this.down.clear();
      this.dragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      if (this.locked || this.dragging) {
        this.lookDX += e.movementX || 0;
        this.lookDY += e.movementY || 0;
      }
    });
    canvas.addEventListener('mousedown', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.clicks.push({ button: e.button, x: e.clientX, y: e.clientY });
      if (!this.locked && this.dragButtons.includes(e.button)) this.dragging = true;
    });
    window.addEventListener('mouseup', () => {
      this.dragging = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener(
      'wheel',
      (e) => {
        this.wheel += Math.sign(e.deltaY);
        e.preventDefault();
      },
      { passive: false },
    );
  }

  get locked() {
    return document.pointerLockElement === this.canvas;
  }

  isDown(codes) {
    if (Array.isArray(codes)) return codes.some((c) => this.down.has(c));
    return this.down.has(codes);
  }

  wasPressed(code) {
    return this.pressed.has(code);
  }

  consumeClick(button = 0) {
    const i = this.clicks.findIndex((c) => c.button === button);
    if (i === -1) return null;
    return this.clicks.splice(i, 1)[0];
  }

  endFrame() {
    this.pressed.clear();
    this.lookDX = 0;
    this.lookDY = 0;
    this.wheel = 0;
    this.clicks.length = 0;
  }
}
