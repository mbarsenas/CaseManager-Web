// Use this project's configuration even when the host shell has unrelated app variables.
const fs=require("fs");
const path=require("path");
for(const file of (process.env.CASE_MANAGER_ENV_FILE ? [process.env.CASE_MANAGER_ENV_FILE] : [".env",".env.local"])) {
  if(!fs.existsSync(file)) continue;
  for(const line of fs.readFileSync(file,"utf8").split(/\r?\n/)) {
    const match=line.match(/^([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/);
    if(match) process.env[match[1]]=match[2].trim().replace(/^["']|["']$/g,"");
  }
}
const portIndex=process.argv.findIndex(arg=>arg==="--port" || arg==="-p");
if(portIndex>=0 && process.argv[portIndex+1]) {
  const address=new URL(process.env.NEXTAUTH_URL || "http://localhost:3000");
  address.port=process.argv[portIndex+1];
  process.env.NEXTAUTH_URL=address.origin;
}
require("next/dist/bin/next");
