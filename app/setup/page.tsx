"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { requestJson, errorMessage } from "@/lib/http";

export default function SetupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If setup was already completed, this page has no reason to exist.
    requestJson<{ needsSetup: boolean }>("/api/setup")
      .then((data) => {
        if (data.needsSetup === false) router.replace("/login");
      }).catch(error => setError(errorMessage(error)));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
    await requestJson("/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    router.push("/login");
    } catch (error) { setError(errorMessage(error)); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ maxWidth: 360, margin: "80px auto" }}>
      <h1>Create your account</h1>
      <p className="ledger-row-meta" style={{ marginBottom: 24 }}>
        This is a one-time setup — it only works because no account exists yet
        on this instance.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="name">Name</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p role="alert" style={{ color: "var(--danger)", marginBottom: 16 }}>{error}</p>}
        <button type="submit" className="btn" disabled={loading}>
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>
    </div>
  );
}
