"use client";
import { useState, useEffect } from "react";
import { requestJson, errorMessage } from "@/lib/http";
import { safeUrl } from "@/lib/records";
import { citationSaveKey } from "@/lib/research";
type SearchResult = { caseName: string; court: string; dateFiled: string; citation: string | null; snippet: string; absoluteUrl: string | null };
type CaseOption = { id: string; title: string };
export default function ResearchPage() {
  const [query,setQuery]=useState(""),[results,setResults]=useState<SearchResult[]>([]);
  const [scope,setScope]=useState("tx5");
  const [loading,setLoading]=useState(false),[searched,setSearched]=useState(false),[error,setError]=useState("");
  const [cases,setCases]=useState<CaseOption[]>([]),[casesLoading,setCasesLoading]=useState(true),[casesError,setCasesError]=useState("");
  const [selectedCaseId,setSelectedCaseId]=useState(""),[saved,setSaved]=useState<Set<string>>(new Set()),[savingKey,setSavingKey]=useState<string|null>(null);
  const [notice,setNotice]=useState("");
  async function loadCases() {
    setCasesLoading(true);setCasesError("");
    try { const data=await requestJson<CaseOption[]>("/api/cases");if(!Array.isArray(data))throw new Error("Unable to load cases.");setCases(data); }
    catch(e){setCasesError(errorMessage(e));}finally{setCasesLoading(false);}
  }
  useEffect(()=>{void loadCases();},[]);
  async function handleSearch(e:React.FormEvent) {
    e.preventDefault();if(!query.trim()||loading||savingKey)return;
    setLoading(true);setError("");setNotice("");setResults([]);setSearched(false);
    try {const data=await requestJson<{results:SearchResult[]}>("/api/research?q="+encodeURIComponent(query.trim())+"&scope="+scope);
      if(!Array.isArray(data.results))throw new Error("Search returned an unexpected response.");
      setResults(data.results);setSearched(true);
    }catch(e){setError(errorMessage(e));}finally{setLoading(false);}
  }
  async function handleSaveCitation(result:SearchResult) {
    if(!selectedCaseId){setError("Pick a case first to save this citation to.");return;}
    const key=citationSaveKey(selectedCaseId,result);
    if(savingKey||saved.has(key))return;
    setSavingKey(key);setError("");setNotice("");
    try {
      await requestJson("/api/citations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        caseId:selectedCaseId,citationText:result.caseName+(result.citation?", "+result.citation:""),
        westlawUrl:result.absoluteUrl,notes:"Saved from case law search (CourtListener)"
      })});
      setSaved(previous=>new Set(previous).add(key));
      setNotice("Citation saved to "+(cases.find(c=>c.id===selectedCaseId)?.title || "the selected case")+".");
    }catch(e){setError(errorMessage(e));}finally{setSavingKey(null);}
  }
  return <div>
    <h1>Case law search</h1>
    <p className="ledger-row-meta" style={{marginBottom:20}}>Search published US case law via CourtListener. Results do not include Westlaw headnotes or a citator. Add existing Westlaw citations directly from the case record.</p>
    <form onSubmit={handleSearch} className="filter-bar">
      <div className="field"><label htmlFor="research-query">Search terms</label><input id="research-query" required value={query} onChange={e=>setQuery(e.target.value)} placeholder="e.g. negligence duty of care"/></div>
      <div className="field"><label htmlFor="research-jurisdiction">Jurisdiction</label>
        <select id="research-jurisdiction" value={scope} disabled={loading} onChange={e=>{setScope(e.target.value);setResults([]);setSearched(false);}}>
          <option value="tx5">5th Circuit &amp; Texas (default)</option>
          <option value="all">All jurisdictions</option>
        </select>
      </div>
      <button className="btn" disabled={loading||Boolean(savingKey)}>{loading?"Searching…":"Search"}</button>
    </form>
    <p className="ledger-row-meta">{scope==="tx5"?"Preset: Fifth Circuit, Texas state appellate courts, and federal district courts in Texas.":"Searching all available jurisdictions."}</p>
    {casesLoading?<p role="status">Loading cases…</p>:casesError?<div><p role="alert" className="error">{casesError}</p><button className="btn secondary" onClick={loadCases}>Retry loading cases</button></div>:cases.length?<div className="field" style={{maxWidth:420}}>
      <label htmlFor="caseSelect">Save results to case</label><select id="caseSelect" value={selectedCaseId} disabled={Boolean(savingKey)} onChange={e=>{setSelectedCaseId(e.target.value);setNotice("");}}>
        <option value="">Select a case…</option>{cases.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}
      </select>{selectedCaseId&&<a className="text-link" href={"/cases/"+selectedCaseId+"#citations"}>View this case's citations</a>}
    </div>:<p>Create a <a href="/cases/new">case</a> to save citations.</p>}
    {error&&<p role="alert" className="error">{error}</p>}
    {notice&&<p role="status">{notice}</p>}
    {searched&&!results.length&&<p className="empty-state">No results found. Try different search terms.</p>}
    <div className="ledger">{results.map((r,i)=>{
      const key=citationSaveKey(selectedCaseId,r),isSaved=saved.has(key);
      return <article key={key+"-"+i} className="ledger-row" style={{flexDirection:"column",alignItems:"stretch",gap:6}}>
        <div className="ledger-row-title">{r.caseName}</div><div className="ledger-row-meta">{r.court}{r.dateFiled?" · "+r.dateFiled:""}{r.citation?" · "+r.citation:""}</div>
        {r.snippet&&<p>{r.snippet.replace(/<[^>]*>/g,"")}</p>}
        <div className="actions">{r.absoluteUrl&&safeUrl(r.absoluteUrl)&&<a className="btn" href={r.absoluteUrl} target="_blank" rel="noreferrer">Read opinion</a>}
          <button className="btn" onClick={()=>handleSaveCitation(r)} disabled={isSaved||Boolean(savingKey)||!selectedCaseId}>{isSaved?"Saved":savingKey===key?"Saving…":"Save to case"}</button>
        </div>
      </article>;
    })}</div>
  </div>;
}

