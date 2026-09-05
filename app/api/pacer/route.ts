import { NextResponse } from "next/server";
import { requireUser, apiError } from "@/lib/api";
export async function POST() {
 try { await requireUser(); return NextResponse.json({error:"Automatic docket retrieval is not configured. Add docket entries and document links from the case page."},{status:501}); } catch(e) {return apiError(e);}
}
