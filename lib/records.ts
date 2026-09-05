export type Field = { key: string; label: string; kind?: "text" | "textarea" | "date" | "number" | "checkbox" | "url" | "email" | "select"; required?: boolean; options?: string[]; max?: number };
export const definitions = {
  clients: { title: "Clients", fields: [
    { key: "name", label: "Name", required: true }, { key: "email", label: "Email", kind: "email" },
    { key: "phone", label: "Phone" }, { key: "conflictNotes", label: "Conflict notes", kind: "textarea" }
  ] },
  cases: { title: "Case details", fields: [
    { key: "title", label: "Case title", required: true }, { key: "type", label: "Case type" },
    { key: "caseNumber", label: "Case number" }, { key: "court", label: "Court" }, { key: "judge", label: "Judge" },
    { key: "opposingCounsel", label: "Opposing counsel" },
    { key: "status", label: "Status", kind: "select", options: ["OPEN", "PENDING", "CLOSED", "ARCHIVED"], required: true }
  ] },
  tasks: { title: "Tasks", fields: [
    { key: "title", label: "Task", required: true }, { key: "dueDate", label: "Due date", kind: "date" },
    { key: "assignee", label: "Assignee" }, { key: "done", label: "Done", kind: "checkbox" }
  ] },
  deadlines: { title: "Deadlines", fields: [
    { key: "description", label: "Description", kind: "textarea", required: true },
    { key: "dueDate", label: "Due date", kind: "date", required: true },
    { key: "source", label: "Source", kind: "select", options: ["MANUAL", "PACER"], required: true },
    { key: "completed", label: "Completed", kind: "checkbox" }
  ] },
  documents: { title: "Documents", fields: [
    { key: "fileName", label: "File name", required: true }, { key: "fileUrl", label: "Document link", kind: "url", required: true },
    { key: "tag", label: "Tag", kind: "select", options: ["PLEADING", "CORRESPONDENCE", "EVIDENCE", "CONTRACT", "OTHER"], required: true }
  ] },
  billing: { title: "Billing", fields: [
    { key: "description", label: "Description", kind: "textarea", required: true },
    { key: "entryDate", label: "Entry date", kind: "date", required: true },
    { key: "hours", label: "Hours", kind: "number", required: true, max: 10000 },
    { key: "rate", label: "Hourly rate ($)", kind: "number", required: true, max: 1000000 },
    { key: "billable", label: "Billable", kind: "checkbox" }
  ] },
  docket: { title: "PACER docket", fields: [
    { key: "entryNumber", label: "Entry number", kind: "number", max: 2147483647 },
    { key: "entryDate", label: "Entry date", kind: "date", required: true },
    { key: "description", label: "Description", kind: "textarea", required: true },
    { key: "documentUrl", label: "Document link", kind: "url" },
    { key: "source", label: "Source", kind: "select", options: ["PACER", "RECAP", "MANUAL"], required: true }
  ] },
  citations: { title: "Citations", fields: [
    { key: "citationText", label: "Citation text", kind: "textarea", required: true },
    { key: "westlawUrl", label: "Westlaw permalink / source link", kind: "url" },
    { key: "notes", label: "Why this is relevant", kind: "textarea" }
  ] }
} satisfies Record<string, { title: string; fields: Field[] }>;
export type Entity = keyof typeof definitions;
export function isEntity(value: string): value is Entity { return Object.hasOwn(definitions, value); }
export function fieldsFor(entity: Entity): Field[] { return definitions[entity].fields; }
export function safeUrl(value: string): boolean {
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
}
export class InputError extends Error {}
export function parseRecord(entity: Entity, body: unknown, partial = false): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new InputError("Expected a JSON object.");
  const input = body as Record<string, unknown>, data: Record<string, unknown> = {};
  for (const f of fieldsFor(entity)) {
    if (partial && !(f.key in input)) continue;
    let value = input[f.key];
    if (value === undefined && !partial) {
      if (f.key === "status") value = "OPEN";
      if (f.key === "source") value = "MANUAL";
      if (f.key === "tag") value = "OTHER";
      if (f.key === "entryDate") value = new Date().toISOString().slice(0, 10);
    }
    if (f.kind === "checkbox") {
      if (value !== undefined && typeof value !== "boolean") throw new InputError(f.label + " must be true or false.");
      data[f.key] = value ?? (f.key === "billable");
      continue;
    }
    if (value === "" || value === null || value === undefined) {
      if (f.required) throw new InputError(f.label + " is required.");
      data[f.key] = null; continue;
    }
    if (f.kind === "number") {
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > (f.max ?? 1e9) || (f.key === "entryNumber" && !Number.isInteger(value)))
        throw new InputError(f.label + " must be a valid non-negative number.");
      data[f.key] = value; continue;
    }
    if (typeof value !== "string") throw new InputError(f.label + " must be text.");
    value = value.trim();
    const text = value as string;
    if ((f.required && !text) || text.length > 20000) throw new InputError(f.label + " is empty or too long.");
    if (f.kind === "select" && !f.options?.includes(text)) throw new InputError("Invalid " + f.label.toLowerCase() + ".");
    if (f.kind === "url" && text && !safeUrl(text) && !(entity === "documents" && /^\/api\/files\/[a-zA-Z0-9-]+$/.test(text)))
      throw new InputError(f.label + " must be an http or https URL.");
    if (f.kind === "email" && text && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) throw new InputError("Enter a valid email.");
    if (f.kind === "date") {
      const day = text.slice(0, 10), date = new Date(day + "T00:00:00.000Z");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== day)
        throw new InputError("Invalid " + f.label.toLowerCase() + ".");
      data[f.key] = date;
    } else data[f.key] = text || null;
  }
  return data;
}
export function displayDate(value: unknown): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", dateStyle: "medium" }).format(new Date(String(value)));
}

