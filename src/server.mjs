import http from 'node:http';
import {timingSafeEqual} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {StdioMcpClient} from './bridge.mjs';
import {EMPLOYERS, LOCATIONS, RESUMES, orderedMatchingJobs} from './policy.mjs';

const readOnly={readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:true};
const p=(properties,required=[])=>({type:'object',properties,required,additionalProperties:false});
const str=(description)=>({type:'string',description});
const tools=[
  {name:'search_jobs',description:'Read-only discovery of public LinkedIn job listings, newest first. Supports pagination via start. Employer-official posting verification is REQUIRED before claiming sponsorship or a live opening.',inputSchema:p({keywords:str('Role keywords, e.g. senior backend engineer'),company:str('Employer name, optionally from configured target list'),location:str('City, metro area, region or US-remote'),datePosted:{type:'string',enum:['past-hour','past-24-hours','past-week','past-month','any-time']},workplaceType:{type:'array',items:{type:'string',enum:['remote','hybrid','on-site']}},start:{type:'integer',minimum:0},limit:{type:'integer',minimum:1,maximum:100}}),annotations:readOnly},
  {name:'get_job_details',description:'Read-only full description from public LinkedIn job page. These are not verified official employer terms; check the company careers page separately.',inputSchema:p({jobId:{type:'string',pattern:'^[0-9]+$',description:'LinkedIn numeric job ID'}},['jobId']),annotations:readOnly},
  {name:'search_companies',description:'Discover LinkedIn company IDs via public listings; name must be supplied.',inputSchema:p({query:str('Company name')},['query']),annotations:readOnly},
  {name:'get_company_jobs',description:'Find an employer\'s public LinkedIn jobs, newest first; paginate with start. Does not prove active status on employer career page.',inputSchema:p({companyId:str('Numeric LinkedIn company ID or company name'),keywords:str('Engineering role keywords'),location:str('City, metro area, region or US-remote'),start:{type:'integer',minimum:0},limit:{type:'integer',minimum:1,maximum:100}},['companyId']),annotations:readOnly},
  {name:'screen_jobs',description:'Read-only screening of jobs for explicit NO SPONSORSHIP language, chronological sorting, and best one of three resume variants. Only official employer-provided posting text should be supplied in officialPostingText, and the caller must independently verify URL and authenticity. Unknown H-1B policies must be marked recruiter-confirmation-needed. This tool does NOT retrieve/verify employer careers pages itself.',inputSchema:p({jobs:{type:'array',minItems:0,maxItems:300,items:{type:'object',properties:{id:{type:'string'},company:{type:'string'},title:{type:'string'},description:{type:'string'},officialPostingText:{type:'string'},officialUrl:{type:'string'},officialPostedAt:{type:'string'},postedDate:{type:'string'}},required:['company','title'],additionalProperties:true}}},['jobs']),annotations:readOnly},
  {name:'get_search_plan',description:'Return configurable employer examples, locations and three resume categories. Defaults are fictionalized/generalized and may be overridden by environment variables.',inputSchema:p({}),annotations:readOnly}
];
const upstreamNames=new Set(['search_jobs','get_job_details','search_companies','get_company_jobs']);
function safeString(x){return typeof x==='string'?x:'';}
function positiveInt(x,defaultVal) {return Number.isInteger(x)&&x>0?Math.min(x,100):defaultVal;}
function validateTool(name,args){
  if(!tools.some(t=>t.name===name))throw Error('Unknown or disallowed tool');
  if(!args || typeof args!=='object' || Array.isArray(args))throw Error('Arguments must be an object');
  if(name==='get_job_details' && !/^\d+$/.test(args.jobId||''))throw Error('jobId must be numeric');
  if(name==='search_companies' && !safeString(args.query).trim())throw Error('query is required');
  if(name==='get_company_jobs' && !safeString(args.companyId).trim())throw Error('companyId is required');
  if(name==='screen_jobs' && (!Array.isArray(args.jobs)||args.jobs.length>300))throw Error('jobs array required, max 300');
}
function toUpstream(name,args) {
  switch(name){
    case 'search_jobs': return {name,params:{keywords:safeString(args.keywords),company:safeString(args.company),location:safeString(args.location),datePosted:args.datePosted||'any-time',workplaceType:args.workplaceType,jobType:['full-time'],experienceLevel:['associate','mid-senior'],sortBy:'most-recent',start:Number.isInteger(args.start)&&args.start>=0?args.start:0,limit:positiveInt(args.limit,100)}};
    case 'get_company_jobs': return {name:'search_jobs',params:{...( /^\d+$/.test(args.companyId)?{companyIds:[args.companyId]}:{company:args.companyId}),keywords:safeString(args.keywords),location:safeString(args.location),jobType:['full-time'],experienceLevel:['associate','mid-senior'],datePosted:'any-time',sortBy:'most-recent',start:Number.isInteger(args.start)&&args.start>=0?args.start:0,limit:positiveInt(args.limit,100)}};
    case 'get_job_details':return{name,params:{jobId:args.jobId}};
    case 'search_companies':return{name,params:{query:args.query}};
    default:throw Error('Unknown tool');
  }
}
function mcpContent(obj){return {content:[{type:'text',text:JSON.stringify(obj)}]};}
export async function dispatch(name,args,upstream){
  validateTool(name,args);
  if(name==='get_search_plan') return mcpContent({employers:EMPLOYERS,locations:LOCATIONS,resumes:RESUMES,sourcePolicy:'LinkedIn is discovery only. Verify on the official employer site, exclude explicit no-sponsorship, mark silence as unknown.'});
  if(name==='screen_jobs')return mcpContent(orderedMatchingJobs(args.jobs));
  const mapped=toUpstream(name,args);
  return await upstream.callTool(mapped.name,mapped.params);
}
function authorized(req,token,publicAccess){
  if(publicAccess)return true;
  const v=req.headers.authorization||'';
  const provided=v.startsWith('Bearer ')?v.slice(7):'';
  if(!provided||!token)return false;
  const a=Buffer.from(provided),b=Buffer.from(token);
  return a.length===b.length && timingSafeEqual(a,b);
}
function send(res,status,body){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body));}
const rpcOk=(id,result)=>({jsonrpc:'2.0',id,result});
const rpcErr=(id,code,message)=>({jsonrpc:'2.0',id,error:{code,message}});
export function createApp({upstream,apiKey='',publicAccess=false,limitPerFiveMin=70}={}){
  const requestCounts=new Map();
  return http.createServer(async(req,res)=>{
    if(req.url==='/healthz')return send(res,200,{ok:true,service:'linkedin-job-scout',upstreamAvailable:!!upstream});
    if((req.url||'').split('?')[0]!=='/mcp')return send(res,404,{error:'not found'});
    if(req.method!=='POST'){res.setHeader('Allow','POST');return send(res,405,{error:'POST required'});}
    if(!authorized(req,apiKey,publicAccess))return send(res,401,{error:'Unauthorized'});
    const ip=req.socket.remoteAddress||'unknown',now=Date.now();
    const bucket=requestCounts.get(ip)||{start:now,n:0};
    if(now-bucket.start>300000){bucket.start=now;bucket.n=0;}
    bucket.n++;requestCounts.set(ip,bucket);
    if(bucket.n>limitPerFiveMin)return send(res,429,{error:'Rate limited; retry later'});
    let raw='';
    try{
      for await (const part of req) {raw+=part;if(raw.length>512000)throw Error('Request too large');}
      const m=JSON.parse(raw);
      if(m.jsonrpc!=='2.0'||typeof m.method!=='string')return send(res,400,rpcErr(m.id??null,-32600,'Invalid JSON-RPC request'));
      if(!Object.hasOwn(m,'id')){res.writeHead(202);return res.end();}
      switch(m.method){
        case 'initialize':return send(res,200,rpcOk(m.id,{protocolVersion:'2025-03-26',capabilities:{tools:{listChanged:false}},serverInfo:{name:'linkedin-job-scout',version:'0.1.0'},instructions:'Read-only LinkedIn discovery; verify H-1B status with official employer postings. No credentials required.'}));
        case 'ping':return send(res,200,rpcOk(m.id,{}));
        case 'tools/list':return send(res,200,rpcOk(m.id,{tools}));
        case 'tools/call':{
          if(!m.params?.name)return send(res,200,rpcErr(m.id,-32602,'Tool name required'));
          try{const answer=await dispatch(m.params.name,m.params.arguments||{},upstream);return send(res,200,rpcOk(m.id,answer));}
          catch(e){return send(res,200,rpcOk(m.id,{content:[{type:'text',text:String(e.message||e)}],isError:true}));}
        }
        default:return send(res,200,rpcErr(m.id,-32601,'Method not found'));
      }
    }catch(e){return send(res,String(e.message).includes('too large')?413:400,rpcErr(null,-32700,e.message||'Invalid JSON'));}
  });
}
async function run(){
  const port=Number(process.env.PORT||3000);
  const publicAccess=process.env.PUBLIC_READONLY==='true';
  const apiKey=process.env.MCP_API_KEY||'';
  const host=process.env.HOST||'127.0.0.1';
  if(host!=='127.0.0.1' && host!=='localhost' && !publicAccess && !apiKey)throw Error('Set MCP_API_KEY or explicitly opt in PUBLIC_READONLY=true');
  const upstream=process.env.UPSTREAM_COMMAND?new StdioMcpClient({command:process.env.UPSTREAM_COMMAND,args:process.env.UPSTREAM_ARGS?JSON.parse(process.env.UPSTREAM_ARGS):[]}):new StdioMcpClient();
  await upstream.start();
  const server=createApp({upstream,apiKey,publicAccess});
  server.listen(port,host,()=>console.log(`LinkedIn Job Scout listening on http://${host}:${port}/mcp`));
  const stop=()=>{server.close();upstream.stop();};process.on('SIGTERM',stop);process.on('SIGINT',stop);
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])run().catch(e=>{console.error(e.message);process.exitCode=1;});
