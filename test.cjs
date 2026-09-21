const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=readFileSync(__dirname+'/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(script);
const code=script.slice(script.indexOf('const COMP_R='),script.indexOf('function setTool('));
const ctx=vm.createContext({});vm.runInContext(code+'\nthis.analyze=analyzeCircuit;',ctx);
const c=type=>({type});
function run(slots,branches=[]){return ctx.analyze({V:6,topSlots:slots,branches});}
function near(a,b){assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);}
let checks=0;
function test(name,fn){fn();checks++;console.log('PASS '+name);}
test('JavaScript parses',()=>assert.ok(script));
test('Empty circuit is idle and open',()=>{const a=run([null,null,null]);assert.equal(a.I,0);assert.equal(a.status.kind,'idle');});
test('Two series bulbs draw 1 A',()=>{const a=run([c('wire'),c('bulb'),c('bulb')]);near(a.I,1);near(a.Reff,6);});
test('Parallel bypass splits current equally',()=>{const slots=[c('wire'),c('bulb'),c('wire')],branch=c('bulb');const a=run(slots,[{afterSlot:0,comp:branch}]);near(a.Reff,1.5);near(a.I,4);near(branch._current,2);near(slots[1]._current,2);});
test('Two independent parallel groups',()=>{const a=run([c('wire'),c('bulb'),c('bulb')],[{afterSlot:0,comp:c('bulb')},{afterSlot:1,comp:c('bulb')}]);near(a.Reff,3);near(a.I,2);});
test('A branch can bypass a missing component',()=>{const a=run([c('wire'),null,c('wire')],[{afterSlot:0,comp:c('bulb')}]);near(a.I,2);});
test('Opening switch resets all bulb illumination',()=>{const sw={type:'switch',closed:true},bulb=c('bulb'),branch=c('bulb');const slots=[sw,bulb,c('wire')],branches=[{afterSlot:0,comp:branch}];run(slots,branches);sw.closed=false;const a=run(slots,branches);assert.equal(a.I,0);assert.equal(bulb._lit,0);assert.equal(branch._lit,0);});
test('Ideal short has a warning and infinite current',()=>{const a=run([c('wire'),c('ammeter'),c('wire')]);assert.equal(a.I,Infinity);assert.equal(a.status.kind,'warn');assert.match(a.status.text,/短路/);});
test('Series voltmeter blocks current',()=>{assert.equal(run([c('wire'),c('voltmeter'),c('bulb')]).I,0);});
test('Parallel voltmeter measures load voltage without drawing current',()=>{const meter=c('voltmeter');const a=run([c('wire'),c('bulb'),c('wire')],[{afterSlot:0,comp:meter}]);near(a.I,2);near(meter._current,0);near(meter._voltage,6);});
test('Unequal parallel currents obey KCL',()=>{const bulb=c('bulb'),resistor=c('resistor');const a=run([c('wire'),bulb,c('wire')],[{afterSlot:0,comp:resistor}]);near(a.I,3.2);near(bulb._current+resistor._current,a.I);});
test('Bulb bypassed by wire stays off',()=>{const bulb=c('bulb');const a=run([c('resistor'),bulb,c('wire')],[{afterSlot:0,comp:c('wire')}]);near(a.I,1.2);near(bulb._lit,0);});
console.log(`${checks} checks passed`);
