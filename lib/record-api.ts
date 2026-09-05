import { NextRequest, NextResponse } from "next/server";
import { prisma } from "./prisma";
import { apiError, HttpError, requireUser } from "./api";
import { Entity, InputError, parseRecord } from "./records";
const models = { clients: prisma.client, cases: prisma.case, tasks: prisma.task, deadlines: prisma.deadline, documents: prisma.document, billing: prisma.billingEntry, docket: prisma.pacerDocketEntry, citations: prisma.citation };
// Delegates share CRUD semantics; validated data is constrained by parseRecord before it reaches Prisma.
type Delegate = { findMany(args: object): Promise<unknown>; findUnique(args: object): Promise<any>; create(args: object): Promise<unknown>; update(args: object): Promise<unknown>; delete(args: object): Promise<unknown> };
function model(entity: Entity) { return models[entity] as unknown as Delegate; }
export async function listRecords(entity: Entity, req?: NextRequest) {
  try {
    await requireUser();
    const caseId = req?.nextUrl.searchParams.get("caseId");
    const include = entity === "clients" ? { cases: { select: { id: true, title: true, status: true } } } : entity === "cases" ? { client: { select: { id: true, name: true } } } : undefined;
    return NextResponse.json(await model(entity).findMany({ where: caseId && !["clients","cases"].includes(entity) ? { caseId } : undefined, include }));
  } catch (e) { return apiError(e); }
}
export async function createRecord(entity: Entity, req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const data = parseRecord(entity, body);
    if (entity !== "clients") {
      const key = entity === "cases" ? "clientId" : "caseId";
      if (typeof body[key] !== "string" || !body[key]) throw new InputError(key + " is required.");
      data[key] = body[key];
    }
    if (entity === "citations") data.addedBy = user.name || user.email || user.id;
    if (entity === "documents" && String(data.fileUrl).startsWith("/api/files/")) throw new InputError("Use Upload file to attach a local document.");
    return NextResponse.json(await model(entity).create({ data }), { status: 201 });
  } catch (e) { return apiError(e); }
}
export async function updateRecord(entity: Entity, id: string, req: NextRequest) {
  try {
    await requireUser();
    const data = parseRecord(entity, await req.json(), true);
    const existing = await model(entity).findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Record not found.");
    if (entity === "documents" && "fileUrl" in data && data.fileUrl !== existing.fileUrl &&
      (String(data.fileUrl).startsWith("/api/files/") || String(existing.fileUrl).startsWith("/api/files/")))
      throw new InputError("An uploaded file's link cannot be changed.");
    return NextResponse.json(await model(entity).update({ where: { id }, data }));
  } catch (e) { return apiError(e); }
}
export async function deleteRecord(entity: Entity, id: string) {
  try {
    await requireUser();
    if (entity === "clients" || entity === "cases") throw new HttpError(405, "Archive cases instead of deleting their records.");
    const existing = await model(entity).findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Record not found.");
    await model(entity).delete({ where: { id } });
    if (entity === "documents" && /^\/api\/files\/[a-zA-Z0-9-]+$/.test(existing.fileUrl)) {
      const { removeFile } = await import("./storage");
      await removeFile(existing.fileUrl.split("/").pop());
    }
    return NextResponse.json({ success: true });
  } catch (e) { return apiError(e); }
}

