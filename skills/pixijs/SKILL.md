---
name: pixijs
description: PixiJS game and interactive application development patterns — sprites, containers, animation loops, input handling, and performance optimization.
---

# PixiJS Development

## When to Use

- Building 2D games or interactive applications
- Creating animated visualizations
- Building canvas-based UIs with high performance
- Working with sprite sheets, particle systems, or WebGL rendering

## Setup

```bash
npm install pixi.js
```

```typescript
import { Application, Sprite, Container, Ticker, Assets } from 'pixi.js';
```

## Application Bootstrap

```typescript
const app = new Application();

await app.init({
  width: 800,
  height: 600,
  backgroundColor: 0x1099bb,
  antialias: true,
  resolution: window.devicePixelRatio || 1,
  autoDensity: true,
});

document.getElementById('game')!.appendChild(app.canvas);
```

## Core Patterns

### Asset Loading

```typescript
// Preload assets with manifest
const manifest = {
  bundles: [
    {
      name: 'game',
      assets: [
        { alias: 'player', src: 'assets/player.png' },
        { alias: 'enemy', src: 'assets/enemy.png' },
        { alias: 'spritesheet', src: 'assets/sprites.json' },
      ],
    },
  ],
};

await Assets.init({ manifest });
const assets = await Assets.loadBundle('game');
```

### Scene Management

```typescript
class Scene extends Container {
  constructor() {
    super();
  }

  update(delta: number): void {
    // Override in subclasses
  }

  destroy(): void {
    super.destroy({ children: true });
  }
}

class GameScene extends Scene {
  private player: Sprite;

  constructor() {
    super();
    this.player = Sprite.from('player');
    this.player.anchor.set(0.5);
    this.player.position.set(400, 300);
    this.addChild(this.player);
  }

  update(delta: number): void {
    this.player.rotation += 0.01 * delta;
  }
}
```

### Game Loop

```typescript
let currentScene: Scene;

function setScene(scene: Scene): void {
  if (currentScene) {
    app.stage.removeChild(currentScene);
    currentScene.destroy();
  }
  currentScene = scene;
  app.stage.addChild(currentScene);
}

app.ticker.add((ticker) => {
  currentScene?.update(ticker.deltaTime);
});

setScene(new GameScene());
```

### Input Handling

```typescript
// Pointer events on sprites
sprite.eventMode = 'static';
sprite.cursor = 'pointer';

sprite.on('pointerdown', (event) => {
  console.log('Clicked at', event.global.x, event.global.y);
});

// Keyboard input
const keys: Record<string, boolean> = {};

window.addEventListener('keydown', (e) => { keys[e.code] = true; });
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

// In game loop
function handleInput(player: Sprite, delta: number): void {
  const speed = 5 * delta;
  if (keys['ArrowLeft']) player.x -= speed;
  if (keys['ArrowRight']) player.x += speed;
  if (keys['ArrowUp']) player.y -= speed;
  if (keys['ArrowDown']) player.y += speed;
}
```

### Sprite Sheets

```typescript
import { Spritesheet, AnimatedSprite } from 'pixi.js';

// Load spritesheet (JSON + image)
const sheet = await Assets.load('spritesheet');

// Create animated sprite from frames
const frames = ['walk1.png', 'walk2.png', 'walk3.png', 'walk4.png']
  .map(name => sheet.textures[name]);

const character = new AnimatedSprite(frames);
character.animationSpeed = 0.15;
character.play();
```

## Performance Tips

- Use `Container.cacheAsTexture()` for static complex groups
- Pool and reuse sprites instead of creating/destroying
- Use `ParticleContainer` for large numbers of similar sprites
- Minimize texture swaps by using sprite sheets (texture atlases)
- Set `eventMode = 'none'` on non-interactive sprites
- Use `app.ticker` instead of `requestAnimationFrame` directly
- Destroy unused textures and sprites to prevent memory leaks

## Common Architecture

```
src/
├── main.ts              # App initialization
├── scenes/
│   ├── Scene.ts         # Base scene class
│   ├── MenuScene.ts     # Main menu
│   ├── GameScene.ts     # Gameplay
│   └── GameOverScene.ts # End screen
├── entities/
│   ├── Player.ts        # Player entity
│   └── Enemy.ts         # Enemy entity
├── systems/
│   ├── InputSystem.ts   # Input handling
│   ├── PhysicsSystem.ts # Collision detection
│   └── AudioSystem.ts   # Sound management
├── assets/
│   └── manifest.ts      # Asset manifest
└── utils/
    ├── math.ts          # Vector math, random
    └── pool.ts          # Object pooling
```

## Best Practices

- Use TypeScript for type safety with PixiJS APIs
- Separate game logic from rendering (ECS or scene-based)
- Load assets before showing scenes (use loading screens)
- Handle window resize: `app.renderer.resize(width, height)`
- Use `Assets.load()` (v8) over deprecated `Loader` (v6)
- Clean up event listeners and timers in `destroy()`
- Test game logic independently from PixiJS rendering
