export async function fetchPharmacySnippet(query: string): Promise<string> {
  const q = encodeURIComponent(query.trim().slice(0, 80));
  if (!q) return "";
  const urls = [
    `https://www.1mg.com/search/all?name=${q}`,
    `https://pharmeasy.in/search/all?name=${q}`,
  ];
  let best = "";
  for (const url of urls) {
    try {
      const c = new AbortController();
      const id = setTimeout(() => c.abort(), 8000);
      const res = await fetch(url, {
        signal: c.signal,
        headers: {
          "User-Agent":
            "SmartMedicineAssistant/1.0 (education; contact site owner)",
          Accept: "text/html,*/*",
        },
      });
      clearTimeout(id);
      if (!res.ok) continue;
      const html = await res.text();
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 4000);
      if (text.length > best.length) best = text;
    } catch {
      /* next url */
    }
  }
  return best;
}
