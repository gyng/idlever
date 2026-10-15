# Density semantic diagnosis,2026-10-16

Original test threshold stays12. Latest raw run has18physical targets/16function keys at320×900,400×900 and402×681. Full labels, rects, tags, classes, enabled state and data IDs are in fold-controls.json.

Callback review: House→camp hooks.hero→openHero; selected row Details→selectBloodline(s.id),openHero; matching resident sprite→chooseActor(id,false)→selectBloodline(id),openHero. These three doors open the same owner Hub, so the selected resident sprite is one genuine duplicated key. Map each to hero-details:<actualowner>; other resident IDs stay distinct. Corrected accounting is15, still FAIL against12. semantic-accounting.json is explicitly derived, not a passing rerun.

Selected Ready jump is not a no-op: after selecting its owner it calls town.scrollIntoView and view.focusHero(), which creates a1800ms visual locator ring and wakes scene rendering. Count it as Locate selected. Guild→openWorks(actualnextworker), distinct from Heroes→roster. Pool→openHeroLife(recovery); device→openHeroLife(rebirth), distinct real panels/commitment purpose; keep both. Gold and Savings are distinct ledger versus transaction panels. Do not exclude diegetic sprite routes merely to pass.

The old density brief includes map objects, not only standalone chrome; new Heroes replaces the old mobile side-opener one-for-one. Current service/resident functions broaden the older inventory. This is a retained usability/function-density gap requiring an explicit design resolution; no budget increase or hidden actors is proposed.

Primary402×681 physical controls:

| Function / target | Label | x,y,w,h CSSpx |
|---|---|---|
| Gold$48036 | Gold$48036 | 116.52,9,76.11,44 |
| Hero Legacy 0 | Hero Legacy 0 | 198.62,9,44,44 |
| settings | settings | 350,9,44,44 |
| send | Delve | 176,106,61,45 |
| hero-details | hero | 227,224,64,45 |
| blacksmith | forge · Upgrade $100 | 97,165,71,51 |
| bank | savings | 238,165,83,51 |
| guild | Guild reception | 122,324,44,44 |
| pool | Recovery pool | 92,270,44,44 |
| device | Clone vat | 303,243,46,44 |
| Vale Ash · Hero details | Vale Ash · Hero details | 47,280,44,44 |
| Bryn Thorn · Hero detail | Bryn Thorn · Hero details | 160,250,44,44 |
| Corin Flint · Hero detai | Corin Flint · Hero details | 126,187,44,44 |
| Bryn Thorn · Bloodline 2 | Bryn Thorn · Bloodline 2 · 1st heir · Ready | 22,444.27,278.55,76.73 |
| hero-details | Bloodline 2 details | 304.55,460.62,75.45,44 |
| tile:heroes | Heroes | 18,555,65,54 |
| tile:journal | Journal | 87,555,65,54 |
| send | Delveauto | 297,568,86,86 |
