// Opt-in integration check against an explicitly supplied isolated database.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),ts=require('typescript');
test('RECAP imports persist, resume after throttling, and refresh without duplicates',{skip:!process.env.RECAP_TEST_DATABASE_URL},async()=>{
 const {PrismaClient}=require('../generated/prisma');
 const db=new PrismaClient({datasources:{db:{url:process.env.RECAP_TEST_DATABASE_URL}}});
 function load(file,imports={}){const context={exports:{},URL,Date,AbortSignal,fetch,require:name=>imports[name]};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);return context.exports;}
 const recap=load('lib/recap.ts');
 class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}
 const {syncRecap}=load('lib/recap-import.ts',{'./prisma':{prisma:db},'./api':{HttpError},'./recap':recap});
 let client;
 try{
  client=await db.client.create({data:{name:'RECAP integration fixture '+Date.now()}});
  const matter=await db.case.create({data:{clientId:client.id,title:'RECAP integration fixture'}});
  await db.pacerDocketEntry.create({data:{caseId:matter.id,entryDate:new Date('2026-09-01'),description:'Manual note',source:'MANUAL'}});
  const row=(id,description='Filed')=>({id,docket:'https://www.courtlistener.com/api/rest/v4/dockets/123/',date_filed:'2026-09-01',description,entry_number:id,recap_documents:[{id,absolute_url:'/docket/123/1/example/',description:'Motion',is_available:true}]});
  let throttled=false;
  const fake=async url=>{
   if(url.includes('/dockets/'))return Response.json({id:123,case_name:'Fixture',docket_number:'123',court_id:'dcd'});
   if(throttled)return new Response('{}',{status:429});
   return Response.json(url.includes('cursor=second')?{next:null,results:[row(2)]}:{next:'https://www.courtlistener.com/api/rest/v4/docket-entries/?docket=123&cursor=second',results:[row(1)]});
  };
  const first=await syncRecap(matter.id,'123',false,'fixture',db,fake);assert.equal(first.added,1);assert.equal(first.hasMore,true);
  const saved=await db.case.findUnique({where:{id:matter.id}});
  throttled=true;await assert.rejects(syncRecap(matter.id,'123',false,'fixture',db,fake),e=>e.status===429);
  assert.equal((await db.case.findUnique({where:{id:matter.id}})).recapNextPage,saved.recapNextPage);
  throttled=false;const second=await syncRecap(matter.id,'123',false,'fixture',db,fake);assert.equal(second.added,1);assert.equal(second.hasMore,false);
  const refresh=await syncRecap(matter.id,'123',true,'fixture',db,fake);assert.equal(refresh.added,0);assert.equal(refresh.updated,0);
  await syncRecap(matter.id,'123',false,'fixture',db,fake);
  assert.equal(await db.pacerDocketEntry.count({where:{caseId:matter.id}}),3);
  await assert.rejects(syncRecap(matter.id,'999',true,'fixture',db,fake),e=>e.status===409);
 }finally{if(client)await db.client.delete({where:{id:client.id}});await db.$disconnect();}
});
