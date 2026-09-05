import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  if (!(await getServerSession(authOptions))?.user) redirect("/login");
  const clients = await prisma.client.findMany({
    include: { cases: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Clients</h1>
        <Link href="/clients/new" className="btn">New client</Link>
      </div>
      {clients.length === 0 ? (
        <p className="empty-state">No clients yet.</p>
      ) : (
        <div className="ledger">
          {clients.map((client) => (
            <div key={client.id} className="ledger-row">
              <div>
                <div className="ledger-row-title">{client.name}</div>
                <div className="ledger-row-meta">
                  {client.cases.length} case{client.cases.length === 1 ? "" : "s"}
                  {client.email ? ` · ${client.email}` : ""}
                </div>
              </div>
              <Link href={`/clients/${client.id}`} className="btn">View</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
