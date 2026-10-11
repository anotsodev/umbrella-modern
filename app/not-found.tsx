import Link from "next/link";

export default function NotFound() {
  return (
    <html lang="en">
      <body>
        <main style={{ padding: "4rem", fontFamily: "system-ui, sans-serif" }}>
          <h1>404</h1>
          <p>That page does not exist.</p>
          <p>
            <Link href="/en">Go home (en)</Link>
          </p>
        </main>
      </body>
    </html>
  );
}
