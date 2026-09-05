import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./auth";
import { InputError } from "./records";
export async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new HttpError(401, "Please sign in to continue.");
  return session.user as { id: string; name?: string; email?: string };
}
export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export function apiError(error: unknown) {
  if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof InputError || error instanceof SyntaxError) return NextResponse.json({ error: error.message }, { status: 400 });
  const code = (error as { code?: string })?.code;
  if (code === "P2025") return NextResponse.json({ error: "Record not found." }, { status: 404 });
  if (code === "P2003") return NextResponse.json({ error: "The linked record no longer exists." }, { status: 400 });
  if (code === "P2002") return NextResponse.json({ error: "This record already exists." }, { status: 409 });
  console.error("Case Manager request failed", { code: code ?? "unknown" });
  return NextResponse.json({ error: "Unable to save or load this record. Please try again." }, { status: 500 });
}

