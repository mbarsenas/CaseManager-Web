import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
export async function middleware(req: NextRequest) {
  const path=req.nextUrl.pathname;
  if (path.startsWith("/api/auth/")) return NextResponse.next();
  if (!["GET","HEAD","OPTIONS"].includes(req.method)) {
    const origin=req.headers.get("origin");
    if (origin && origin !== req.nextUrl.origin && origin !== process.env.NEXTAUTH_URL) return NextResponse.json({error:"Cross-origin request rejected."},{status:403});
  }
  if (["/login","/setup","/api/setup"].includes(path)) return NextResponse.next();
  const token=await getToken({req,secret:process.env.NEXTAUTH_SECRET});
  if(!token) {
    if(path.startsWith("/api/")) return NextResponse.json({error:"Please sign in to continue."},{status:401});
    return NextResponse.redirect(new URL("/login",req.url));
  }
  return NextResponse.next();
}
export const config={matcher:["/((?!_next/static|_next/image|favicon.ico).*)"]};

