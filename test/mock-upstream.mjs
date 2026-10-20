import {createInterface} from 'node:readline';
for await (const line of createInterface({input:process.stdin})) {
  const m=JSON.parse(line);
  if(!Object.hasOwn(m,'id'))continue;
  let result={};
  if(m.method==='initialize')result={protocolVersion:'2025-03-26',capabilities:{tools:{}},serverInfo:{name:'mock',version:'1.0'}};
  else if(m.method==='tools/call'){
    const {name,arguments:args}=m.params;
    result={content:[{type:'text',text:JSON.stringify({success:true,tool:name,args,jobs:[{id:'1234567890',title:'Senior Backend Engineer',company:'Oracle',postedDate:'2026-10-18'}]})}]};
  }
  process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:m.id,result})+'\n');
}
