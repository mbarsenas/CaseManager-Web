"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { requestJson, errorMessage } from "@/lib/http";

export default function NewClientPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [conflictNotes, setConflictNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
    const created = await requestJson<{ id: string }>("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, conflictNotes }),
    });

    router.push(`/clients/${created.id}`);
    router.refresh();
    } catch (error) { setError(errorMessage(error)); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <h1>New client</h1>
      <form onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
        <div className="field">
          <label htmlFor="name">Name</label>
          <input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="phone">Phone</label>
          <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="conflictNotes">Conflict-check notes</label>
          <textarea
            id="conflictNotes"
            rows={3}
            value={conflictNotes}
            onChange={(e) => setConflictNotes(e.target.value)}
          />
        </div>
        {error && <p role="alert" style={{ color: "var(--danger)", marginBottom: 16 }}>{error}</p>}
        <button type="submit" className="btn" disabled={loading}>
          {loading ? "Saving…" : "Save client"}
        </button>
      </form>
    </div>
  );
}
