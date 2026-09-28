# Developing fourlink

## Layout

- `index.html`, `app.js`, `fourlink.js`, `help.js`: the viewer. Static HTML + JS, no build step; dependencies (three.js, js-yaml) load from a CDN via the import map in `index.html`. Deployed as a static site from the repo root.
- `help.js`: hover help text for the Data entry and Calculations tabs.
- `python/`: command-line solvers (Python 3 + PyYAML). `fourlink.js` is a port of `python/fourlink.py`; keep them in sync.
- `examples/rear-4-link.yaml`: the example setup the viewer loads on start.
- `check.mjs`: cross-checks the JS solver against the Python one.

Coordinate system and YAML layout are in the [README](README.md#measuring).

## Viewer

Serve the folder with any static server and open http://127.0.0.1:8765/:

```
python -m http.server 8765
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
