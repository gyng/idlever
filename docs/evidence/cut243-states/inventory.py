"""Explicit unproved state obligations. Never turns a source match into runtime acceptance."""
from pathlib import Path
import json
root=Path(__file__).resolve().parent
source=json.loads((root.parent/'cut243/source-routes.json').read_text())
# Each entry names actual route-specific states/actions, not a generic family pass.
scopes={
'pickClass':'selected class; genuinely owned/available/locked class; actual choice versus cancel; away gate; refusal',
'renameSet':'actual edit button; current saved name; typed empty/max12 name; Escape cancellation; Enter/OK commit; focus return; accessible input label',
'openStartPicker':'native start options; actual selected/affordable/short options; pending forecast; cancel; deliberate change; refusal/stale result',
'openOrders':'real on/off/current order choices; savings/apprentice ownership gating; public change; away owner; full scroll; focus restore',
'openRoutePicker':'seen native fork; selected near/far; pending/ready reach; choose/cancel; genuine missing fork; late forecast owner',
'openChronicle':'earned entries and empty history; full scroll; return focus; genuine event detail',
'review':'real available/selected path or style; native blocked reason; review Cancel; allowed confirm; pending/refusal/stale owner; focus restore',
'openSeek':'actual unlocked seek options and quoted cost; insufficient and owned/current states; cancel; allowed/refused transaction',
'openForge':'native affordable/owned/locked/reserved kit; actual explicit buy; rejection/busy; free reuse; nested card/branch; every scroll segment',
'openGoldSheet':'earned receipts/settlements; empty sections; all disclosure and scroll; focus restore; local paper text/controls',
'openHeroHub':'all five tab states; owner selected/away/recovering; actual resident switch; secondary entry and Back/Close focus; child states separately',
'openHeroLife':'actual home/away/recovery/rebirth offers; active/blocked reason; review Cancel/confirm/refusal; owner migration; private ledger',
'heroRoster':'actual one/two/three residents; actual cap/price/insufficient state;250Gold founding confirmation; Scout settings return; Cancel; explicit confirmed charge',
'openJournal':'actual Journal tabs; earned/empty lists; tasks/quest/glossary disclosures; scrolling; keyboard focus after refresh',
'openDiscovery':'actual unseen/seen legendary discovery; full item text; Close/focus; no synthetic item ownership',
'openLooks':'actual current cosmetic selection and other choices; accessible selected state; Cancel/current-click exact save; explicit different look; focus chain',
'openOathBoard':'actual locked/available/staked/claimable/forfeit oath; quoted stakes; cancel/confirm/refusal; full scroll',
'openPackages':'native owned/equipped/locked/away packages; every variant; comparative details and scroll; deliberate equip; refusal/busy; selection semantics',
'rowsFold':'actual pen requirement child; earned locked/unlocked conditions and rows; Close and focus; non-hover access',
'openRules':'real owned pet and its actual rules; selected/away/empty availability; scrolling and Back focus',
'openLedger':'genuine encountered companion/counter entries; locked/empty/owned filters; disabled reason; all scroll and focus states',
'openDropSheet':'actual pen full-own-row entry; real patch replacement candidates; least-fired marking; Cancel and allowed/refused replacement; diagnostic window is insufficient',
'openPreparationForge':'real ready plot versus standing Forge; manual free construction; refusal/busy/stale current owner; exact canceled state',
'openQuest':'genuine active/done/empty quest; actual swapped target and refusal; details; full scroll; focus return',
'openReplay':'earned existing replay; unavailable/empty replay; actual controls/floors; Close/focus and exact state',
'openFoldReplay':'actual existing fold reel; progress/finished/unavailable states; actual floor controls; Close/focus',
'returnPick':'actual pending pick; full offers; selected/locked/available reason; Cancel; deliberate allow/refusal/busy/private owner',
'openRuns':'actual log/heirs filters and selected tabs; earned/empty history; every fold/scroll; actual card/replay child; focus restore',
'openRunCard':'actual earned log-card entry; complete stats/causes/build; unavailable replay; child navigation/Close/focus',
'openRunReplay':'retained actual run replay; actual floor/again controls; unavailable/finished states; Close/focus',
'openSettings':'actual toggle/range/input state; debug/export/import validation; reset/main-menu confirmations; nested caller return; invalid import/error',
'tacticObserver':'observed actual tactic entry and event; full details; unknown/empty facts; Close/focus',
'openBank':'native balance/capacity and available deposit/withdraw; zero/full/insufficient/refusal; explicit transactions; input labeling; focus',
'openHeroClass':'actual available/owned/current/locked classes; home/away change/refusal; full picker; Cancel/focus',
'traceChip':'actual earned death trace chip; full receipt/turn/row details; every scroll segment; Close/focus; no uncached invented verdict',
'openRowSheet':'real death-row occurrence; actual acted/unmet condition; full trace/why; child open/Close/focus',
'openRowsSheet':'actual package/card authored rows; native locked reason; every row disclosure; focus',
'pickCond':'real authored pen row; available/locked/current condition; input and threshold keyboard; Cancel/apply/refusal; anchored focus',
'pickVerb':'real authored pen row; available/locked/current action; target/needs/cooldown child states; Cancel/apply; anchored focus',
'openWhy':'actual authored row and concrete condition/action reasons; all tokens; Close/focus',
'openUnlockSheet':'native actual available/locked unlock; quoted Marks; free/paid/insufficient; review Cancel/confirm/refusal/busy',
'openOwnedSheet':'actual owned unlock; native revoke/remove gate; Cancel/allowed/refused; selected and focus states',
'openWorks':'each actual worker/rank branch locked/available/hired/first-act state; explicit quote/refusal/pending; full branch scroll; focus',
'renderConsole':'actual More overflow entry; anchored exceptions; selected/hover/keyboard/touch/focus and owner change',
'wideCols':'actual depth-reference visible entry; complete copy; Close/focus; no false hidden-entry pass',
'renderTown':'actual ready plot preview via public inspect; hidden-unready contract; manual-build versus inspect; Cancel/focus',
'renderDeath':'actual cached cause/trace/outcome/morgue; exact specific opener class; full disclosures and scroll; remedy gate; dark-scene focus',
'renderEnding':'actual earned King-clear and ascension offer; quoted Gold; review Cancel/confirm/refusal; private owner; no fabricated clear flag',
'reviewDescent':'actual earned descent tier/challenge catalogue; selected/blocked class/path/affix; Cancel/confirm/refusal; focus',
'renderWatch':'actual live Watch options; real time/exit/gated state; nested controls; Close/focus; exact read-only paths',
' townCrier':'actual named worker/hero/event announcements; empty/current/full scroll; Close/focus',
' townGraveyard':'actual earned deaths/titles; empty/selected; every segment; child details and Close/focus',
}
rows=[]
for r in source['routes']:
 owner=r['owner']; text=scopes.get(owner) or scopes.get(' '+owner)
 assert text,(r['id'],owner)
 rows.append({'routeId':r['id'],'source':r['path'],'owner':owner,'classes':r['classes'],'material':r['materialClassification'],'missingProofs':[x.strip() for x in text.split(';')],'status':'pending route-specific runtime proof; prior default/diagnostic records remain scoped','entryStateEvidence':[],'applicability':'Each named state still needs native/source applicability audit; no unobserved state is certified or silently excluded.'})
report={'scope':'Complete56-route explicit state obligations, before new safe-entry batch. Structural inventory alone is not acceptance. Requirements: Cut243 §§1–8, queue10/30. Native grants or chosen-offer fabrication prohibited.','routes':rows,'nextBatch':['Heroes actual founding confirmation and Scout-settings return/cancel, only if real auto_send/price/cap permit','Saved setup actual rename entry, empty/max12 input/cancel and keyboard focus','Hero Appearance actual current/available selected choices, current-click/cancel exact save','Hero Skills actual native available class skill/style review Cancel; blocked reason otherwise, without grants'],'universalMissing':['Every applicable state at contract widths/scales and complete scroll segments','Actual text/control/focus material contrast samples; previously measured defaults cannot cover new children','Actual input methods, focus chain, confirmation cancellation/refusal and100-refresh where route refreshes','Runtime-reachable earned empty/away/blocked/error states; diagnostic transport is supplemental only']}
(root/'state-obligations.json').write_text(json.dumps(report,indent=2)+'\n')
print(len(rows),'explicit route state inventories; no runtime passes inferred')
