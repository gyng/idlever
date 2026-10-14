import json,sys,statistics,collections
by=collections.defaultdict(list)
for dd in sys.argv[1:]:
    d=json.load(open(dd+'/results.json'))
    for r in d['results']: by[r['label']].append(r)
def fh(r,m): return r['first_hours'].get(str(m),'-')
def fhn(r,m): return r['first_hours'].get(str(m),80)
for lab in sorted(by):
    rs=sorted(by[lab],key=lambda r:r['seed'])
    bests=[r['best'] for r in rs]
    runs=sum(r['runs'] for r in rs); deaths=sum(r['deaths'] for r in rs)
    t=collections.Counter()
    for r in rs:
        for k,v in (r.get('tools') or {}).items():
            if isinstance(v,(int,float)): t[k]+=v
    extra=''
    if t.get('counters_armed'): extra+=f" conv {t['counters']/max(1,t['counters_armed']):.2f} dmg/ctr {t['counter_damage']/max(1,t['counters']):.1f} ctr_dmg/run {t['counter_damage']/runs:.1f} pause/run {t['pause_steps']/runs:.1f} lure/run {t['lure_steps']/runs:.1f} tk/run {t['tool_kills']/runs:.1f}"
    if t.get('shots'): extra+=f" shot_dmg/run {t['shot_damage']/runs:.0f} tk/run {t['tool_kills']/runs:.1f} idle {t['idle_ticks']/max(1,t['sentry_ticks']):.2f} destroyed/run {t['destroyed']/runs:.1f}"
    print(f"{lab:26s} n{len(rs)} med D{statistics.median(bests):g} mean {statistics.mean(bests):.1f} bests {'/'.join(map(str,bests))} lvl {'/'.join(str(r['level']) for r in rs)} h23 {'/'.join(str(fh(r,23)) for r in rs)} h28 {'/'.join(str(fh(r,28)) for r in rs)} medh28 {statistics.median([fhn(r,28) for r in rs]):g} d/run {deaths/runs:.2f}{extra}")
