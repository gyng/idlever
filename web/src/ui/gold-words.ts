/** Presentation only: persisted exit/ledger words remain stable for accounting. */
export const goldWords = (text: string): string =>
  text
    .replace(/\bbanked\b/gi, (word) => (word === word.toUpperCase() ? "RETREATED" : "retreated"))
    .replace(/\bbank (deposit|withdraw)\b/g, "savings $1")
    // Cut273: a worker comes from building his workplace (the ledger keeps the hire's own reason); a rank stays a rank
    .replace(/\bhire ([a-z_]+) rank\b/g, "rank $1")
    .replace(
      /\bhire ([a-z_]+)\b/g,
      (_, id: string) => `build ${PLACE[id] ?? id.replace(/_/g, " ")}`,
    );
/** Cut273: the workplace each worker's build raised (core `town::WORKPLACES`), lower case for the ledger's words */
const PLACE: Record<string, string> = {
  porter: "haul chest",
  scout: "guildhouse",
  guide: "guildhouse",
  apprentice: "forge",
  clerk: "bank",
  drillmaster: "drill tent",
  kennel_hand: "kennel",
  kennel_keeper: "kennel",
  herald: "quest board",
};
/** Cut 122 §3 (blind 9621b19: `slain · King` read as the King slain): a death's reason names who killed him — `died to the King`,
 *  `died to jackal` — never `slain · X`, which reads as X slain. */
export const deathWhy = (why: string): string => {
  const m = /^slain · (.+)$/.exec(why.trim());
  if (!m) return why;
  const who = m[1].replace(/_/g, " ").trim();
  return /\bking\b/i.test(who)
    ? /* copy:death_line */ "died to the King"
    : /^[A-Z]/.test(who)
      ? /* copy:death_line */ `died to the ${who}`
      : /* copy:death_line */ `died to ${who}`;
};
