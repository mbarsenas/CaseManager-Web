import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { SignOutButton } from "@/components/SignOutButton";

export const metadata: Metadata = {
  title: "Case Manager",
  description: "Client and case management for solo/small practices",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="app-shell">
            <nav className="sidebar">
              <div className="sidebar-brand">Case Manager</div>
              <a href="/" className="sidebar-link">Dashboard</a>
              <a href="/clients" className="sidebar-link">Clients</a>
              <a href="/research" className="sidebar-link">Case Law Search</a>
              <div style={{ marginTop: "auto", paddingTop: 24 }}>
                <SignOutButton />
              </div>
            </nav>
            <main className="main-content">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
