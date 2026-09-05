const test=require("node:test"), assert=require("node:assert/strict"), fs=require("fs"), ts=require("typescript"), vm=require("vm");
const source=ts.transpileModule(fs.readFileSync("lib/records.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const sandbox={exports:{}}; vm.runInNewContext(source,sandbox); const {parseRecord,safeUrl}=sandbox.exports;
test("Reject executable links and malformed dates",()=>{
 for(const url of ["javascript:alert(1)","data:text/html,hi","file:///etc/passwd"]) assert.equal(safeUrl(url),false);
 assert.throws(()=>parseRecord("deadlines",{description:"Due",dueDate:"2026-02-30"}),/Invalid/);
 assert.throws(()=>parseRecord("citations",{citationText:"Citation",westlawUrl:"javascript:alert(1)"}),/http/);
});
test("Validate billing and entry numbers without coercing arbitrary data",()=>{
 for(const hours of [-1,Infinity,"1",{}]) assert.throws(()=>parseRecord("billing",{description:"Work",hours,rate:100}));
 assert.throws(()=>parseRecord("docket",{description:"Filed",entryDate:"2026-09-04",entryNumber:1.5}));
 assert.equal(parseRecord("billing",{description:"Work",hours:0,rate:0}).billable,true);
});
test("Reject whitespace titles, preserve citation punctuation, strip unexpected writes",()=>{
 assert.throws(()=>parseRecord("tasks",{title:"   "}));
 const text="Smith v. Jones, 123 F.3d 456 (5th Cir. 2020)";
 const data=parseRecord("citations",{citationText:text,addedBy:"Spoofed",caseId:"other",notes:"Relevant"});
 assert.equal(data.citationText,text); assert.equal(data.addedBy,undefined);assert.equal(data.caseId,undefined);
 assert.throws(()=>parseRecord("tasks",{done:true,title:undefined},true));
});
test("PATCH only changes supplied allowed fields",()=>{
 const data=parseRecord("tasks",{done:true,caseId:"other"},true);
 assert.equal(data.done,true);assert.equal(data.title,undefined);assert.equal(data.caseId,undefined);
});

