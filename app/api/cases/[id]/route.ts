import { NextRequest, NextResponse } from "next/server";
import { updateRecord, deleteRecord } from "@/lib/record-api";
import { prisma } from "@/lib/prisma";
import { requireUser, apiError } from "@/lib/api";
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
 try { await requireUser(); const record = await prisma.case.findUnique({ where: { id: params.id }, include: { client: true, tasks: true, deadlines: true, documents: true, billingEntries: true, docketEntries: true, citations: true } }); return record ? NextResponse.json(record) : NextResponse.json({ error: "Case not found." }, { status: 404 }); } catch(e) { return apiError(e); }
}
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) { return updateRecord("cases", params.id, req); }
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) { return deleteRecord("cases", params.id); }

