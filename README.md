# Agentic SOC — Camp Raven

A clickable, single-page narrative demo of an agentic physical security operations centre for a fictional military camp. Built for a client and investor pitch. Everything is mock data; nothing is real.

The drill-down is the metaphor: orbit the 3D camp → click a zone → see the capabilities inside it → see the agents behind them → trace one incident end to end.

## Run it

```
npm install
npm run dev        # http://localhost:5173
npm run build      # static bundle in dist/ — no network calls at runtime
npm run preview    # serve dist/
```

Desktop and big-screen only. Designed for 1920×1080; degrades below 1280px with a notice.

## Demo route (about eight minutes)

1. Open on the map and say nothing for three seconds.
2. Toggle **Camera coverage** (top-left) to show the gaps.
3. Click **HQ Building**. Walk the capability tabs; point at the detection ledger under Video analytics and how much has already been dismissed without a person.
4. Press **Run scenario** (top right). Touch nothing except **Approve** when the queue badge appears. Stop talking at the beat where four alerts become one.
5. Close on **Approvals** and **Governance → Audit log**, not on the 3D.

**Step** starts the scenario in step-through mode: ◀ / ▶| move one beat at a time, so you can pause and talk over any beat. **Reset** returns everything to the opening state.

Keyboard: `Esc` goes up one level everywhere. `⌘K` / `Ctrl+K` opens the command bar. The timeline scrubber under the stage rewinds the whole camp; **Live** returns to now.

## Where things are

```
src/
  app/            App frame, Stage router, Ticker (keeps the demo alive), toasts
  scene/          Three.js camp: campConfig.ts is the whole layout; overlays/ are the render layers
  chrome/         Status bar, nav rail, alert rail, timeline scrubber, command bar (+ commands.ts)
  capabilities/   CapabilityShell.tsx is the shared frame; one folder per capability module
  agents/         Roster, drawer, feed, reasoning chain and the `why` affordance
  governance/     Approval queue, autonomy control, audit log (CSV export), health
  incidents/      Case list, case view, self-writing report
  scenario/       script.ts is the timed beat list; the controller drives it
  data/           All mock data, typed, seeded. copy.ts holds the prose.
  store/          Zustand store: the single source of truth every view reads
  styles/         tokens.css: the palette and type system
```

## Notes

- **Video.** Camera tiles are procedural canvas scenes (fence lines, car parks, corridors, gates, a thermal palette) with the CCTV treatment from the spec applied on top. To use real footage, drop looping MP4s into `public/video/` and list them in `src/data/video.ts`; tiles fall back to the procedural scene for any camera without a file. Bounding boxes are keyframed overlays, not inference.
- **Determinism.** All generated data uses a seeded RNG (`src/lib/rng.ts`). Every run looks the same.
- **Time.** The demo clock starts at 04:17 local and ticks at real speed (`src/lib/time.ts`). All mock timestamps hang off that.
- **Fonts** are bundled (Archivo, Archivo Narrow, IBM Plex Mono via fontsource) so the build works offline.
- **Colour** encodes provenance: agent-authored content is always `--agent` teal; human-authored content is plain text. `--alarm` red means something is genuinely wrong.
- No weapons, targeting or engagement of any kind. Agent proposals are limited to observe, illuminate, alert, dispatch an unmanned observer, notify a human, lock or unlock a door, and raise an incident.

## Smoke test

`node scripts/smoke.mjs basic` builds nothing; it serves `dist/`, drives the app headless with WebGL, screenshots each view into the scratch directory and reports console errors. `node scripts/smoke.mjs full` also steps through the whole scenario. Requires the Playwright Chromium in `/opt/pw-browsers`.
