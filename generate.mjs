/**
 * YUDHANIA.AI — Netlify image generation boundary
 *
 * Route: POST /api/generate
 * Secret: OPENAI_API_KEY (Netlify environment variable only)
 *
 * Uses the documented OpenAI Image API:
 * - /v1/images/generations when there are no reference images
 * - /v1/images/edits when reference images are supplied
 */

const OPENAI_URL = "https://api.openai.com/v1";
const MODEL = "gpt-image-1.5";
const MAX_JSON_BYTES = 4_500_000;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function stripDataUrl(dataUrl) {
  const match = /^data:([^;,]+);base64,(.+)$/s.exec(dataUrl || "");
  if (!match) throw new Error("Reference image harus berupa data URL base64.");
  const mime = match[1];
  const base64 = match[2];
  const bytes = Buffer.from(base64, "base64");
  return { mime, bytes };
}

function sizeFor(format) {
  const f = String(format || "").toLowerCase();
  if (f.includes("landscape") || f.includes("16:9")) return "1536x1024";
  if (f.includes("square") || f.includes("1:1")) return "1024x1024";
  // OpenAI's documented portrait size is 1024x1536; this is the closest
  // native portrait output for Story/Status work.
  return "1024x1536";
}

async function openaiJson(path, body) {
  const response = await fetch(`${OPENAI_URL}${path}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let data;
  try { data = JSON.parse(text); }
  catch { data = { error: { message: text || "OpenAI returned an invalid response." } }; }

  if (!response.ok) {
    const message = data?.error?.message || `OpenAI request failed (${response.status}).`;
    throw new Error(message);
  }
  return data;
}

async function openaiEdit({ prompt, negative, size, assets }) {
  const form = new FormData();
  form.append("model", MODEL);
  form.append("prompt", `${prompt}\n\nDynamic negative rules: ${negative || "none"}`);
  form.append("size", size);
  form.append("quality", "high");
  form.append("output_format", "png");
  form.append("input_fidelity", "high");
  form.append("n", "1");

  for (const asset of assets) {
    const { mime, bytes } = stripDataUrl(asset.data);
    const safeMime = mime.startsWith("image/") ? mime : "image/png";
    const ext = safeMime.includes("jpeg") || safeMime.includes("jpg") ? "jpg"
      : safeMime.includes("webp") ? "webp" : "png";
    form.append("image[]", new Blob([bytes], { type: safeMime }), asset.name || `reference.${ext}`);
  }

  const response = await fetch(`${OPENAI_URL}/images/edits`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
  });

  const text = await response.text();
  let data;
  try { data = JSON.parse(text); }
  catch { data = { error: { message: text || "OpenAI returned an invalid response." } }; }

  if (!response.ok) {
    const message = data?.error?.message || `OpenAI edit failed (${response.status}).`;
    throw new Error(message);
  }
  return data;
}

export default async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("", {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed. Use POST." }, 405);
  }

  if (!process.env.OPENAI_API_KEY) {
    return json({
      ok: false,
      error: "OPENAI_API_KEY belum dipasang di Netlify Environment Variables."
    }, 500);
  }

  const raw = await request.text();
  if (raw.length > MAX_JSON_BYTES) {
    return json({
      ok: false,
      error: "Request terlalu besar. Maksimal sekitar 4.5 MB termasuk reference image."
    }, 413);
  }

  let body;
  try { body = JSON.parse(raw); }
  catch {
    return json({ ok: false, error: "Request JSON tidak valid." }, 400);
  }

  const prompt = String(body.prompt || body.brief || "").trim();
  const negative = String(body.negative || "").trim();
  const assets = Array.isArray(body.assets) ? body.assets.slice(0, 3) : [];
  const size = sizeFor(body.format);

  if (!prompt) {
    return json({ ok: false, error: "Prompt generation kosong." }, 400);
  }

  try {
    let result;
    if (assets.length) {
      result = await openaiEdit({ prompt, negative, size, assets });
    } else {
      result = await openaiJson("/images/generations", {
        model: MODEL,
        prompt: `${prompt}\n\nDynamic negative rules: ${negative || "none"}`,
        size,
        quality: "high",
        output_format: "png",
        n: 1,
      });
    }

    const image = result?.data?.[0]?.b64_json;
    if (!image) {
      throw new Error("OpenAI tidak mengembalikan gambar.");
    }

    return json({
      ok: true,
      image: `data:image/png;base64,${image}`,
      model: MODEL,
      usedReferences: assets.length,
      size,
    });
  } catch (error) {
    return json({
      ok: false,
      error: error?.message || "Generation gagal."
    }, 502);
  }
};

export const config = {
  path: "/api/generate",
};
