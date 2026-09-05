import { NextRequest, NextResponse } from "next/server";
import { requireUser, apiError, HttpError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { saveFile, removeFile } from "@/lib/storage";
import { parseRecord } from "@/lib/records";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const limit = 20 * 1024 * 1024;
    if (Number(req.headers.get("content-length")) > limit + 65536) throw new HttpError(413, "Files must be 20 MB or smaller.");
    const form = await req.formData(), file = form.get("file"), caseId = form.get("caseId");
    if (!(file instanceof File) || !file.size || file.size > limit) throw new HttpError(400, "Choose a non-empty file up to 20 MB.");
    if (typeof caseId !== "string" || !await prisma.case.findUnique({ where: { id: caseId } })) throw new HttpError(404, "Case not found.");
    const fileName = file.name.replace(/[\x00-\x1f\\/]/g, "_").slice(0, 240) || "document";
    const checked = parseRecord("documents", { fileName, fileUrl: "https://placeholder.invalid", tag: form.get("tag") || "OTHER" });
    const id = await saveFile(Buffer.from(await file.arrayBuffer()));
    try {
      const document = await prisma.document.create({ data: { caseId, fileName, fileUrl: "/api/files/" + id, tag: checked.tag as "OTHER" } });
      return NextResponse.json(document, { status: 201 });
    } catch (e) { await removeFile(id); throw e; }
  } catch (e) { return apiError(e); }
}

