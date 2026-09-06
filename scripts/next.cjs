// Use this project's configuration even when the host shell has unrelated app variables.
const fs=require("fs");
const path=require("path");
for(const file of (process.env.CASE_MANAGER_ENV_FILE ? [process.env.CASE_MANAGER_ENV_FILE] : [".env",".env.local"])) {
  if(!fs.existsSync(file)) continue;
  for(const line of fs.readFileSync(file,"utf8").split(/\r?\n/)) {
    const match=line.match(/^([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/);
    if(match) {
      const value=match[2].trim().replace(/^["']|["']$/g,"");
      // `vercel env pull` represents protected production values with this
      // placeholder; do not let it overwrite an actual local configuration.
      if(value!=="[SENSITIVE]") process.env[match[1]]=value;
    }
  }
}
function origin(value) {
  try {
    const address=new URL(value);
    return ["http:","https:"].includes(address.protocol) && address.hostname ? address.origin : null;
  } catch { return null; }
}
// Vercel provides VERCEL_URL for every deployment. A blank NEXTAUTH_URL must
// never make static page generation fail before Vercel can serve the app.
process.env.NEXTAUTH_URL=origin(process.env.NEXTAUTH_URL) || origin(process.env.VERCEL_URL ? "https://"+process.env.VERCEL_URL : "") || "http://localhost:3000";
const portIndex=process.argv.findIndex(arg=>arg==="--port" || arg==="-p");
if(portIndex>=0 && process.argv[portIndex+1]) {
  const address=new URL(process.env.NEXTAUTH_URL);
  address.port=process.argv[portIndex+1];
  process.env.NEXTAUTH_URL=address.origin;
}
require("next/dist/bin/next");
