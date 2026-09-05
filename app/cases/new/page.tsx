"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { requestJson, errorMessage } from "@/lib/http";

type ClientOption = { id: string; name: string };

export default function NewCasePage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState("");
  const [caseNumber, setCaseNumber] = useState("");
  const [court, setCourt] = useState("");
  const [judge, setJudge] = useState("");
  const [opposingCounsel, setOpposingCounsel] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientsError, setClientsError] = useState("");

  async function loadClients() {
    setClientsLoading(true);
    setClientsError("");
    try {
      const data = await requestJson<ClientOption[]>("/api/clients");
      if (!Array.isArray(data)) throw new Error("Unable to load the client list.");
      setClients(data);
    } catch (error) { setClientsError(errorMessage(error)); }
    finally { setClientsLoading(false); }
  }

  useEffect(() => {
    setClientId(new URLSearchParams(window.location.search).get("clientId") || "");
    void loadClients();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
    const created = await requestJson<{ id: string }>("/api/cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, title, type, caseNumber, court, judge, opposingCounsel }),
    });

    router.push(`/cases/${created.id}`);
    router.refresh();
    } catch (error) { setError(errorMessage(error)); }
    finally { setLoading(false); }
  }

  if (clientsLoading) return <div><h1>New case</h1><p role="status">Loading clients…</p></div>;
  if (clientsError) return <div><h1>New case</h1><p role="alert" className="error">{clientsError}</p><button className="btn" onClick={loadClients}>Retry loading clients</button> <a href="/login">Sign in</a></div>;

  if (clients.length === 0) {
    return (
      <div>
        <h1>New case</h1>
        <p className="empty-state">
          You need at least one client before you can create a case. <a href="/clients/new">Add a client first</a>.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1>New case</h1>
      <form onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
        <div className="field">
          <label htmlFor="clientId">Client</label>
          <select id="clientId" required value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="" disabled>Select a client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="title">Case title</label>
          <input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="type">Case type</label>
          <input id="type" value={type} onChange={(e) => setType(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="caseNumber">Case number</label>
          <input id="caseNumber" value={caseNumber} onChange={(e) => setCaseNumber(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="court">Court</label>
          <input id="court" value={court} onChange={(e) => setCourt(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="judge">Judge</label>
          <input id="judge" value={judge} onChange={(e) => setJudge(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="opposingCounsel">Opposing counsel</label>
          <input
            id="opposingCounsel"
            value={opposingCounsel}
            onChange={(e) => setOpposingCounsel(e.target.value)}
          />
        </div>
        {error && <p role="alert" style={{ color: "var(--danger)", marginBottom: 16 }}>{error}</p>}
        <button type="submit" className="btn" disabled={loading}>
          {loading ? "Saving…" : "Save case"}
        </button>
      </form>
    </div>
  );
}
