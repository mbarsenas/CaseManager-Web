const assert=require("node:assert/strict");
const base=process.argv[2]||"http://localhost:3101";
(async()=>{
 const htmlResponse=await fetch(base+"/login");assert.equal(htmlResponse.status,200,"Login page must load");
 const html=await htmlResponse.text();
 const assets=[...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)].map(m=>m[1].replace(/&amp;/g,"&"));
 assert.ok(assets.length,"Login page must reference compiled assets");
 for(const asset of new Set(assets)) assert.equal((await fetch(base+asset)).status,200,"Missing asset: "+asset);
 for(const route of ["/api/auth/providers","/api/auth/session","/api/auth/error","/api/setup"])
   assert.equal((await fetch(base+route)).status,200,route+" must load without a server error");
 const csrfResponse=await fetch(base+"/api/auth/csrf");
 const csrf=await csrfResponse.json();assert.ok(csrf.csrfToken,"CSRF token required");
 const cookie=csrfResponse.headers.getSetCookie().map(c=>c.split(";")[0]).join("; ");
 const rejected=await fetch(base+"/api/auth/callback/credentials",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded",Cookie:cookie},body:new URLSearchParams({
   csrfToken:csrf.csrfToken,email:"nonexistent-smoke-user@example.invalid",password:"nonexistent-test-password",json:"true"
 })});
 assert.equal(rejected.status,401,"Invalid credentials should be rejected without a server error");
 const result=await rejected.json();assert.ok(result.url?.includes("CredentialsSignin"),"Expected a handled invalid-password result");
 assert.equal((await fetch(base+"/api/cases")).status,401,"Private API must reject signed-out access");
 console.log("PASS: login page, compiled assets, auth endpoints, database setup check, invalid-credential handling and signed-out access.");
})().catch(e=>{console.error(e.message);process.exitCode=1;});
