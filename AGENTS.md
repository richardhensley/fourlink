# fourlink - AI Agent Guidelines

- Static viewer in `site/` (`index.html`, `app.js`, `fourlink.js`, `help.js`, `defaults.js`); no build step, deps via the CDN import map in `site/index.html`. Deployed as a Cloudflare Worker (`wrangler.toml`): `site/` is served as static assets; `src/index.js` only handles the `/api/hit` visit beacon (logs coarse geo, no IP, to Workers Logs; browsers without the `fl_counted` localStorage flag increment the unique-visitor total), `/api/ping` (60s per-tab heartbeat, paused while the tab is hidden; returns `{visitors, online}` from the `Counter` Durable Object, shown in `#stats`), and `/api/feedback` (feedback form, emailed via the `FEEDBACK` send_email binding). Serve locally with `python -m http.server 8765 --directory site` (no API; stats stay blank), or with the Worker via `npx wrangler dev --ip 127.0.0.1 --port 8766 --inspector-port 9339` (default ports are blocked on this machine).
- Python solvers in `python/` (Python 3 + PyYAML). `site/fourlink.js` is a port of `python/fourlink.py`; keep them in sync.
- Verify:
  - `python python/static_4link.py examples/rear-4-link.yaml`
  - `python python/travel_4link.py examples/rear-4-link.yaml`
  - JS/Python parity: see header of `check.mjs`.
  - Viewer in a real browser (PowerShell, server running on 8765): `& "C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new --disable-gpu --enable-logging=stderr --v=0 --user-data-dir="$env:TEMP\chk-prof" --virtual-time-budget=8000 --dump-dom http://127.0.0.1:8765/` and check for `CONSOLE` errors and a filled `<table id="static">`. Use a fresh `--user-data-dir`; the default profile can fail the YAML fetch.
- Coordinate system and YAML layout: README.md. Developer docs: DEVELOPMENT.md.
