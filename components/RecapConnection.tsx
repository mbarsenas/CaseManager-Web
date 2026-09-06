"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { requestJson, errorMessage } from "@/lib/http";
import type { DocketInfo } from "@/lib/recap";
type State={docketId:string|null;name:string|null;hasMore:boolean;lastSyncedAt:string|null};
type Result=State&{added:number;updated:number;skipped:number;processed:number};
export function RecapConnection({caseId,initial,configured}:{caseId:string;initial:State;configured:boolean}) {
  const router=useRouter(),[state,setState]=useState(initial),[input,setInput]=useState("");
  const [preview,setPreview]=useState<DocketInfo|null>(null),[looking,setLooking]=useState(false),[running,setRunning]=useState(false);
  const [error,setError]=useState(""),[notice,setNotice]=useState("");
  const keepGoing=useRef(false),mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;keepGoing.current=false;};},[]);
  async function lookup(e:React.FormEvent) {
    e.preventDefault();setLooking(true);setError("");setPreview(null);
    try{const data=await requestJson<{docket:DocketInfo}>("/api/pacer?caseId="+encodeURIComponent(caseId)+"&docket="+encodeURIComponent(input));setPreview(data.docket);}
    catch(e){setError(errorMessage(e));}finally{setLooking(false);}
  }
  async function run(restart:boolean) {
    const docketId=state.docketId||preview?.id;if(!docketId||running)return;
    keepGoing.current=true;setRunning(true);setError("");setNotice("Importing docket…");
    let first=true,added=0,updated=0,skipped=0,pages=0;
    try{
      do {
        const result=await requestJson<Result>("/api/pacer",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({caseId,docketId,restart:first&&restart})});
        if(!mounted.current)return;
        first=false;pages++;added+=result.added;updated+=result.updated;skipped+=result.skipped;setState(result);
        setNotice(added+" added, "+updated+" updated across "+pages+" page(s)."+(skipped?" "+skipped+" entries with missing or invalid dates/IDs were skipped.":"")+(result.hasMore?" More pages remain.":" RECAP import complete."));
        router.refresh();
        if(!result.hasMore)break;
      }while(keepGoing.current);
    }catch(e){
      if(mounted.current){
        setError(errorMessage(e));
        try{const latest=await requestJson<State>("/api/pacer?caseId="+encodeURIComponent(caseId));setState(latest);router.refresh();}catch{}
      }
    }finally{keepGoing.current=false;if(mounted.current)setRunning(false);}
  }
  return <div className="record-form">
    <h3>{state.docketId?"Connected RECAP docket":"Connect a RECAP docket"}</h3>
    <p className="ledger-row-meta">Import federal docket entries already available in CourtListener. This does not make paid PACER requests or calculate deadlines.</p>
    {!configured?<p role="alert">The server needs a CourtListener API token before importing.</p>:state.docketId?<div>
      <a className="text-link" href={"https://www.courtlistener.com/docket/"+state.docketId+"/"} target="_blank" rel="noreferrer">{state.name||"View connected docket"}</a>
      {state.lastSyncedAt&&<p className="ledger-row-meta">Last successful page: {new Date(state.lastSyncedAt).toLocaleString()}</p>}
      <div className="actions"><button className="btn" disabled={running} onClick={()=>run(!state.hasMore)}>{running?"Importing…":state.hasMore?"Resume import":"Refresh docket"}</button>{running&&<button className="btn secondary" onClick={()=>{keepGoing.current=false;setNotice("Pausing after the current page…");}}>Pause after this page</button>}</div>
      {state.hasMore&&!running&&<p>More pages remain. Resume to finish importing this docket.</p>}
    </div>:<>
      <form onSubmit={lookup}><div className="field"><label htmlFor="recap-docket">CourtListener docket link or ID</label><input id="recap-docket" required value={input} disabled={running} onChange={e=>{setInput(e.target.value);setPreview(null);}} placeholder="https://www.courtlistener.com/docket/…"/></div><button className="btn secondary" disabled={looking||running}>{looking?"Finding docket…":"Find docket"}</button></form>
      {preview&&<div className="recap-preview"><strong>{preview.name}</strong><p>{preview.number||"No docket number"} · {preview.court||"Court unavailable"}</p><a href={preview.url} target="_blank" rel="noreferrer">Review on CourtListener</a><div className="actions"><button className="btn" disabled={running} onClick={()=>run(false)}>{running?"Importing…":"Connect and import"}</button>{running&&<button className="btn secondary" onClick={()=>{keepGoing.current=false;}}>Pause after this page</button>}</div></div>}
    </>}
    {notice&&<p role="status">{notice}</p>}
    {error&&<p role="alert" className="error">{error}</p>}
    {state.docketId&&<p className="ledger-row-meta">Imported entries are maintained from RECAP. Use manual entries for your own notes. RECAP coverage may be incomplete or delayed.</p>}
  </div>;
}

