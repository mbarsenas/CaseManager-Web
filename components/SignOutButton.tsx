"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
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
