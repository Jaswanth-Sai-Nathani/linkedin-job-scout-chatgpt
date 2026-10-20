import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {resolve} from 'node:path';

/** Converts a pinned stdio upstream MCP server into request/response calls. */
export class StdioMcpClient {
  constructor({command=process.execPath, args=[resolve('node_modules/linkedin-mcp-search/dist/index.js')], timeoutMs=45000}={}) {
    this.command=command;this.args=args;this.timeoutMs=timeoutMs;this.seq=1;this.pending=new Map();this.child=null;
  }
  async start() {
    if (this.child) return;
    this.child=spawn(this.command,this.args,{stdio:['pipe','pipe','pipe'],env:{...process.env}});
    this.child.stdout.setEncoding('utf8');
    createInterface({input:this.child.stdout}).on('line',line=>{
      let payload;try{payload=JSON.parse(line);}catch{return;}
      if(!Object.hasOwn(payload,'id')) return;
      const key=String(payload.id);const entry=this.pending.get(key);if(!entry)return;
      clearTimeout(entry.timer);this.pending.delete(key);
      if (payload.error)entry.reject(Error(payload.error.message || 'MCP upstream error'));
      else entry.resolve(payload.result);
    });
    this.child.stderr.on('data',chunk=>{if(process.env.DEBUG_MCP)process.stderr.write(String(chunk).slice(0,1000));});
    this.child.on('error',e=>this.failAll(e));
    this.child.on('exit',(code)=>{this.failAll(Error(`Upstream exited: ${code}`));this.child=null;});
    await this.request('initialize',{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'linkedin-job-scout-bridge',version:'0.1.0'}});
    this.notify('notifications/initialized',{});
  }
  request(method,params={}) {
    if(!this.child||!this.child.stdin.writable)return Promise.reject(Error('MCP upstream is not running'));
    const id=String(this.seq++);
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{this.pending.delete(id);reject(Error(`Upstream call timed out: ${method}`));},this.timeoutMs);
      this.pending.set(id,{resolve,reject,timer});
      this.child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');
    });
  }
  notify(method,params={}) {if(this.child?.stdin?.writable)this.child.stdin.write(JSON.stringify({jsonrpc:'2.0',method,params})+'\n');}
  async callTool(name,args) {return this.request('tools/call',{name,arguments:args});}
  failAll(err) {for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(err);}this.pending.clear();}
  stop() {this.child?.kill('SIGTERM');this.child=null;}
}
