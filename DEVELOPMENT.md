# Developing fourlink

## Layout

- `site/`: the viewer (`index.html`, `app.js`, `fourlink.js`, `help.js`, `defaults.js`). Static HTML + JS, no build step; dependencies (three.js, js-yaml) load from a CDN via the import map in `index.html`. Only this folder is deployed (Cloudflare Pages, build output directory `site`).
- `site/help.js`: help text for the Data entry and Calculations tabs.
- `site/defaults.js`: the setup the viewer loads on start; keep in sync with `examples/rear-4-link.yaml`.
- `python/`: command-line solvers (Python 3 + PyYAML). `site/fourlink.js` is a port of `python/fourlink.py`; keep them in sync.
- `examples/rear-4-link.yaml`: the example setup for the Python solvers and `check.mjs`.
- `check.mjs`: cross-checks the JS solver against the Python one.

Coordinate system and YAML layout are in the [README](README.md#measuring).

## Viewer

Serve the `site` folder with any static server and open http://127.0.0.1:8765/:

```
python -m http.server 8765 --directory site
```

## Python

```
python python/static_4link.py examples/rear-4-link.yaml         # ride height, every UF hole
python python/travel_4link.py examples/rear-4-link.yaml [hole]  # heave and articulation sweeps
```

## Checks

- Run both Python solvers above against the example.
- JS/Python parity: usage is in the header of `check.mjs`.
- Load the viewer in a browser and confirm there are no console errors and the Static table is filled.
