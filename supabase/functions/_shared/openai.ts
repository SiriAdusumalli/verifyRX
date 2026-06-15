const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export async function openAiJson(args: {
  system: string;
  user: string;
  imageBase64?: string | null;
  imageMime?: string;
}): Promise<Record<string, unknown>> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("OPENAI_API_KEY not configured");

  const model = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";

  type ContentPart =
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } };

  const userContent: ContentPart[] = [{ type: "text", text: args.user }];
  if (args.imageBase64) {
    const mime = args.imageMime || "image/jpeg";
    const clean = args.imageBase64.replace(/^data:image\/\w+;base64,/, "");
    userContent.push({
      type: "image_url",
      image_url: { url: `data:${mime};base64,${clean}` },
    });
  }

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: args.system },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${err.slice(0, 400)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content || "{}";
  return JSON.parse(text) as Record<string, unknown>;
}

export async function openAiText(system: string, user: string): Promise<string> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("OPENAI_API_KEY not configured");
  const model = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";
  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${err.slice(0, 400)}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content || "";
}
