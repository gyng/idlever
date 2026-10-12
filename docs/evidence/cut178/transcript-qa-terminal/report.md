# Transcript-first QA — cca75f9

Accepted immutable build at http://127.0.0.1:41263/; seed149; headless phone400×800 at2×. This is QA, not a rating. The operating manual was supplied automatically; this pass was not blind. I read the permitted protocol, human probes, driver operating instructions, and all10 accepted-walk text dumps in order. No gameplay source, design, previous QA, or cards were read.

Conservative actual active reading/decision credit: **1093seconds (18.2minutes)**. Tools, loading, failed locators, buffered collection, waiting, coordinator updates, and report writing were excluded. [Contemporaneous ledger](/home/g/p/riddle/scratchpad/qa_cca75_transcript/ledger.md). Conservative final tool upper count480/500; image reads5/120, each once. Evidence below is in `/home/g/p/riddle/scratchpad/qa_cca75_transcript/`.

Own changes: keep armour, loot armour, Legacy health, insurance off, then Guarded after “better7/8.” Two leash purchases were read and paid ($30 each); one was dropped with a $30 refund. Porter was hired free, then Scout for$113 from its read sheet. Four actual hero Pen entry attempts (heal, return, attack priority, bank threshold; owner Quill/Bloodline1) were locked with no edited fields; an earlier button lookup was not a tap. After the same-save8h return, I selected and applied the offered hero “hp<70%→return” patch, then manually changed its threshold to60% for Sable/Bloodline1 through the earned condition picker. The patch is not counted as a hand edit. Initial navigation alone used fresh; every visit used dev=1&runs=1. No second absence, reset, or synthetic progress.

The return had10runs,2deaths and bestD13. Gold reconciled:969+5322−60−1202=5029. Legacy reconciled:11+43−15=39. The original dump10 exact numerical state was not repeated after my own configurations diverged; its gross-versus-purse misread was reproduced on the live return. Four WebGL ReadPixels driver warnings were recorded; no console.error or pageerror entries were recorded. Audio and GPU performance were unassessed.

## Defect

- **live** · Report → Guarded/Tactics · “best D8” and “Goal D9” behind a modal saying “floor6 38%,” still unchanged after comparison · expected the current forecast target · seed149,058–060; returning to camp in061 showed D9, confirming the older target persisted in the report entry.

## Misread

- **transcript; live mechanism reproduced** · Return · dump10 “+$1698 GOLD EARNED” beside purse$1594 after dump09 purse$201: I read earned as the purse increase · expected net credit or an explicit gross label · accepted10; live072/073 likewise showed +5322 but purse rose4060, with loss/spending explained only in expanded details.
- **transcript; live lock reproduced** · Camp ladder · “PEN / tactics · meet Captain” read linearly as the Pen prerequisite · expected its actual unlock requirement · accepted08/09;042/049/068/069 Pen said “Opens · meet Mother”; later061’s hint became “heirs · first death.” The accepted08 image did not expose this ladder, so I make no claim about its visual attachment.
- **live** · First bank report · “Heading home,” “1/1 FULL HAUL,” but “0/1 RUNS RETURNED”: I expected a hero who came home to count as returned · expected exit types distinguished in the label ·017/021; the fuller10-run report073 makes full haul/return/death mutually exclusive.
- **live** · Orders/second report · “keep armour” followed by found “leather” being “SALVAGED …$4”: I expected armour to be retained · expected the retention exception/capacity stated with this setting ·039/040/046;055 later showed “storage full,” while the storehouse remained unbuilt. I do not assert that the policy executed incorrectly.
- **live** · Report · I opened “carried” expecting carried equipment; it displayed “keep armour / restock on / insure off / legacy health / pack4$450 / porter$0” · expected a setup/spending label ·057.
- **live** · Bank currency · “◆+4” initially looked like Legacy; I expected Legacy5→9 but saw7 · expected the currency named before its separate HUD counter appeared ·044/046; expanded details resolved this as Legacy+2 versus upgrade tokens+5 (including reputation).

## Unexplained

- **live** · Return token balance · pre-absence◆17, report “◆+30 UPGRADE TOKENS,” header◆49 · expected the additional2 tokens to have a visible source ·067/073/077;17+30=47. No claim that the underlying balance is wrong.
- **live** · Death decision · “drink heal … unknown item” and “bank at45% … has heal” exclude both healing and the fallback in the same explanation · expected the screen to explain why unusable unknown healing counts as having heal ·075,t12779;079 later names the locked “has:heal” vocabulary and “buy heal” path.
- **live** · Death progress · “Mother try1 · +2%,” while return says “Mother ·1try · best100%” · expected the percentage’s quantity/source named so these values can be compared ·072/074/075.
- **live** · Priority7 · “bank ⊘ locked · locked” gives two unnamed lock reasons · expected the blocked terms named ·077; the condition picker079 exposes “⊘has:heal / buy heal,” but the priority pill itself does not identify its two reasons.

## Friction

- **live** · Workers · Scout showed “3/3 sends ·$113” with purse$1082, but tapping Scout did not offer a hire; I had to hire the free Porter before Scout became the offered contract · expected direct selection of the affordable ready Scout, or the offer sequence explained ·063/064→065→066/067.

Counts: **defect1 · misread6 · unexplained4 · friction1**. No scores awarded.
