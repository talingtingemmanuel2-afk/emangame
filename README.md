# Glimmergrove: Dragonfall

An original browser-based fantasy forest survivor game built with TypeScript, Vite, Phaser 3, Arcade Physics, Phaser Audio, and LocalStorage.

## Play locally

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

## Controls

- WASD or Arrow Keys — move
- Q — dash with brief invulnerability
- Escape — pause or resume
- Mouse / pointer — menus and level-up choices

Weapons and abilities activate automatically. Defeat enemies, collect XP crystals, choose upgrades, break forest objects for supplies, survive ten hard boss-driven waves, slay the Ancient Beast on Wave 5, and overcome the Ancient Forest Dragon on Wave 10.

## Protagonist sheet

`public/assets/player/Girl-Sheet(1).png` is the supplied 1056×24 RGBA sprite sheet. It is sliced into 44 contiguous 24×24 frames:

- Idle down 0–3, left 4–7, right 8–11, up 12–15
- Walk down 16–21, left 22–27, right 28–33, up 34–39
- One-shot KO/death 40–43

Rendering uses nearest-neighbor pixel-art settings with antialiasing disabled and rounded pixels.
