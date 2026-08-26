# Source Layout

The Vite entry point stays in `main.js`, while `app/game.js` composes the game
systems. Shared code is organized by role:

- `app/`: composition/bootstrap and runtime frame-loop orchestration.
- `animation/`: ambient world animation systems.
- `config/`: runtime constants and map/building replacement indexes.
- `camera/`: follow-camera, overview-camera, resize, and lighting control.
- `data/`: authored gameplay data, such as delivery stops.
- `devtools/`: browser inspection and audit APIs.
- `features/environment/`: base terrain patches, legacy road helpers, canal,
  hills, and placement-clearance helpers.
- `features/landmarks/`: real landmark builders and shared landmark helpers.
- `input/`: pointer, touch, run/brake, and keyboard control bindings.
- `navigation/`: collision, walkable-surface, camera-collider, and delivery-target registration.
- `player/`: rider mesh, rider animation, movement, collision stepping, and footstep effects.
- `rendering/`: reusable Three.js geometry, material palette, texture, and renderer helpers.
- `state/`: factories for mutable gameplay state.
- `ui/`: DOM lookup and CSS.
- `world/`: geospatial map loading, OSM rendering, and navigation helpers.

Landmark construction is split under `features/landmarks/`: `populate-stops.js`
dispatches stop kinds; `features/landmarks/alun-alun/` owns the park, roads,
frontages, and traffic around Alun-Alun; mosque, Pendopo, gazebo, and smaller
stop models live in feature-specific files.

The geospatial map activation and old-world cleanup live in
`world/activate-geospatial-world.js`, keeping startup composition separate from
runtime map replacement and navigation registration.
