const test=require("node:test"),assert=require("node:assert/strict"),fs=require("fs"),ts=require("typescript"),vm=require("vm");
function load(file,globals={}) {
  const context={exports:{},AbortController,setTimeout,clearTimeout,...globals};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
  return context.exports;
}
const response=(status,data)=>({status,ok:status>=200&&status<300,json:async()=>data});
test("Expired sessions produce an actionable error",async()=>{
 const {requestJson}=load("lib/http.ts",{fetch:async()=>response(401,{error:"unauthorized"})});
 await assert.rejects(requestJson("/api/cases"),e=>e.status===401&&/Sign in again/.test(e.message));
});
test("Server validation and service diagnostics remain visible",async()=>{
 const {requestJson}=load("lib/http.ts",{fetch:async()=>response(502,{error:"Search failed",status:429,detail:"Try later"})});
 await assert.rejects(requestJson("/api/research"),/Search failed.*429.*Try later/);
});
test("Network failure never retries a possibly saved write",async()=>{
 let calls=0;
 const {requestJson}=load("lib/http.ts",{fetch:async()=>{calls++;throw new Error("offline");}});
 await assert.rejects(requestJson("/api/citations",{method:"POST"}),/Unable to reach/);
 assert.equal(calls,1);
});
test("Unexpected non-JSON success is not treated as a saved record",async()=>{
 const {requestJson}=load("lib/http.ts",{fetch:async()=>({status:200,ok:true,json:async()=>{throw new Error("HTML");}})});
 await assert.rejects(requestJson("/api/clients"),/unexpected response/);
});
test("Successful requests return data and clear their timeout",async()=>{
 let cleared=0;
 const {requestJson}=load("lib/http.ts",{fetch:async()=>response(201,{id:"created"}),clearTimeout:id=>{cleared++;clearTimeout(id);}});
 assert.equal((await requestJson("/api/tasks")).id,"created");
 assert.equal(cleared,1);
});
test("Saved citation state distinguishes both source and destination",()=>{
 const {citationSaveKey}=load("lib/research.ts");
 const a={caseName:"First opinion",citation:"100 F.3d 200",absoluteUrl:"https://example.com/one"};
 const b={...a,caseName:"Second opinion",absoluteUrl:"https://example.com/two"};
 assert.notEqual(citationSaveKey("case-1",a),citationSaveKey("case-1",b));
 assert.notEqual(citationSaveKey("case-1",a),citationSaveKey("case-2",a));
 assert.equal(citationSaveKey("case-1",a),citationSaveKey("case-1",{...a}));
});

