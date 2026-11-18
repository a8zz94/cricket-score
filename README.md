# Cricket Score

A live cricket scoring web app. One person scores the match ball by ball, and anyone with the match link can follow the score in real time on their phone or as a live-stream overlay.

Built for scoring club matches (Oxford Strikers), with real-time updates sent over **MQTT publish/subscribe**.

## Features

**Scoring**
- Ball-by-ball scoring: dots, 1s, 2s, 3s, 4s and 6s
- Extras: wides, no-balls and leg byes, with the correct handling of runs off a no-ball
- Wickets and run outs, including choosing which batter is out
- Retired batters, who can come back in later
- Swap strike, change bowler at the end of an over, and edit player names during play
- Undo the last ball
- Target mode for the second innings, showing runs and balls needed

**Scorecards and stats**
- Full batting scorecard, with how and when each batter was out
- Bowling figures: overs, maidens, runs, wickets and economy rate
- Partnerships and run rate
- Export the scorecard as an image

**Live sharing**
- Share a match link (copy it, or send it on WhatsApp) so others can follow live
- A **viewer page** that updates instantly as each ball is scored
- A **broadcast overlay** page, designed to sit on top of a live stream like a TV score graphic

**Match management**
- Create, save and load matches using a match code
- List recent matches, star favourites and delete old ones

## How real-time updates work

The app uses **MQTT**, a lightweight publish/subscribe messaging protocol, over WebSockets with the [Paho JavaScript client](https://www.eclipse.org/paho/).

```
                       ┌──────────────────────┐
  Scorer (index.html)  │                      │  Viewer (watch.html)
  ── publishes ──────► │     MQTT broker      │ ──► subscribes
                       │  topic per match     │
                       │                      │  Overlay (overlay.html)
                       │                      │ ──► subscribes
                       └──────────────────────┘
```

- Each match gets its own **topic**, based on its match code.
- The scorer **publishes** every update to that topic. The viewer and overlay pages **subscribe** to it and update instantly.
- A separate **feedback topic** lets viewers send messages back to the scorer, for example to request the current state when they first join.
- The connection handles **dropouts**: it detects lost connections, sends a heartbeat, and reconnects automatically if publishing fails.
- The broker is configurable in `mqtt-config.js`. It works with public brokers (Mosquitto, EMQX, HiveMQ) or a **self-hosted broker**.

## Pages

| Page | Purpose |
|---|---|
| `index.html` | Scoring screen for the person scoring the match |
| `watch.html?matchCode=…` | Live viewer for anyone following the match |
| `overlay.html?matchCode=…` | Score overlay for live streams |
| `scorecard.html?matchCode=…` | Full live scorecard |

## Tech stack

- **Front end:** HTML, CSS and JavaScript, with jQuery and Bootstrap
- **Real-time messaging:** MQTT over WebSockets (Paho client)
- **Saved matches:** a separate REST API for creating, saving, loading and listing matches

## Running locally

The app is a static site, so any local web server works:

```bash
# from the project folder
python3 -m http.server 8080
# then open http://localhost:8080
```

To change the MQTT broker, edit the `ACTIVE_CONFIG` line in `mqtt-config.js`.

When running on `localhost`, the app expects the match API at `http://localhost:3001/api`. Live scoring and sharing work without it. Only saving and loading matches need the API.

## Credits

Forked from [Sahil3201/cricket-score](https://github.com/Sahil3201/cricket-score) and extended with live MQTT broadcasting, the broadcast overlay, full scoring rules (run outs, leg byes, no-balls, retired batters), partnerships, bowling figures, scorecard export and match management.
