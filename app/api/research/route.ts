import { NextRequest, NextResponse } from "next/server";
import { requireUser, apiError } from "@/lib/api";
export const dynamic = "force-dynamic";

// CourtListener's opinion search is free and covers a large body of
// published US case law. It's not a Westlaw replacement — no headnotes,
// no KeyCite-style citator — but it gives real full-text case law search
// inside the app at no licensing cost.
const COURTLISTENER_SEARCH_URL = "https://www.courtlistener.com/api/rest/v3/search/";

export async function GET(req: NextRequest) {
  try {
  await requireUser();
  const q = req.nextUrl.searchParams.get("q");

  if (!q) {
    return NextResponse.json({ error: "q (query) is required" }, { status: 400 });
  }

  const url = new URL(COURTLISTENER_SEARCH_URL);
  url.searchParams.set("q", q);
  url.searchParams.set("type", "o"); // opinions
  url.searchParams.set("order_by", "score desc");

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
    snippet: r.snippet,
    absoluteUrl: r.absolute_url ? `https://www.courtlistener.com${r.absolute_url}` : null,
  }));

  return NextResponse.json({ results });
  } catch (e) { return apiError(e); }
}
