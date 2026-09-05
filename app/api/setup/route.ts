import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { apiError, HttpError } from "@/lib/api";
export const dynamic="force-dynamic";
export async function GET() {
 try { return NextResponse.json({needsSetup:await prisma.user.count()===0}); } catch(e) {return apiError(e);}
}
export async function POST(req:NextRequest) {
 try {
   const body=await req.json();
   if(!body || typeof body.email!=="string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) throw new HttpError(400,"Enter a valid email.");
   if(typeof body.password!=="string" || body.password.length<8 || Buffer.byteLength(body.password)>72) throw new HttpError(400,"Password must be at least 8 characters and at most 72 bytes.");
   if(body.name!=null && (typeof body.name!=="string" || body.name.length>200)) throw new HttpError(400,"Name must be text up to 200 characters.");
   const hashedPassword=await bcrypt.hash(body.password,12);
   const user=await prisma.$transaction(async tx=>{
     // Serialize first-account creation across concurrent requests and app processes.
     await tx.$executeRaw`SELECT pg_advisory_xact_lock(81726409)`;
     if(await tx.user.count()) throw new HttpError(403,"Setup has already been completed.");
     return tx.user.create({data:{email:body.email.trim().toLowerCase(),hashedPassword,name:body.name?.trim()||null}});
   });
   return NextResponse.json({success:true,id:user.id},{status:201});
 } catch(e) {return apiError(e);}
}

