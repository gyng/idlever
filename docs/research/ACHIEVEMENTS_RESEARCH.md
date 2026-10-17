# Achievements research (Cut263, 2026-10-18)

Owner request (2026-10-18): "subagent to add achievement systems. research how to make good achievements and
refine plan, then implement". This note is the research half. The contract is
[CUT263_ACHIEVEMENTS.md](../CUT263_ACHIEVEMENTS.md).

Source marks: **[S]** a fetched or searched source (linked); **[mem]** the agent's recall of a game it did not
re-verify this session. Treat [mem] lines as hypotheses about those games, not as citations.

## 1. What makes an achievement good

- **A definition to design against.** Hamari and Eranti (DiGRA 2011) describe an achievement as a challenge with a
  signifying element (name, icon, description), completion logic tied to events in the game, and optional rewards.
  It sits in a meta-game outside any one session. [S][hamari]
  Idlever consequence: each honour is data (name, goal, logic) that observes the game and never changes it.
- **A list of what there is to do.** Google's Todd Kerpelman (GDC Next) argued that achievements should show
  players what there is to do in a game. He favoured stage progress over score thresholds, and warned against
  achievements added at the last minute and against a pile of trivial early ones. [S][pgbiz]
  Idlever consequence: about half the list points at optional systems (pen, oaths, trials, siege, bounty, waystones,
  breeding, bloodlines). Their goals are visible, so the gallery is also a map of the game.
- **Grind only works when it is play the player would do anyway.** "Achievement Design 101" (Gamasutra)
  accepts grindy achievements only when they overlap with normal play. For hard achievements, it asks whether the
  difficulty itself is fun. [S][gd101] (The page returned 403 when fetched; the summary comes from the search
  snippet.)
- **Achievements can change how a game is played, for better or worse.** Jakobsson's Xbox Live community study (GDC
  Europe 2010) gives Geometry Wars' *Pacifism* as one that made the game better. It gives a Turok achievement
  for killing a teammate as one that damaged multiplayer. [S][gdc]
  Idlever consequence: no honour may reward an act that hurts the run or the pacing (dying on purpose, withholding
  automation, idling to a timer).
- **Content gated behind achievements.** Vampire Survivors gates characters, weapons and stages behind
  achievement-like conditions. These range from milestones to hidden curiosities, and the unlocks give the
  game's long-run sense of progress. [S][vs]
  Idlever already gates content on its own systems (the systems curriculum, worker feats, trophies' marks). Using
  honours as a second gate would duplicate those gates, so honours stay outside the progression.
- **Hidden progress and retroactive credit.** Hades' *Fated List of Minor Prophecies* is an in-game, diegetic goal
  list that pays resources. Many prophecies count progress the player made before the entry appeared. [S][hades]
  Slay the Spire keeps 43 achievements, many hidden; most are boss kills or rare run conditions. In 2.0 it
  removed "unfun" achievements and later gave them their own grid screen. [S][sts]
  Idlever consequence: old saves earn their state-based honours retroactively and silently. A critique pass
  removes weak entries before launch, not after.
- **Progress feedback for counted goals.** Steamworks' progress-stat API shows an interim pop-up at significant points
  (its example is 10 of 20 wins). [S][steam]
  Idlever consequence: counted honours show `n/N` in the gallery only. Interim pop-ups are left out because of
  the owner's density preference.
- **Platform patterns [mem].** Xbox and PlayStation both support hidden achievements and trophies, which show a
  placeholder until earned. Common certification guidance is to avoid making achievements missable through the
  story, and to avoid ones that need online play or rare luck. The PlayStation platinum reward is the whole set.

## 2. Idle-specific pitfalls

- **Achievements as multipliers inflate the game [mem].** Cookie Clicker turns achievements into milk, which scales
  the kitten upgrades. Antimatter Dimensions gives production multipliers for achievements and completed rows. Each
  new achievement then becomes a balance lever, and the list turns into a must-do checklist that pacing depends on.
  Idlever already has a pacing contract (the dayplayer gates for IDLE, PICKED and TUNED). Honours that paid power would move those
  gates. **Decision: honours pay no gameplay effect.**
- **Rewarding absence instead of engagement.** In an idle game, time away is free. Any honour that only counts time,
  runs or kills is earned by leaving the game open (for example, 100 homecomings, 1000 slain or package L5 at 200 runs). That turns
  the gallery into a timer and teaches nothing. **Rule: every honour names a place reached, a system used or a
  choice made, never a time or run count.** The existing trophies already cover the count-only goals and keep paying
  their marks (unchanged).
- **Number inflation.** Gold thresholds go stale as the economy is tuned, which the repins show happens often.
  **Rule: no gold-amount thresholds.** Thresholds are tied to content (6 bosses, 6 waystones, 5 legendary
  patterns, 3 buildings, 10 workers).
- **Too many easy ones up front.** Ten honours in the first ten minutes would be noise. The first session should
  earn about 1–3 (gate G4 in the contract).
- **Missable traps.** An honour lost to an early choice, or tied to a time window, is a trap. Every honour is
  lifetime and stays reachable.

## 3. Presentation

- **Toast.** One short, quiet line when an honour lands (≤ 3 words, as the owner's callout budget requires). It
  does not block input and is never shown mid-run. After a long absence, several honours fold into one count
  toast. [S][steam] (overlay notification) [mem] (Hades' quiet prophecy chime)
- **Gallery.** One window, reachable from the Menu, grouped by system, with earned entries first in each group. Each
  entry shows its name, its ≤ 5-word goal, and either `n/N` or the day it was earned. Slay the Spire's move to a
  dedicated grid is the model. [S][sts]
- **Hidden.** A secret honour shows as `?` with no goal until it is earned. Only about 10% of the list is secret
  (3 of 32 at launch, each reading a curious act of the player rather than a state a bot reaches), enough for curiosity without becoming a guessing game. [S][sts] [mem] (platform hidden flags)
- **Density.** Following the owner's preference, the gallery stays judicious and quiet, never intimidating: one
  count in the header, no percentages, no rarity, no locked-icon clutter. Unearned non-secret entries are dimmed,
  not padlocked.

## Sources

- [hamari] Hamari, J. & Eranti, V. (2011). *Framework for Designing and Evaluating Game Achievements.* DiGRA 2011.
  https://dl.digra.org/index.php/dl/article/view/545
- [gdc] Jakobsson, M. *Achievement Design: Lessons From an Xbox Live Community Study.* GDC Europe 2010.
  https://gdcvault.com/play/1013729/Achievement-Design-Lessons-From-an
- [pgbiz] PocketGamer.biz, "Google: achievements matter, but only if you do them right" (Kerpelman, GDC Next).
  https://www.pocketgamer.biz/google-achievements-matter-but-only-if-you-do-them-right/
- [gd101] Game Developer (Gamasutra), "Achievement Design 101". https://www.gamedeveloper.com/design/achievement-design-101
  and "The Right Kind of Carrot". https://www.gamedeveloper.com/design/the-right-kind-of-carrot
- [steam] Steamworks documentation, *Stats and Achievements*. https://partner.steamgames.com/doc/features/achievements
- [hades] Hades Wiki, *Fated List of Minor Prophecies*. https://hades.fandom.com/wiki/Fated_List_of_Minor_Prophecies/Hades_II
  and Prima Games' Hades guide. https://primagames.com/gaming/hades-guide-mirror-of-night-upgrades-fated-list-of-prophecies
- [sts] Slay the Spire achievements guide. https://commonsensegamer.com/slay-the-spire-achievements-guide-how-to-unlock-them-all/
  and the Steam changelog. https://steamcommunity.com/sharedfiles/filedetails/changelog/2995777696
- [vs] Prima Games, *All Achievements in Vampire Survivors*. https://primagames.com/tips/all-achievements-in-vampire-survivors-listed
- Antimatter Dimensions wiki (guide). https://antimatter-dimensions.fandom.com/wiki/Guide . The multiplier details
  above are [mem]; the wiki page fetched this session did not state them.
- Repo context: `research/idle-attraction.md` ("a dense achievement/quest ledger doubles as a to-do list for
  the next check-in"; "Collecting tons of achievements?" as one place the fun can be).
