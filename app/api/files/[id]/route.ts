import { NextResponse } from "next/server";
import { requireUser, apiError, HttpError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { loadFile } from "@/lib/storage";
export const runtime = "nodejs";
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    if (!/^[a-zA-Z0-9-]+$/.test(params.id)) throw new HttpError(404, "Document not found.");
    const document = await prisma.document.findFirst({ where: { fileUrl: "/api/files/" + params.id } });
    if (!document) throw new HttpError(404, "Document not found.");
    let data: Buffer;
    try { data = await loadFile(params.id); } catch { throw new HttpError(404, "File is unavailable. Restore it from your file backup."); }
    return new NextResponse(new Uint8Array(data), { headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": "attachment; filename*=UTF-8''" + encodeURIComponent(document.fileName).replace(/'/g, "%27"),
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"
    } });
  } catch (e) { return apiError(e); }
}

