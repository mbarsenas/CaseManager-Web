"use client";

import { signOut, useSession } from "next-auth/react";

export function SignOutButton() {
  const { status } = useSession();
  if (status !== "authenticated") return null;
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="sidebar-link"
      style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", width: "100%" }}
    >
      Sign out
    </button>
  );
}
