import fs from 'node:fs';
import crypto from 'node:crypto';
const source=fs.readFileSync('web/src/ui/watch.ts','utf8');
const start=source.indexOf('  function deadStretch(was: number, v: number): number {');
if(start<0)throw Error('Production function not found');
const end=source.indexOf('\n  function ',start+1);
let fn=source.slice(start,end).trim();
fn=fn.replace('function deadStretch(was: number, v: number): number {','function deadStretch(was, v) {');
// Execute the actual read-only function body. Stub only surrounding snapshot facts.
const prefix=`let deadSince=-1;const EARLY_TRAVEL=8,ONE_MAX=8,RATE={fights:16,fast:32,one:1};const DEAD_RAMP_MS=300,DEAD_STEP_MS=200,DEAD_MAX_FIGHTS=128,FAST_MAX=128,DEAD_LAND_MS=150,DEAD_TICKS=35;const descends=[],beat=null,beatNext=[],endingFrom=Infinity,engineTick=10000;const calmAt=()=>undefined,progressAfter=()=>Infinity;`;
const results=[];
for(const mode of ['fights','fast','one'])for(const confirmedStall of [false,true]){
 const run=new Function(prefix+`const mode=${JSON.stringify(mode)},earlyFloor=()=>true,stalling=()=>${confirmedStall};`+fn+';return deadStretch(performance.now(),5000);');
 results.push({mode,earlyFloor:true,confirmedStall,rate:run()});
}
const report={scope:'Actual extracted production rate function with controlled surrounding facts; not a browser reproduction or complete acceptance',watchSha256:crypto.createHash('sha256').update(source).digest('hex'),results};
fs.writeFileSync('scratchpad/cut169/stall-rate-source-probe.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
