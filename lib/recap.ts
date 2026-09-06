const ORIGIN = "https://www.courtlistener.com";
const API = ORIGIN + "/api/rest/v4/";
export class RecapError extends Error {
  constructor(message: string, public status = 502, public retryAfter?: number) { super(message); }
}
export type DocketInfo = { id: string; name: string; number: string; court: string; pacerCaseId: string | null; url: string };
export type RecapDocument = { id: string; name: string; url: string; available: boolean };
export type ImportedEntry = { recapEntryId: string; entryNumber: number | null; entryDate: Date; description: string; documentUrl: string | null; source: "RECAP"; recapDocuments: RecapDocument[] };
function id(value: unknown): string | null {
  const text=String(value ?? "");
  return /^[1-9]\d{0,14}$/.test(text) ? text : null;
}
export function parseDocketId(value: unknown): string {
  if(typeof value !== "string") throw new RecapError("Enter a CourtListener docket link or numeric docket ID.",400);
  const text=value.trim();
  if(id(text)) return text;
  try {
    const url=new URL(text);
    const match=url.pathname.match(/^\/docket\/([1-9]\d{0,14})(?:\/|$)/);
    if(url.protocol==="https:" && ["www.courtlistener.com","courtlistener.com"].includes(url.hostname) && !url.username && !url.password && !url.port && match) return match[1];
  }catch{}
  throw new RecapError("Use a https://www.courtlistener.com/docket/… link or its numeric docket ID.",400);
}
function docketLink(value: unknown, docketId: string): string | null {
  if(typeof value!=="string")return null;
  try {const u=new URL(value,ORIGIN);return u.origin===ORIGIN&&!u.username&&!u.password&&u.pathname.startsWith("/docket/"+docketId+"/")?u.href:null;}catch{return null;}
}
export function entriesUrl(docketId: string) {
  return API+"docket-entries/?docket="+parseDocketId(docketId)+"&order_by=-id&omit=recap_documents__plain_text";
}
export function validateNextPage(value: unknown,docketId:string): string | null {
  if(value===null || value===undefined) return null;
  if(typeof value!=="string" || value.length>8000)throw new RecapError("CourtListener returned an invalid page link.");
  let u:URL;
  try{u=new URL(value,ORIGIN);}catch{throw new RecapError("CourtListener returned an invalid page link.");}
  if(u.origin!==ORIGIN||u.username||u.password||u.pathname!=="/api/rest/v4/docket-entries/"||u.searchParams.getAll("docket").length===0||u.searchParams.getAll("docket").some(v=>v!==docketId))
    throw new RecapError("CourtListener returned a page link for another source.");
  u.searchParams.set("omit","recap_documents__plain_text");
  return u.href;
}
export function normalizeDocket(data:any, expectedId:string):DocketInfo {
  if(!data||id(data.id)!==expectedId)throw new RecapError("CourtListener returned a different docket.");
  if(data.blocked)throw new RecapError("This docket is restricted in CourtListener.",403);
  return {id:expectedId,name:typeof data.case_name==="string"?data.case_name:"Docket "+expectedId,number:typeof data.docket_number==="string"?data.docket_number:"",court:typeof data.court_id==="string"?data.court_id:"",pacerCaseId:id(data.pacer_case_id),url:docketLink(data.absolute_url,expectedId)||ORIGIN+"/docket/"+expectedId+"/"};
}
export function normalizePage(data:any,docketId:string) {
  if(!data||!Array.isArray(data.results)||data.results.length>1000||!("next" in data))throw new RecapError("CourtListener returned an invalid docket page.");
  const entries=new Map<string,ImportedEntry>();let skipped=0;
  for(const row of data.results) {
    if(!row||typeof row!=="object")throw new RecapError("CourtListener returned an invalid entry.");
    const remoteId=id(row.id);
    if(row.docket && String(row.docket)!==API+"dockets/"+docketId+"/")throw new RecapError("An entry belongs to another docket.");
    const day=typeof row.date_filed==="string"?row.date_filed:"";
    const date=new Date(day+"T00:00:00.000Z");
    if(!remoteId||!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==day){skipped++;continue;}
    const documents:RecapDocument[]=[];
    for(const doc of Array.isArray(row.recap_documents)?row.recap_documents:[]) {
      const docId=id(doc?.id),url=docketLink(doc?.absolute_url,docketId);
      if(!docId||!url||doc.is_sealed===true)continue;
      documents.push({id:docId,url,name:typeof doc.description==="string"&&doc.description.trim()?doc.description:"Document "+String(doc.document_number||docId),available:doc.is_available===true});
    }
    entries.set(remoteId,{recapEntryId:remoteId,entryNumber:Number.isSafeInteger(row.entry_number)&&row.entry_number>=0&&row.entry_number<=2147483647?row.entry_number:null,
      entryDate:date,description:typeof row.description==="string"&&row.description.trim()?row.description:"Docket entry "+remoteId,
      documentUrl:documents[0]?.url||ORIGIN+"/docket/"+docketId+"/",source:"RECAP",recapDocuments:documents});
  }
  return {entries:[...entries.values()],skipped,next:validateNextPage(data.next,docketId)};
}
export async function recapGet(url:string,token:string,fetcher:typeof fetch=fetch):Promise<any> {
  if(!token)throw new RecapError("Configure COURTLISTENER_API_TOKEN on the server to connect RECAP.",503);
  const parsed=new URL(url);
  if(parsed.origin!==ORIGIN||!parsed.pathname.startsWith("/api/rest/v4/")||parsed.username||parsed.password)throw new RecapError("Invalid RECAP API URL.",400);
  let res:Response;
  try{res=await fetcher(url,{headers:{Authorization:"Token "+token,Accept:"application/json"},redirect:"error",cache:"no-store",signal:AbortSignal.timeout(12000)});}
  catch{throw new RecapError("CourtListener could not be reached. Your saved import progress is unchanged.");}
  if(res.status===429){
    const seconds=Number(res.headers.get("retry-after"));
    throw new RecapError("CourtListener's request limit was reached. Wait and resume the import; saved pages are retained.",429,Number.isFinite(seconds)&&seconds>0?Math.ceil(seconds):60);
  }
  if([401,403].includes(res.status))throw new RecapError("CourtListener rejected access. Check the configured API token and its permissions.",503);
  if(res.status===404)throw new RecapError("This docket was not found in CourtListener's RECAP archive.",404);
  if(!res.ok)throw new RecapError("CourtListener returned an error ("+res.status+"). Try again later.");
  try{return await res.json();}catch{throw new RecapError("CourtListener returned an unreadable response.");}
}
export async function lookupDocket(value:unknown,token:string,fetcher:typeof fetch=fetch) {
  const docketId=parseDocketId(value);
  return normalizeDocket(await recapGet(API+"dockets/"+docketId+"/",token,fetcher),docketId);
}
