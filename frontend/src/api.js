// frontend/src/api.js
const BASE = "http://localhost:3001";

export async function annotate(text) {
  const res = await fetch(`${BASE}/annotate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`Annotate failed: ${res.status} ${msg}`);
  }
  return res.json(); // { concepts: [...] }
}

export async function getGraph() {
  const res = await fetch(`${BASE}/graph`, { method: "GET" });
  if (!res.ok) throw new Error("Graph fetch failed");
  return res.json(); // { nodes, links }
}
