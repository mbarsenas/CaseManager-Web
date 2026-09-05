"use client";
export default function ErrorPage({reset}:{reset:()=>void}) { return <div><h1>Unable to load this page</h1><p>Check the database connection and try again.</p><button className="btn" onClick={reset}>Try again</button></div>; }

