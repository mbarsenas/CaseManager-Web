import { NextRequest, NextResponse } from "next/server";
import { requireUser, apiError } from "@/lib/api";
export const dynamic = "force-dynamic";

// CourtListener's opinion search is free and covers a large body of
// published US case law. It's not a Westlaw replacement — no headnotes,
// no KeyCite-style citator — but it gives real full-text case law search
// inside the app at no licensing cost.
const COURTLISTENER_SEARCH_URL = "https://www.courtlistener.com/api/rest/v4/search/";

// CourtListener court IDs covering Texas state courts + the Fifth Circuit
// (which hears federal appeals from Texas). Used as the default search
// scope; callers can pass scope=all to search every jurisdiction instead.
const TX_5TH_CIRCUIT_COURTS = [
  "ca5",        // U.S. Court of Appeals for the Fifth Circuit
  "tex",        // Texas Supreme Court
  "texcrimapp", // Texas Court of Criminal Appeals
  "texapp",     // Texas Courts of Appeals
  "txnd",       // U.S. District Court, N.D. Texas
  "txsd",       // U.S. District Court, S.D. Texas
  "txed",       // U.S. District Court, E.D. Texas
  "txwd",       // U.S. District Court, W.D. Texas
].join(" ");

export async function GET(req: NextRequest) {
  try {
  await requireUser();
  const q = req.nextUrl.searchParams.get("q");
  const scope = req.nextUrl.searchParams.get("scope"); // "tx5" (default) | "all"

  if (!q) {
    return NextResponse.json({ error: "q (query) is required" }, { status: 400 });
  }

  const url = new URL(COURTLISTENER_SEARCH_URL);
  url.searchParams.set("q", q);
  url.searchParams.set("type", "o"); // opinions
  url.searchParams.set("order_by", "score desc");
  if (scope !== "all") {
    url.searchParams.set("court", TX_5TH_CIRCUIT_COURTS);
  }

  const headers: Record<string, string> = {};
  if (process.env.COURTLISTENER_API_TOKEN) {
    headers["Authorization"] = `Token ${process.env.COURTLISTENER_API_TOKEN}`;
  }

  let res: Response;
  try {
    res = await fetch(url.toString(), { headers, signal: AbortSignal.timeout(15000), cache: "no-store" });
  } catch (fetchError) {
    const message = fetchError instanceof Error ? fetchError.message : String(fetchError);
    console.error("CourtListener fetch threw", fetchError);
    return NextResponse.json(
      { error: "Could not reach CourtListener", detail: message },
      { status: 502 }
    );
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("CourtListener search failed", { status: res.status, detail: detail.slice(0, 500) });
    return NextResponse.json(
      { error: "CourtListener search failed", status: res.status, detail: detail.slice(0, 300) },
      { status: 502 }
    );
  }

  const data = await res.json();

  const results = (data.results ?? []).slice(0, 20).map((r: Record<string, unknown>) => ({
    caseName: r.caseName,
    court: r.court,
    dateFiled: r.dateFiled,
    citation: Array.isArray(r.citation) ? r.citation[0] : r.citation,
    snippet: r.snippet || (Array.isArray(r.opinions) ? r.opinions.map((opinion: { snippet?: string }) => opinion.snippet || "").filter(Boolean).join(" … ") : ""),
    absoluteUrl: r.absolute_url ? `https://www.courtlistener.com${r.absolute_url}` : null,
  }));

  return NextResponse.json({ results });
  } catch (e) { return apiError(e); }
}
