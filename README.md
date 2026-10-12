<h1 align="center">
  <img src="web/public/art/title-wordmark-v1.webp" alt="Riddle" width="480">
</h1>

<p align="center"><strong>An idle roguelike. The hero walks. You make the plan.</strong></p>

<p align="center">
  <a href="https://gyng.github.io/riddle/">Play the alpha</a> ·
  <a href="#run-locally">Run locally</a> ·
  <a href="docs/WORK_QUEUE.md">Work queue</a>
</p>

Build a town. Equip a hero. Choose skills, stances and tactics. Your hero explores
and fights on their own. Hire workers to keep expeditions running while you are
away. Return to read the report and choose the next upgrades.

The dungeon has a bottom. A bad plan makes a short trip.

<p align="center">
  <img src="docs/screenshots/town.png" alt="A settled town with workshops, workers and a dungeon entrance" width="240">
  <img src="docs/screenshots/combat.png" alt="A live dungeon fight with hero health, combat log and watch controls" width="240">
  <img src="docs/screenshots/class-skills.png" alt="The Fighter skill tree with Warden and Reaver skills ready to learn" width="240">
</p>

*Town, combat and class skills. These are development screenshots. The hosted
alpha can use an earlier build; its banner shows the build date.*

## Start small

1. Build the free house. Your first hero arrives.
2. Send the hero into the dungeon. Watch the run or return to town.
3. Choose gear and tactics as they become available.
4. Hire the scout to send heroes while you are away.
5. Learn class skills and improve the town as you progress.
6. Open the pen later to write your own combat rules.

A new depth record secures the gold carried so far. A death loses the hero and the
gold carried since that checkpoint. The bloodline keeps its Legacy and class
progress. Read the cause of death. Change the plan. Send the next heir.

## Make it yours

- **Five classes:** Fighter, Rogue, Ranger, Caster and Gunner. Each has a
  cumulative skill tree. Class levels provide skill picks. Reset a tree for free
  at home.
- **A growing town:** build workshops and hire named workers. They take over
  jobs you first do by hand.
- **Several bloodlines:** run different builds with shared town gold. Keep
  each bloodline's skills and Legacy across heirs.
- **A record of each run:** inspect combat, read death traces and replay past
  runs. Use what happened to improve the next plan.
- **A living home:** local time sets the light. Grass moves in the wind. Town
  characters carry lanterns at night.

## Run locally

Install Rust, Node.js and pnpm. From the repository root:

```sh
rustup target add wasm32-unknown-unknown
cargo install wasm-pack --locked --version 0.13.1
pnpm --dir web install --frozen-lockfile
tools/wasm.sh --ship
tools/dev.sh
```

Open [localhost:5219](http://localhost:5219/). The first engine build takes longer
than later builds. After a Rust change, use `tools/wasm.sh` for a fast rebuild.
Use `?engine=fake` to work on the interface without the real engine.

## Work on the game

Rust owns the game rules. The web client displays state and sends player choices.
The renderer draws the town and dungeon. Every sprite has a primitive fallback.

| Task | Command |
|---|---|
| Check engine tests, types and copy | `tools/verify.sh --quick` |
| Check critical client journeys | `pnpm --dir web -s test` |
| Check all current client features | `pnpm --dir web -s test:full` |
| Run the wider client audit | `pnpm --dir web -s test:exhaustive` |

**Status: development alpha.** Some validation checks remain open. Read the
[current handoff](docs/HANDOFF.md) before resuming work. The handoff records passing checks and unresolved failures.

Pushes, pull requests and manual workflow runs validate the site. Publish a
versioned GitHub release to deploy its tagged build to [GitHub Pages](https://gyng.github.io/riddle/).
Alpha releases deploy too. A push alone does not deploy.

| Area | Read next |
|---|---|
| Design and game rules | [Plan](PLAN.md) · [Idle automation contract](docs/CUT30_5.md) |
| Current work and priorities | [Handoff](docs/HANDOFF.md) · [Work queue](docs/WORK_QUEUE.md) |
| Art and rendering | [Art bible](art/ART.md) · [Art direction](docs/ART_DIRECTION.md) |
| Validation and playtesting | [Validation tiers](docs/DEV_VALIDATION_TIERS.md) · [Rating protocol](eval/RATING.md) |
