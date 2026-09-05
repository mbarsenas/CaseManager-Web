import { NextRequest } from "next/server";
import { listRecords, createRecord } from "@/lib/record-api";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) { return listRecords("cases", req); }
export async function POST(req: NextRequest) { return createRecord("cases", req); }

