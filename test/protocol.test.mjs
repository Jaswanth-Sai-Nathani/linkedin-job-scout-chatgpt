import test from 'node:test';import assert from 'node:assert/strict';
import {StdioMcpClient} from '../src/bridge.mjs';import {createApp} from '../src/server.mjs';
import {resolve} from 'node:path';

test('HTTP MCP handshake, tool discovery, upstream forwarding, read-only policy, authorization and rate limit',async()=>{
 const upstream=new StdioMcpClient({command:process.execPath,args:[resolve('test/mock-upstream.mjs')],timeoutMs:3000});await upstream.start();
 const server=createApp({upstream,apiKey:'test-secret',limitPerFiveMin:12});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}/mcp`;
 const send=(id,method,params={},secret='test-secret')=>fetch(base,{method:'POST',headers:{'content-type':'application/json','accept':'application/json, text/event-stream','authorization':`Bearer ${secret}`},body:JSON.stringify({jsonrpc:'2.0',id,method,params})});
 try {
  assert.equal((await send(1,'initialize',{},'wrong')).status,401);
  const init=await (await send(2,'initialize')).json();assert.equal(init.result.serverInfo.name,'linkedin-job-scout');
  const listed=await (await send(3,'tools/list')).json();assert.deepEqual(listed.result.tools.map(t=>t.name),['search_jobs','get_job_details','search_companies','get_company_jobs','screen_jobs','get_search_plan']);
  assert.ok(listed.result.tools.every(t=>t.annotations.readOnlyHint));
  const job=(await (await send(4,'tools/call',{name:'get_company_jobs',arguments:{companyId:'Oracle',location:'Austin, TX'}})).json()).result;
  const decoded=JSON.parse(job.content[0].text);assert.equal(decoded.tool,'search_jobs');assert.equal(decoded.args.sortBy,'most-recent');assert.equal(decoded.args.company,'Oracle');
  const screened=(await (await send(5,'tools/call',{name:'screen_jobs',arguments:{jobs:[{title:'SSE',company:'X',officialPostingText:'We do not offer visa sponsorship for this role.'}]}})).json()).result;
  assert.equal(JSON.parse(screened.content[0].text).excludedCount,1);
  const bad=(await (await send(6,'tools/call',{name:'send_message',arguments:{}})).json()).result;assert.equal(bad.isError,true);
 }finally{await new Promise(resolve=>server.close(resolve));upstream.stop();}
});
