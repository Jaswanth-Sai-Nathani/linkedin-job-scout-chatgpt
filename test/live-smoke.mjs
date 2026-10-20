/**
 * Live read-only smoke test of an actually deployed MCP gateway.
 * Usage: MCP_URL=https://your-host.example/mcp MCP_API_KEY=... node test/live-smoke.mjs
 * The key is optional if server is intentionally public. Never provide LinkedIn login credentials.
 */
const endpoint=process.env.MCP_URL||'http://127.0.0.1:3000/mcp';
const key=process.env.MCP_API_KEY||'';
const headers={'content-type':'application/json','accept':'application/json, text/event-stream'};
if(key)headers.authorization=`Bearer ${key}`;
let id=0;
async function request(method,params={}){
  const response=await fetch(endpoint,{method:'POST',headers,body:JSON.stringify({jsonrpc:'2.0',id:++id,method,params}),signal:AbortSignal.timeout(45000)});
  const body=await response.json();
  if(!response.ok || body.error)throw Error(`${method}: HTTP ${response.status} ${JSON.stringify(body.error||body)}`);
  return body.result;
}
async function call(name,args={}){
  const result=await request('tools/call',{name,arguments:args});
  if(result.isError)throw Error(`${name}: ${result.content?.[0]?.text}`);
  return JSON.parse(result.content[0].text);
}
let failed=false;
function log(name,status,note=''){console.log(`${status==='PASS'?'PASS':status==='WARN'?'WARN':'FAIL'} ${name}${note?': '+note:''}`);}
try {
 const init=await request('initialize',{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'job-scout-smoke',version:'1.0.0'}});
 if(init.serverInfo?.name!=='linkedin-job-scout')throw Error('Unexpected server identity');
 log('MCP initialize','PASS');
 const list=await request('tools/list');
 const names=new Set(list.tools.map(t=>t.name));
 for(const required of ['search_jobs','get_job_details','get_company_jobs','search_companies','screen_jobs','get_search_plan']){
  if(!names.has(required))throw Error(`Missing ${required}`);
 }
 if(list.tools.some(t=>!t.annotations?.readOnlyHint))throw Error('Unexpected write tool');
 log('Tool discovery and read-only metadata','PASS');
 const plan=await call('get_search_plan');
 if(plan.employers.length!==26)throw Error('Expected 26 employers');
 log('26-company configuration','PASS');
 const screened=await call('screen_jobs',{jobs:[
  {title:'Cloud Engineer',company:'Example',officialPostingText:'This position does not support H1B visa transfers.',postedDate:'2026-10-18'},
  {title:'Senior Backend Engineer',company:'Example',officialPostingText:'Must be legally authorized to work in the US.',postedDate:'2026-10-17'}
 ]});
 if(screened.excludedCount!==1||screened.count!==1)throw Error('Incorrect sponsorship screening');
 log('H-1B filter and unknown-policy retention','PASS');
 const companies=await call('search_companies',{query:'Oracle'});
 log('Live company discovery','PASS',`${companies.count??companies.companies?.length??'unknown'} companies returned`);
 const search=await call('search_jobs',{company:'Oracle',keywords:'software engineer',location:'Austin, TX',datePosted:'past-week',limit:10,start:0});
 if(!Array.isArray(search.jobs))throw Error('No jobs array in upstream response');
 log('Live Oracle job search','PASS',`${search.jobs.length} jobs; nextStart=${search.nextStart??'none'}`);
 if(search.jobs.length){
  const jd=await call('get_job_details',{jobId:String(search.jobs[0].id)});
  log('Live job details','PASS',jd?.job?.title||`job ${search.jobs[0].id}`);
 }else log('Live job details','WARN','No jobs returned, so detail lookup was not exercised');
} catch(e){failed=true;log('Live integration','FAIL',e.message)}
console.log('Note: successful LinkedIn discovery does not verify employer ATS posting or H-1B transfer support. Independently check official listings.');
process.exitCode=failed?1:0;
