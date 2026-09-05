import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { EditRecord } from "@/components/RecordControls";
export const dynamic = "force-dynamic";
export default async function ClientPage({params}:{params:{id:string}}) {
  if(!(await getServerSession(authOptions))?.user) redirect("/login");
  const client=await prisma.client.findUnique({where:{id:params.id},include:{cases:{orderBy:{updatedAt:"desc"}}}});
  if(!client) notFound();
  return <div><a href="/clients" className="text-link">← Clients</a><h1>{client.name}</h1>
    <EditRecord entity="clients" record={JSON.parse(JSON.stringify(client))}/>
    <div className="case-facts"><div><strong>Email</strong><span>{client.email || "—"}</span></div><div><strong>Phone</strong><span>{client.phone || "—"}</span></div></div>
    <section className="case-section"><h2>Conflict notes</h2><p className="record-notes">{client.conflictNotes || "No conflict notes recorded."}</p></section>
    <section className="case-section"><div className="section-heading"><h2>Cases</h2><a className="btn" href={"/cases/new?clientId="+client.id}>New case</a></div><div className="ledger">{client.cases.map(c=><a className="ledger-row" href={"/cases/"+c.id} key={c.id}><strong>{c.title}</strong><span className="status-tag">{c.status}</span></a>)}</div>{!client.cases.length&&<p className="empty-state">No cases yet.</p>}</section>
  </div>;
}
