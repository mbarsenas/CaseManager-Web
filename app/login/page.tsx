"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { requestJson, errorMessage } from "@/lib/http";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If no account exists yet on this instance, send them to setup instead.
    requestJson<{ needsSetup: boolean }>("/api/setup")
      .then((data) => {
        if (data.needsSetup) router.replace("/setup");
      }).catch(error => setError(errorMessage(error)));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error === "CredentialsSignin") {
      setError("Incorrect email or password.");
      return;
    }
    if (!result?.ok || result.error) throw new Error("Unable to sign in. Please try again.");

    router.push("/");
    router.refresh();
    } catch (error) { setError(errorMessage(error)); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ maxWidth: 360, margin: "80px auto" }}>
      <h1>Sign in</h1>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p role="alert" style={{ color: "var(--danger)", marginBottom: 16 }}>{error}</p>}
        <button type="submit" className="btn" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
