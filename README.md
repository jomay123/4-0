# 4/4 Majors · Golf Draft Simulator

A browser game inspired by [82-0](https://www.82-0.com) and [38-0](https://38-0-0.com). Draft four skill specialists from the DataGolf top 50, merge them into one composite golfer, then simulate a full PGA season. **Goal: win all four majors.**

## How to play

1. Choose **Classic** (stats visible) or **Expert** (hidden ratings).
2. Pull the slot machine to land on a strokes-gained category: OTT, APP, ARG, or PUTT.
3. Draft one of five random golfers from the top 50.
4. Repeat for 4 rounds. Total SG = sum of all four skills.
5. Simulate 16 events and chase the Career Grand Slam (4/4 majors).

## Run locally

```bash
cd golf-draft-sim
npm install
npm run dev
```

Open http://localhost:5173

## Live DataGolf data

The app ships with curated fallback player data modeled on DataGolf strokes-gained ratings. For live rankings:

1. Copy `.env.example` to `.env`
2. Add your [DataGolf API key](https://datagolf.com/api-access)
3. Restart the dev server

To refresh the bundled fallback file:

```bash
DATAGOLF_API_KEY=your_key npm run fetch-players
```

## Simulation

Your four drafted skills merge into one composite player. A full 16-event season is simulated (including all four majors). Tiers are based on major wins — the pinnacle is the Career Grand Slam (4/4).

## Deploy

### Netlify (recommended — easiest)

1. Push this project to a GitHub repository (see below).
2. Go to [netlify.com](https://www.netlify.com) and sign in with GitHub.
3. Click **Add new site → Import an existing project**.
4. Select your repo. Netlify reads `netlify.toml` automatically:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Click **Deploy**. Your site will be live at a `*.netlify.app` URL within a minute.

No environment variables are required — the app uses bundled player data by default.

### GitHub Pages

1. Push the project to GitHub on the `main` branch.
2. In your repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Push to `main` — the workflow in `.github/workflows/deploy.yml` builds and deploys automatically.
5. Your site will be at `https://<username>.github.io/<repo-name>/`.

If using a project URL (not a custom domain root), update `vite.config.ts`:

```ts
base: '/your-repo-name/',
```

Then rebuild and push.

### Manual deploy (either platform)

```bash
npm run build
```

Upload the contents of the `dist/` folder to any static host.
