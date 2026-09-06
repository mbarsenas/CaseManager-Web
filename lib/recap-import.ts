import { prisma } from "./prisma";
import { HttpError } from "./api";
import { entriesUrl, lookupDocket, normalizePage, parseDocketId, recapGet, validateNextPage } from "./recap";
export function recapState(c: { recapDocketId: string | null; recapDocketName: string | null; recapNextPage: string | null; recapLastSyncedAt: Date | null }) {
  return { docketId:c.recapDocketId,name:c.recapDocketName,hasMore:Boolean(c.recapNextPage),lastSyncedAt:c.recapLastSyncedAt?.toISOString()||null };
}
export async function syncRecap(caseId:string,input:string,restart:boolean,token:string,db=prisma,fetcher:typeof fetch=fetch) {
  const docketId=parseDocketId(input);
  const original=await db.case.findUnique({where:{id:caseId}});
  if(!original)throw new HttpError(404,"Case not found.");
  if(original.recapDocketId && original.recapDocketId!==docketId)throw new HttpError(409,"This case is connected to another docket. Keep the existing connection to avoid mixing records.");
  if(original.recapDocketId && !original.recapNextPage && !restart) return {...recapState(original),added:0,updated:0,skipped:0,processed:0};
  const metadata=original.recapDocketId?null:await lookupDocket(docketId,token,fetcher);
  const url=!restart&&original.recapNextPage?validateNextPage(original.recapNextPage,docketId)!:entriesUrl(docketId);
  const page=normalizePage(await recapGet(url,token,fetcher),docketId);
  if(page.next===url)throw new HttpError(502,"CourtListener returned the same page twice. Import paused.");
  return db.$transaction(async tx=>{
    // A row lock serializes competing imports. Network requests happen before this transaction.
    await tx.$queryRaw`SELECT id FROM cases WHERE id = ${caseId} FOR UPDATE`;
    const current=await tx.case.findUnique({where:{id:caseId}});
    if(!current)throw new HttpError(404,"Case no longer exists.");
    if(current.recapDocketId!==original.recapDocketId || current.recapNextPage!==original.recapNextPage ||
       current.recapLastSyncedAt?.getTime()!==original.recapLastSyncedAt?.getTime())
      throw new HttpError(409,"Another import updated this case. Refresh the page to continue from its saved progress.");
    const existing=await tx.pacerDocketEntry.findMany({where:{caseId,recapEntryId:{in:page.entries.map(e=>e.recapEntryId)}}});
    const known=new Map(existing.map(e=>[e.recapEntryId,e]));
    const fresh=page.entries.filter(e=>!known.has(e.recapEntryId));
    if(fresh.length)await tx.pacerDocketEntry.createMany({data:fresh.map(e=>({...e,caseId}))});
    let updated=0;
    for(const entry of page.entries) {
      const old=known.get(entry.recapEntryId);
      if(old&&(old.description!==entry.description||old.entryNumber!==entry.entryNumber||old.entryDate.getTime()!==entry.entryDate.getTime()||old.documentUrl!==entry.documentUrl||JSON.stringify(old.recapDocuments,["id","name","url","available"])!==JSON.stringify(entry.recapDocuments,["id","name","url","available"]))) {
        await tx.pacerDocketEntry.update({where:{id:old.id},data:entry});updated++;
      }
    }
    const saved=await tx.case.update({where:{id:caseId},data:{
      recapDocketId:docketId,recapDocketName:metadata?.name||current.recapDocketName,recapNextPage:page.next,recapLastSyncedAt:new Date(),
      ...(metadata?{pacerCourtId:metadata.court||null,pacerCaseId:metadata.pacerCaseId}:{})
    }});
    return {...recapState(saved),added:fresh.length,updated,skipped:page.skipped,processed:page.entries.length};
  },{maxWait:5000,timeout:20000});
}
