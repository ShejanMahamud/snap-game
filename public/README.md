# SNAP

Rubber-band gem slicing. Plain ES modules, no build step.

```
index.html          markup for every screen (panels)
css/style.css       styles
js/main.js          entry: wires the layers, then boot()
js/core/            dom handles, constants, seeded rng
js/model/           MODEL  - state (S), store, progression, campaign, twists, badges, gift
js/systems/         LOGIC  - band physics, wave generator, slicing/scoring, boss, stage rules
js/view/            VIEW   - canvas render, fx, audio, share card, ui/ panels
js/controller/      CTRL   - input, game flow (start/end), update loop
```

Rules: all mutable game state lives in `S` (js/model/state.js). Systems change `S`,
views read it, controllers connect input and the loop to both. Persistent data lives
in `store` (localStorage key `snapband.v1`).
