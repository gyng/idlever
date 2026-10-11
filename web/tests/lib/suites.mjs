import { UI_PARTS } from "./ui-parts.mjs";
// Routine coverage prioritizes complete journeys and prior costly failures.
// Tests and assertion limits are shared with the full suite, never relaxed.
export const PARTS = Object.freeze({
  ui: UI_PARTS.map(part => `ui:${part}`),
  clarity: ['core,watch', 'hold', 'card', 'paint', 'deep'].map(part => `clarity:${part}`),
});
export const SMOKE_AREAS = Object.freeze({
  'boot, menu and saves': ['game-menu', 'debug-export'],
  'town and automation': ['first-plot', 'town-save', 'worker-purchases', 'worker-first-act'],
  'multiple heroes': ['bloodline-founding', 'bloodline-training'],
  'packages, pen and forecasts': ['package-selection', 'package-paired', 'pen-edit', 'forecast-requests', 'clarity:paint'],
  'combat, watch and recovery': ['fights:break', 'watch-console', 'watch-live-edge', 'watch-log', 'ctxloss'],
  'gold, supplies and gear': ['checkpoint-gold', 'routine-keep', 'exit-keep-close', 'report-supply-limit', 'forge-requests'],
  'death and advice': ['death-actions', 'death-fix-discovery', 'king-advice-scope'],
  'reports and accounting': ['report-reading', 'report-class-xp', 'numbers-agree'],
  'classes and endgame': ['class-switch', 'gunner-observer', 'legacy-wire', 'numbered-descents', 'post-clear-town'],
  'responsive UI and town lighting': ['screens', 'ui:frame', 'town-clock'],
});
export const SMOKE = Object.freeze([...new Set(Object.values(SMOKE_AREAS).flat())]);
export const expand = name => PARTS[name] ?? [name];
export function selectSuite(args, all) {
  let smoke = false, full = false, list = false, report = null;
  const requested = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--') continue; // pnpm forwards its argument separator
    if (arg === '--smoke') smoke = true;
    else if (arg === '--full') full = true;
    else if (arg === '--list') list = true;
    else if (arg === '--report') {
      if (!args[i + 1] || args[i + 1].startsWith('--')) throw Error('--report requires an output path');
      report = args[++i];
    } else if (arg.startsWith('--')) throw Error(`Unknown suite option: ${arg}`);
    else requested.push(arg);
  }
  if (smoke && full) throw Error('Choose --smoke or --full, not both');
  const suite = requested.length ? 'targeted' : smoke ? 'smoke' : 'full';
  const names = [...new Set(requested.length ? requested.flatMap(expand) : smoke ? SMOKE : all)];
  const available = new Set(all.map(name => name.split(':')[0]));
  for (const name of names) if (!available.has(name.split(':')[0])) throw Error(`Unknown client group: ${name}`);
  return { suite, names, list, report, fullCount: all.length };
}
