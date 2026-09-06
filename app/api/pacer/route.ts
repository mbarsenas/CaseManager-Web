import { NextRequest, NextResponse } from "next/server";
import { requireUser, apiError, HttpError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { lookupDocket, RecapError } from "@/lib/recap";
import { recapState, syncRecap } from "@/lib/recap-import";
export const dynamic="force-dynamic";
const token=()=>process.env.COURTLISTENER_API_TOKEN || process.env.RECAP_API_TOKEN || "";
function failure(e:unknown) {
  if(e instanceof RecapError)return NextResponse.json({error:e.message,retryAfter:e.retryAfter},{status:e.status,headers:e.retryAfter?{"Retry-After":String(e.retryAfter)}:undefined});
  return apiError(e);
}
export async function GET(req:NextRequest) {
  try {
    await requireUser();
    const caseId=req.nextUrl.searchParams.get("caseId");
    if(!caseId)throw new HttpError(400,"Case ID is required.");
    const c=await prisma.case.findUnique({where:{id:caseId}});
    if(!c)throw new HttpError(404,"Case not found.");
    const input=req.nextUrl.searchParams.get("docket");
    if(input)return NextResponse.json({docket:await lookupDocket(input,token())});
    return NextResponse.json({...recapState(c),configured:Boolean(token())});
  }catch(e){return failure(e);}
}
export async function POST(req:NextRequest) {
  try {
    await requireUser();const body=await req.json();
    if(!body||typeof body.caseId!=="string"||typeof body.docketId!=="string"||(body.restart!==undefined&&typeof body.restart!=="boolean"))throw new HttpError(400,"A case and docket ID are required.");
    return NextResponse.json(await syncRecap(body.caseId,body.docketId,body.restart===true,token()));
  }catch(e){return failure(e);}
}

