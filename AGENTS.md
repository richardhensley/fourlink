# fourlink - AI Agent Guidelines

- Static viewer in `site/` (`index.html`, `app.js`, `fourlink.js`, `help.js`, `defaults.js`); no build step, deps via the CDN import map in `site/index.html`. Only `site/` is deployed (Cloudflare Pages, output directory `site`). Serve locally with `python -m http.server 8765 --directory site`.
- Python solvers in `python/` (Python 3 + PyYAML). `site/fourlink.js` is a port of `python/fourlink.py`; keep them in sync.
- Verify:
  - `python python/static_4link.py examples/rear-4-link.yaml`
  - `python python/travel_4link.py examples/rear-4-link.yaml`
  - JS/Python parity: see header of `check.mjs`.
  - Viewer in a real browser (PowerShell, server running on 8765): `& "C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new --disable-gpu --enable-logging=stderr --v=0 --user-data-dir="$env:TEMP\chk-prof" --virtual-time-budget=8000 --dump-dom http://127.0.0.1:8765/` and check for `CONSOLE` errors and a filled `<table id="static">`. Use a fresh `--user-data-dir`; the default profile can fail the YAML fetch.
- Coordinate system and YAML layout: README.md. Developer docs: DEVELOPMENT.md.
