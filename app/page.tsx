import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { displayDate } from "@/lib/records";
export const dynamic = "force-dynamic";
export default async function DashboardPage({searchParams}:{searchParams:{q?:string;status?:string}}) {
 if(!(await getServerSession(authOptions))?.user) redirect("/login");
 const q=(searchParams.q||"").trim().slice(0,200);
 const status=["OPEN","PENDING","CLOSED","ARCHIVED"].includes(searchParams.status||"") ? searchParams.status as "OPEN" : undefined;
 const [cases,deadlines,tasks]=await Promise.all([
   prisma.case.findMany({where:{...(status?{status}:{}),...(q?{OR:[{title:{contains:q,mode:"insensitive" as const}},{caseNumber:{contains:q,mode:"insensitive" as const}},{client:{name:{contains:q,mode:"insensitive" as const}}}]}:{})},include:{client:true},orderBy:{updatedAt:"desc"}}),
   prisma.deadline.findMany({where:{completed:false,case:{status:{in:["OPEN","PENDING"]}}},include:{case:{select:{id:true,title:true}}},orderBy:{dueDate:"asc"},take:5}),
   prisma.task.count({where:{done:false,case:{status:{in:["OPEN","PENDING"]}}}})
 ]);
 return <div><p className="eyebrow">PRACTICE OVERVIEW</p><div className="section-heading"><h1>Matters</h1><Link href="/cases/new" className="btn">New case</Link></div>
   <div className="summary-strip"><div><strong>{cases.length}</strong><span>Matching matters</span></div><div><strong>{tasks}</strong><span>Open tasks</span></div></div>
   <section className="case-section"><h2>Upcoming & overdue deadlines</h2>{deadlines.length?<div className="ledger">{deadlines.map(d=><Link key={d.id} href={"/cases/"+d.caseId+"#deadlines"} className="ledger-row"><div><strong>{d.description}</strong><div className="ledger-row-meta">{d.case.title}</div></div><span>{displayDate(d.dueDate)}</span></Link>)}</div>:<p className="ledger-row-meta">No outstanding deadlines.</p>}</section>
   <form className="filter-bar" method="get"><div className="field"><label htmlFor="q">Search matters</label><input id="q" name="q" defaultValue={q} placeholder="Case title, number, or client"/></div><div className="field"><label htmlFor="status">Status</label><select id="status" name="status" defaultValue={status||""}><option value="">All statuses</option>{["OPEN","PENDING","CLOSED","ARCHIVED"].map(s=><option key={s}>{s}</option>)}</select></div><button className="btn">Search</button></form>
   {!cases.length?<p className="empty-state">No matching cases. <Link href="/clients/new">Add a client</Link>, then create a case.</p>:<div className="ledger">{cases.map(c=><Link key={c.id} href={"/cases/"+c.id} className="ledger-row"><div><div className="ledger-row-title">{c.title}</div><div className="ledger-row-meta">{c.client.name}{c.type?" · "+c.type:""}{c.court?" · "+c.court:""}</div></div><span className={"status-tag "+c.status.toLowerCase()}>{c.status}</span></Link>)}</div>}
 </div>;
}
