"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { definitions, fieldsFor, Entity, displayDate, safeUrl } from "@/lib/records";
export type Row = { id: string; [key: string]: unknown };
const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
function initial(entity: Entity, record?: Row) {
  const value: Record<string, string | number | boolean> = {};
  for (const f of fieldsFor(entity)) {
    value[f.key] = record?.[f.key] == null ? f.kind === "checkbox" ? f.key === "billable" : f.key === "entryDate" ? new Date().toISOString().slice(0,10) : f.kind === "select" ? f.options?.[0] || "" : "" :
      f.kind === "date" ? String(record[f.key]).slice(0,10) : record[f.key] as string | number | boolean;
  }
  if (!record && entity === "documents") value.tag = "OTHER";
  if (!record && entity === "docket") value.source = "MANUAL";
  return value;
}
export function RecordEditor({ entity, record, caseId, onClose }: { entity: Entity; record?: Row; caseId?: string; onClose: () => void }) {
  const router = useRouter(), [values, setValues] = useState(() => initial(entity, record));
  const [error, setError] = useState(""), [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const body: Record<string, unknown> = { ...values };
      for (const f of fieldsFor(entity)) if (f.kind === "number") body[f.key] = values[f.key] === "" ? null : Number(values[f.key]);
      if (caseId) body.caseId = caseId;
      const response = await fetch("/api/" + entity + (record ? "/" + record.id : ""), { method: record ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save.");
      router.refresh(); onClose();
    } catch(e) { setError(e instanceof Error ? e.message : "Unable to save. Please try again."); }
    finally { setSaving(false); }
  }
  return <form className="record-form" onSubmit={submit}>
    <h3>{record ? "Edit" : "Add"} {definitions[entity].title.toLowerCase()}</h3>
    <div className="form-grid">{fieldsFor(entity).map(f => <div className={"field " + (f.kind === "textarea" ? "wide" : "")} key={f.key}>
      <label htmlFor={entity + "-" + f.key}>{f.label}{f.required ? " *" : ""}</label>
      {f.kind === "textarea" ? <textarea id={entity + "-" + f.key} rows={3} required={f.required} maxLength={20000} value={String(values[f.key])} onChange={e => setValues({ ...values, [f.key]: e.target.value })} /> :
       f.kind === "select" ? <select id={entity + "-" + f.key} value={String(values[f.key])} onChange={e => setValues({ ...values, [f.key]: e.target.value })}>{f.options?.map(o => <option key={o}>{o}</option>)}</select> :
       f.kind === "checkbox" ? <input id={entity + "-" + f.key} type="checkbox" checked={Boolean(values[f.key])} onChange={e => setValues({ ...values, [f.key]: e.target.checked })} /> :
       <input id={entity + "-" + f.key} type={f.kind === "url" && String(values[f.key]).startsWith("/api/files/") ? "text" : f.kind || "text"} required={f.required} min={f.kind === "number" ? 0 : undefined} max={f.max} step={f.key === "entryNumber" ? "1" : "any"} maxLength={20000} readOnly={f.key === "fileUrl" && String(record?.fileUrl).startsWith("/api/files/")} value={String(values[f.key])} onChange={e => setValues({ ...values, [f.key]: e.target.value })} />}
    </div>)}</div>
    {error && <p role="alert" className="error">{error}</p>}
    <div className="actions"><button className="btn" disabled={saving}>{saving ? "Saving…" : "Save"}</button><button className="btn secondary" type="button" disabled={saving} onClick={onClose}>Cancel</button></div>
  </form>;
}
export function EditRecord({ entity, record }: { entity: Entity; record: Row }) {
  const [open,setOpen] = useState(false);
  return open ? <RecordEditor entity={entity} record={record} onClose={() => setOpen(false)} /> : <button className="btn secondary" onClick={() => setOpen(true)}>Edit {entity === "cases" ? "case" : "client"}</button>;
}
function UploadForm({ caseId, onClose }: { caseId: string; onClose: () => void }) {
  const router = useRouter(), [error,setError] = useState(""), [saving,setSaving] = useState(false);
  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = new FormData(e.currentTarget); form.set("caseId",caseId); setSaving(true); setError("");
    try { const res = await fetch("/api/uploads", { method:"POST", body:form }); const data=await res.json(); if(!res.ok) throw new Error(data.error || "Upload failed."); router.refresh(); onClose(); }
    catch(e) { setError(e instanceof Error ? e.message : "Upload failed."); } finally { setSaving(false); }
  }
  return <form className="record-form" onSubmit={upload}><h3>Upload document</h3><div className="field"><label htmlFor="upload-file">File (up to 20 MB)</label><input id="upload-file" name="file" type="file" required /></div><div className="field"><label htmlFor="upload-tag">Tag</label><select id="upload-tag" name="tag" defaultValue="OTHER">{["PLEADING","CORRESPONDENCE","EVIDENCE","CONTRACT","OTHER"].map(t=><option key={t}>{t}</option>)}</select></div>{error && <p role="alert" className="error">{error}</p>}<div className="actions"><button className="btn" disabled={saving}>{saving ? "Uploading…" : "Upload"}</button><button type="button" className="btn secondary" onClick={onClose} disabled={saving}>Cancel</button></div></form>;
}
export function RecordSection({ entity, records, caseId, children }: { entity: Entity; records: Row[]; caseId: string; children?: React.ReactNode }) {
  const router=useRouter(), [editing,setEditing]=useState<Row | "new" | null>(null), [upload,setUpload]=useState(false), [error,setError]=useState(""), [busy,setBusy]=useState(false), [pending,startTransition]=useTransition();
  const [deleting,setDeleting]=useState<string | null>(null);
  async function mutate(row:Row, method:string, body?:object) {
    setBusy(true);setError("");
    try { const res=await fetch("/api/"+entity+"/"+row.id,{method,headers:{"Content-Type":"application/json"},body:body?JSON.stringify(body):undefined});const data=await res.json();if(!res.ok)throw new Error(data.error || "Update failed.");setDeleting(null);startTransition(()=>router.refresh()); }
    catch(e) { setError(e instanceof Error?e.message:"Update failed."); } finally{setBusy(false);}
  }
  return <section id={entity} className="case-section">
    <div className="section-heading"><h2>{definitions[entity].title} <span className="count">{records.length}</span></h2><div className="actions">{entity==="documents"&&<button className="btn" onClick={()=>{setUpload(true);setEditing(null);}}>Upload file</button>}<button className="btn secondary" onClick={()=>{setEditing("new");setUpload(false);}}>{entity==="documents"?"Add link":"Add"}</button></div></div>
    {entity==="citations"&&<p className="ledger-row-meta">Paste a citation, its Westlaw permalink, and notes explaining its relevance.</p>}
    {entity==="docket"&&<p className="ledger-row-meta">Import entries from RECAP or add manual docket notes.</p>}
    {children}
    {editing&&<RecordEditor key={editing==="new"?"new":editing.id} entity={entity} record={editing==="new"?undefined:editing} caseId={caseId} onClose={()=>setEditing(null)} />}
    {upload&&<UploadForm caseId={caseId} onClose={()=>setUpload(false)} />}
    {error&&<p role="alert" className="error">{error}</p>}
    {!records.length ? <p className="empty-state">No {definitions[entity].title.toLowerCase()} yet.</p> : <div className="ledger">{records.map(row=>{
      const title=String(row.title || row.description || row.citationText || row.fileName || "");
      const done=Boolean(row.done || row.completed), due=String(row.dueDate || "").slice(0,10), today=new Date().toLocaleDateString("en-CA");
      const url=String(row.fileUrl || row.documentUrl || row.westlawUrl || "");
      const canLink=safeUrl(url) || (entity==="documents"&&/^\/api\/files\/[a-zA-Z0-9-]+$/.test(url));
      return <article key={row.id} className={"ledger-row record-row "+(done?"completed":"")}>
        <div className="record-content"><div className="ledger-row-title">{entity==="docket"&&row.entryNumber!=null?"#"+row.entryNumber+" · ":""}{title}</div>
          <div className="ledger-row-meta">{entity==="tasks"&&String(row.assignee || "Unassigned")}{due&&<> · {displayDate(row.dueDate)} {done ? "· Completed" : due<today ? <strong className="error">· Overdue</strong> : ""}</>}{entity==="deadlines"&&" · "+String(row.source)}{entity==="documents"&&String(row.tag)}{entity==="docket"&&displayDate(row.entryDate)+" · "+String(row.source)}{entity==="billing"&&displayDate(row.entryDate)+" · "+row.hours+"h × "+money(Number(row.rate))+" · "+(row.billable?"Billable":"Non-billable")}</div>
          {row.notes ? <p className="record-notes">{String(row.notes)}</p> : null}
          {entity==="citations"&&<div className="ledger-row-meta">{row.addedBy ? "Added by "+row.addedBy+" · " : ""}{displayDate(row.createdAt)}</div>}
          {canLink&&<a className="text-link" href={url} target="_blank" rel="noreferrer">{entity==="documents"?"Download / open document":entity==="citations"?"Open source":"Open docket document"}</a>}
          {entity==="docket"&&Array.isArray(row.recapDocuments)&&row.recapDocuments.length>0&&<ul className="recap-documents">{row.recapDocuments.map((doc:any)=>typeof doc.url==="string"&&safeUrl(doc.url)?<li key={doc.id}><a href={doc.url} target="_blank" rel="noreferrer">{String(doc.name)}</a>{doc.available?"":" — PDF not available in RECAP"}</li>:null)}</ul>}
        </div>
        <div className="record-actions">{entity==="billing"&&<strong>{money(Number(row.hours)*Number(row.rate))}</strong>}
          {(entity==="tasks"||entity==="deadlines")&&<button className="btn secondary" disabled={busy||pending} onClick={()=>mutate(row,"PATCH",entity==="tasks"?{done:!done}:{completed:!done})}>{done?"Reopen":"Complete"}</button>}
          {row.recapEntryId?<span className="status-tag">Imported from RECAP</span>:<><button className="btn secondary" onClick={()=>{setEditing(row);setUpload(false);}}>Edit</button>
          {deleting===row.id?<div className="delete-confirm"><span>Delete this record?</span><button className="btn danger" disabled={busy||pending} onClick={()=>mutate(row,"DELETE")}>Delete</button><button className="btn secondary" onClick={()=>setDeleting(null)}>Cancel</button></div>:<button className="text-button" onClick={()=>setDeleting(row.id)}>Delete</button>}</>}
        </div>
      </article>;
    })}</div>}
    {entity==="billing"&&<p className="billing-total">Total billable: {money(records.filter(r=>r.billable).reduce((sum,r)=>sum+Number(r.hours)*Number(r.rate),0))}</p>}
  </section>;
}
