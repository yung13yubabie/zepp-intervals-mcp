import assert from 'node:assert/strict';
import test from 'node:test';
import { handleMcp } from '../lib/mcp.ts';
const headers = { 'content-type': 'application/json', accept: 'application/json, text/event-stream' };
const identity = { 'oai-authenticated-user-id': 'synthetic-user', 'oai-authenticated-user-email': 'synthetic@example.invalid' };
async function rpc(method, params, extra = {}, id = 1) {
 const res = await handleMcp(new Request('https://test.invalid/mcp', { method: 'POST', headers: { ...headers, ...extra }, body: JSON.stringify({jsonrpc:'2.0', id, method, params}) }));
 return {status:res.status, body: res.status === 202 ? null : await res.json()};
}
test('initialize negotiates protocol without identity or private data', async()=>{ const r=await rpc('initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'test',version:'1'}}); assert.equal(r.status,200); assert.equal(r.body.result.protocolVersion,'2025-06-18'); assert.deepEqual(r.body.result.capabilities,{tools:{listChanged:false}}); });
test('discovery exposes connection test and approved read-only data tools',async()=>{const r=await rpc('tools/list',{});assert.equal(r.status,200);assert.equal(r.body.result.tools.length,6);assert.equal(r.body.result.tools[0].name,'check_connection');assert.equal(r.body.result.tools[0].annotations.readOnlyHint,true);assert.equal(r.body.result.tools[0].annotations.openWorldHint,false);});
test('call without user identity is denied',async()=>{assert.equal((await rpc('tools/call',{name:'check_connection',arguments:{}})).status,401)});
test('partial identity is denied',async()=>{assert.equal((await rpc('tools/call',{name:'check_connection',arguments:{}},{'oai-authenticated-user-id':'synthetic-user'})).status,401)});
test('service credential alone does not grant user identity',async()=>{assert.equal((await rpc('tools/call',{name:'check_connection',arguments:{}},{'OAI-Sites-Authorization':'Bearer synthetic-test'})).status,401)});
test('synthetic authenticated call returns fixed nonidentifying status',async()=>{const r=await rpc('tools/call',{name:'check_connection',arguments:{}},identity);assert.equal(r.status,200);assert.deepEqual(r.body.result.structuredContent,{status:'ok',message:'連線測試成功',mode:'connection_test_only'});assert.equal(r.body.result.isError,false);assert.equal(JSON.stringify(r.body).includes('synthetic'),false)});
test('unexpected tool and payload rejected',async()=>{assert.equal((await rpc('tools/call',{name:'read_health',arguments:{}},identity)).body.error.code,-32602);assert.equal((await rpc('tools/call',{name:'check_connection',arguments:{data:'synthetic'}},identity)).body.error.code,-32602)});
test('cross-origin call rejected',async()=>{assert.equal((await rpc('tools/call',{name:'check_connection',arguments:{}},{...identity,origin:'https://untrusted.invalid'})).status,403)});
test('initialized notification accepted statelessly',async()=>{const r=await handleMcp(new Request('https://test.invalid/mcp',{method:'POST',headers,body:JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})}));assert.equal(r.status,202)});
test('GET transport not supported',async()=>{assert.equal((await handleMcp(new Request('https://test.invalid/mcp'))).status,405)});
test('malformed JSON rejected',async()=>{assert.equal((await handleMcp(new Request('https://test.invalid/mcp',{method:'POST',headers,body:'{bad'}))).status,400)});
test('wrong content type rejected',async()=>{assert.equal((await handleMcp(new Request('https://test.invalid/mcp',{method:'POST',body:'{}'}))).status,415)});
