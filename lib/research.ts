// Track each source independently for each destination case, never by result index.
export function citationSaveKey(caseId: string, result: { caseName: string; citation: string | null; absoluteUrl: string | null }) {
  return JSON.stringify([caseId, result.absoluteUrl, result.caseName, result.citation]);
}
