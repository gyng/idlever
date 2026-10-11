# Cut134 — monochrome town character lanterns

Owner request: characters at night in town should have mono lantern/light.

Small pale lantern and neutral light pool in the existing moonlit ink/wash style. Hero, returning parties, hired workers and townsfolk carry it; pets and unhired ghosts do not. Follow bob, direction and arrival/departure opacity. Fade at dusk/dawn; daytime absent. Cosmetic only.

Gates: GL/Canvas night lanterns visible; noon zero character lights; normal visible humans lit;25-walker diagnostic prioritizes character lights within32-light limit. Exact engine save and terrain paint count unchanged across lighting changes, no page errors. Private GPU400/1440 diagnostic night screenshots; types/copy/build and scoped clock/render regressions pass. Complete acceptance required separately before blind release.

Scoped results: types/copy2354zero/build pass; clock36, town-save39, context recovery19 plus cut30town:4/4 PASS60.6s. Private GPU GL/Canvas400/1440 fixture: six normal visible human lanterns at23:00; zero at noon;31 with25 extra walkers; total lights capped32; exact save/cache unchanged, pageerrors0. Phone/desktop diagnostic night screenshots posted inline. Evidence `scratchpad/qa-cut134-lanterns/`. Warm built-town D3D12 NVIDIA3080 crowd PASS: 59.45fps, CPU-p950.90ms, 31 visible lanterns,32 lights.

The initial small-camera GPU probe measured59.67fps/CPU-p950.8ms on D3D12 NVIDIA3080, but only24 visible lanterns despite26 walkers (two outside camera), so its >=25 assertion failed. Original JSON/log retained; repeating in the same four-building fixture used for the scoped crowd proof. Cold/short screenshot CPU samples contain painting/loading costs and are not warm frame-time certification.
