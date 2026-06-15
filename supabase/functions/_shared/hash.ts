export async function shortHash(input: string): Promise<string> {
  const data = new TextEncoder().encode(input.slice(0, 8000));
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}
