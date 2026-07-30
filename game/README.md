# Tiny Messenger

A small WebGL delivery game built with Vite and Three.js.

## Run Locally

```bash
npm install
npm run dev
```

## Build

Build from this folder to generate the static game files:

```bash
npm run build
```

The Vite output is written to `dist/`. GitHub Actions copies that output into the Pages artifact at `/game/` during deployment.

## Controls

- `A` / `ArrowLeft`: move left
- `D` / `ArrowRight`: move right
- `W` / `ArrowUp`: move forward
- `S` / `ArrowDown`: move backward
- `Space`: slow down

The on-screen analog moves relative to the camera, like a mobile joystick. Use the brake button to slow down.
