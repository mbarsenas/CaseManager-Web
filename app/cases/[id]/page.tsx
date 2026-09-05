import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { EditRecord, RecordSection } from "@/components/RecordControls";
export const dynamic = "force-dynamic";
export default async function CaseDetailPage({ params }: { params: { id: string } }) {
  if (!(await getServerSession(authOptions))?.user) redirect("/login");
  const record = await prisma.case.findUnique({ where: { id: params.id }, include: {
    client: true, tasks: { orderBy: [{ done: "asc" }, { dueDate: "asc" }] }, deadlines: { orderBy: [{ completed: "asc" }, { dueDate: "asc" }] },
    documents: { orderBy: { uploadedAt: "desc" } }, billingEntries: { orderBy: { entryDate: "desc" } },
    docketEntries: { orderBy: { entryDate: "desc" } }, citations: { orderBy: { createdAt: "desc" } }
  } });
  if (!record) notFound();
  const c = JSON.parse(JSON.stringify(record));
  return <div><a href="/" className="text-link">← All matters</a>
    <header className="case-header"><div><p className="eyebrow">CASE RECORD · {c.caseNumber || "NO CASE NUMBER"}</p><h1>{c.title}</h1><p className="ledger-row-meta">{c.type || "Case type not set"} · {c.court || "Court not set"} · <span className="status-tag">{c.status}</span></p></div></header>
    <EditRecord entity="cases" record={c} />
    <div className="case-facts"><div><strong>Client</strong><a href={"/clients/"+c.client.id}>{c.client.name}</a></div><div><strong>Judge</strong><span>{c.judge || "—"}</span></div><div><strong>Opposing counsel</strong><span>{c.opposingCounsel || "—"}</span></div></div>
    <nav className="case-tabs" aria-label="Case sections">{["deadlines","tasks","documents","billing","docket","citations"].map(t=><a key={t} href={"#"+t}>{t==="docket"?"PACER docket":t}</a>)}</nav>
    <RecordSection entity="deadlines" records={c.deadlines} caseId={c.id}/>
    <RecordSection entity="tasks" records={c.tasks} caseId={c.id}/>
    <RecordSection entity="documents" records={c.documents} caseId={c.id}/>
    <RecordSection entity="billing" records={c.billingEntries} caseId={c.id}/>
    <RecordSection entity="docket" records={c.docketEntries} caseId={c.id}/>
    <RecordSection entity="citations" records={c.citations} caseId={c.id}/>
  </div>;
}
