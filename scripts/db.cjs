const fs=require("fs");
const {spawnSync}=require("child_process");
for(const file of [".env",".env.local"]) {
 if(!fs.existsSync(file)) continue;
 for(const line of fs.readFileSync(file,"utf8").split(/\r?\n/)){const m=line.match(/^([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/);if(m)process.env[m[1]]=m[2].trim().replace(/^["']|["']$/g,"");}
}
if(process.env.DATABASE_URL){const url=new URL(process.env.DATABASE_URL);if(url.hostname.endsWith(".neon.tech"))url.hostname=url.hostname.replace("-pooler.",".");process.env.DATABASE_URL=url.toString();}
const result=spawnSync(process.execPath,[require.resolve("prisma/build/index.js"),...process.argv.slice(2)],{stdio:"inherit",env:process.env});
process.exit(result.status ?? 1);

