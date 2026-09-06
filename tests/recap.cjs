const test=require("node:test"),assert=require("node:assert/strict"),fs=require("fs"),ts=require("typescript"),vm=require("vm");
const context={exports:{},URL,Date,AbortSignal,fetch};
vm.runInNewContext(ts.transpileModule(fs.readFileSync("lib/recap.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
const {parseDocketId,validateNextPage,normalizePage,normalizeDocket,recapGet,entriesUrl}=context.exports;
test("Accept only numeric IDs or actual CourtListener docket URLs",()=>{
 assert.equal(parseDocketId("4214664"),"4214664");
 assert.equal(parseDocketId("https://www.courtlistener.com/docket/4214664/example/"),"4214664");
 for(const input of ["https://evil.test/docket/4214664/","https://www.courtlistener.com.evil.test/docket/123/","https://user:pass@www.courtlistener.com/docket/123/","-1","https://www.courtlistener.com/api/rest/v4/recap-fetch/"])assert.throws(()=>parseDocketId(input));
});
test("Pagination cannot leak the token or import another docket",()=>{
 assert.equal(validateNextPage(null,"123"),null);
 assert.ok(validateNextPage("https://www.courtlistener.com/api/rest/v4/docket-entries/?docket=123&cursor=abc","123").includes("omit="));
 for(const url of ["https://evil.test/api/rest/v4/docket-entries/?docket=123","https://www.courtlistener.com/api/rest/v4/recap-fetch/?docket=123","https://www.courtlistener.com/api/rest/v4/docket-entries/?docket=999","https://www.courtlistener.com/api/rest/v4/docket-entries/?docket=123&docket=999"])assert.throws(()=>validateNextPage(url,"123"));
});
test("Preserve attachment availability and skip undated entries without inventing dates",()=>{
 const row={id:10,docket:"https://www.courtlistener.com/api/rest/v4/dockets/123/",date_filed:"2026-09-04",entry_number:1,description:"Filed",recap_documents:[
 {id:2,absolute_url:"/docket/123/1/example/",description:"Motion",is_available:true},
 {id:3,absolute_url:"/docket/123/1/1/example/",description:"Exhibit",is_available:false},
 {id:4,absolute_url:"https://evil.test/document",is_available:true}
 ]};
 const page=normalizePage({next:null,results:[row,{...row,id:11,date_filed:null}]},"123");
 assert.equal(page.entries.length,1);assert.equal(page.skipped,1);assert.equal(page.entries[0].entryDate.toISOString(),"2026-09-04T00:00:00.000Z");
 assert.equal(page.entries[0].recapDocuments.length,2);assert.equal(page.entries[0].recapDocuments[1].available,false);
 assert.throws(()=>normalizePage({results:[row]},"123"));
});
test("Reject mismatched docket metadata and entry pages",()=>{
 assert.throws(()=>normalizeDocket({id:999},"123"));
 assert.throws(()=>normalizePage({next:null,results:[{id:1,docket:"https://www.courtlistener.com/api/rest/v4/dockets/999/"}]},"123"));
});
test("Rate limits are actionable and outbound requests never buy PACER data",async()=>{
 let received;
 const fake=async(url,options)=>{received={url,options};return new Response("{}",{status:429,headers:{"Retry-After":"42"}});};
 await assert.rejects(recapGet(entriesUrl("123"),"test-token",fake),e=>e.status===429&&e.retryAfter===42);
 assert.equal(received.options.redirect,"error");assert.equal(received.options.headers.Authorization,"Token test-token");
 assert.ok(received.url.includes("docket-entries/"));assert.equal(received.options.method,undefined);
});

