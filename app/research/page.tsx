"use client";

import { useState, useEffect } from "react";

type SearchResult = {
  caseName: string;
  court: string;
  dateFiled: string;
  citation: string | null;
  snippet: string;
  absoluteUrl: string | null;
};

type CaseOption = { id: string; title: string };

export default function ResearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [savedIndex, setSavedIndex] = useState<number | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState("");

  useEffect(() => {
    fetch("/api/cases")
      .then((res) => res.json())
      .then((data) => setCases(data));
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setResults([]);

    const res = await fetch(`/api/research?q=${encodeURIComponent(query)}`);
    setLoading(false);

    if (!res.ok) {
      setError("Search failed — CourtListener may be unavailable, or the query needs adjusting.");
      return;
    }

    const data = await res.json();
    setResults(data.results ?? []);
  }

  async function handleSaveCitation(result: SearchResult, index: number) {
    if (!selectedCaseId) {
      setError("Pick a case first to save this citation to.");
      return;
    }

    const citationText = `${result.caseName}${result.citation ? `, ${result.citation}` : ""}`;

    const res = await fetch("/api/citations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caseId: selectedCaseId,
        citationText,
        westlawUrl: result.absoluteUrl,
        notes: "Saved from case law search (CourtListener)",
      }),
    });

    if (res.ok) setSavedIndex(index);
  }

  return (
    <div>
      <h1>Case law search</h1>
      <p className="ledger-row-meta" style={{ marginBottom: 20 }}>
        Searches published US case law via CourtListener — free, full-text, no
        headnotes or citator. For a citation you already have from Westlaw,
        add it directly from the case page instead.
      </p>

      <form onSubmit={handleSearch} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. negligence duty of care"
          style={{ flex: 1, border: "1px solid var(--paper-line)", padding: "8px 10px" }}
        />
        <button type="submit" className="btn" disabled={loading}>
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {cases.length > 0 && (
        <div className="field" style={{ maxWidth: 320 }}>
          <label htmlFor="caseSelect">Save results to case</label>
          <select
            id="caseSelect"
            value={selectedCaseId}
            onChange={(e) => setSelectedCaseId(e.target.value)}
          >
            <option value="">Select a case…</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>
      )}

      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}

      <div className="ledger">
        {results.map((r, i) => (
          <div key={i} className="ledger-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
            <div className="ledger-row-title">{r.caseName}</div>
            <div className="ledger-row-meta">
              {r.court}{r.dateFiled ? ` · ${r.dateFiled}` : ""}{r.citation ? ` · ${r.citation}` : ""}
            </div>
            {r.snippet && <p style={{ fontSize: "0.9rem" }}>{r.snippet.replace(/<[^>]*>/g, "")}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              {r.absoluteUrl && (
                <a href={r.absoluteUrl} target="_blank" rel="noreferrer" className="btn">
                  Read opinion
                </a>
              )}
              <button
                className="btn"
                onClick={() => handleSaveCitation(r, i)}
                disabled={savedIndex === i}
              >
                {savedIndex === i ? "Saved" : "Save to case"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
