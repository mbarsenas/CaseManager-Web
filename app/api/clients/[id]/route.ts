import { NextRequest, NextResponse } from "next/server";
import { updateRecord, deleteRecord } from "@/lib/record-api";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) { return updateRecord("clients", params.id, req); }
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) { return deleteRecord("clients", params.id); }

