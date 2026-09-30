import { McpServer, createMcpHandler } from "@modelcontextprotocol/server";
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";

const RESOURCE_URI = "ui://yudhania/design-workspace.html";

const ENGINE_INSTRUCTIONS = `
YUDHANIA.AI is an ART DIRECTION ENGINE. Different designs, same studio DNA.
Priority: client facts > brand/client needs > communication goal > category DNA > style DNA > format DNA > decoration.
Never invent material client facts: price, date, time, address, location, phone, discount, claims, product name, CTA, specs.
If material factual information is missing, ask at most 3 numbered questions and stop.
Use one primary focal point, hierarchy over complexity, intentional negative space, product/brand integrity, physical realism, mobile-first for mobile formats.
Category DNA guides direction but is not a visual formula. Avoid generic AI decoration and effects without a conceptual, product, environment, brand, or communication reason.
Decoration source priority: product-derived > environment-derived > brand-derived > concept-derived > generic graphic.
Meaningful energy comes first from composition, scale, perspective, crop, typography hierarchy, color contrast, lighting, material detail, product proximity, environment, and rhythm.
Typography must come from brand + category + objective + style + format + audience + hierarchy. Avoid generic AI typography.
Dynamic negative prompts must be specific to the actual design; do not use one giant generic negative list.
Revision is surgical: preserve approved baseline and change only what the user requested. No creative drift.
`;

const CATEGORY_DNA = {
  "F&B": "appetizing, sensory, fresh, rich, commercial; realistic food texture; product-dominant close/medium commercial framing; avoid plastic food, random garnish, splash, smoke, sparkle.",
  "Technology": "precise, intelligent, modern, sleek, innovative; clean geometry; precise studio lighting; glass/aluminum/matte plastic/screens; avoid random holograms, circuit clichés, excessive neon.",
  "Retail / Product": "commercial, attractive, clear, product-focused, accessible; immediate product recognition; avoid excessive props and floating objects.",
  "Education": "accessible, structured, engaging, intelligent, friendly; clear hierarchy; avoid childish clutter.",
  "Beauty & Skincare": "refined, elegant, sensory, clean, aspirational; soft diffused light; tactile product materials; avoid automatic pink, flowers, pearls, glitter.",
  "Fashion": "editorial, stylish, expressive, aspirational; intentional crop; realistic fabric behavior; avoid stiff poses and excessive props.",
  "Automotive": "dynamic, powerful, precise, performance-oriented; strong perspective; paint/metal/glass/rubber/carbon materials; avoid default smoke, wet road, fire, sparks, light streaks.",
  "Fitness & Sport": "energy, strength, movement, motivation, performance; dynamic perspective; believable anatomy and motion; avoid random smoke/lightning.",
  "Property": "spacious, architectural, aspirational, comfortable, premium; spatial perspective; natural daylight; avoid impossible perspective and fake dramatic skies.",
  "Corporate": "credible, structured, clear, professional; information-first hierarchy; avoid generic corporate decoration.",
  "Other": "derive visual language from the actual product, audience, objective, references, and environment; do not default to category clichés."
};

const STYLE_DNA = {
  "Fun & Colorful": "playful energy, clear hierarchy, controlled color contrast",
  "Premium Commercial": "commercial polish, restrained richness, tactile realism",
  "Luxury Minimal": "high restraint, precise spacing, material quality, strong negative space",
  "Clean & Modern": "clean geometry, disciplined spacing, contemporary clarity",
  "Bold & Dynamic": "strong scale, decisive crop, visual rhythm, controlled intensity",
  "Elegant & Refined": "refined proportion, subtle contrast, deliberate detail",
  "Futuristic": "forward-looking material and geometry, but no automatic neon/cyberpunk",
  "Cinematic": "directional light, controlled contrast, environmental depth, believable atmosphere",
  "Editorial": "intentional crop, hierarchy, typography and image relationship",
  "Natural & Organic": "authentic materials, natural light, tactile irregularity",
  "Playful": "friendly visual rhythm and character without clutter",
  "Minimalist": "few elements, high negative space, strict hierarchy",
  "Street / Urban": "authentic urban context, graphic attitude, grounded materials",
  "Corporate Professional": "credible structure, clarity, restrained visual language",
  "Retro / Nostalgic": "era-appropriate visual language without generic imitation",
  "Luxury Lifestyle": "aspirational context, tactile materials, restrained sophistication",
  "Hyperreal Product": "product fidelity, realistic materials, precise studio or contextual light",
  "Illustrative": "intentional illustration language with controlled hierarchy"
};

const FORMAT_DNA = {
  "Instagram Story / WhatsApp Status 9:16": "vertical, mobile-first, safe zones, concise message, readable at first glance",
  "Instagram Feed 4:5": "mobile-first, strong first-glance hierarchy, thumbnail recognition",
  "Square 1:1": "balanced focal hierarchy and compact composition",
  "Landscape 16:9": "horizontal visual flow and wider environmental composition",
  "Poster 2:3": "strong typographic composition and clear focal point",
  "Flyer A-series / 4:5": "information-first, clear sections, no clutter",
  "Marketplace Product": "product-first, clean background, immediate recognition",
  "YouTube Thumbnail 16:9": "instant recognition, bold focal subject, minimal essential text"
};

const OBJECTIVES = [
  "Product Promotion", "Product Launch", "Discount / Sale", "Grand Opening", "Brand Awareness",
  "Event Promotion", "Announcement", "Educational", "Informational", "Seasonal Campaign",
  "Menu / Product Showcase", "Testimonial", "Corporate Communication", "Recruitment", "Personal Branding"
];

const STYLES = Object.keys(STYLE_DNA);
const CATEGORIES = Object.keys(CATEGORY_DNA);
const FORMATS = Object.keys(FORMAT_DNA);

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function compact(value, fallback = "Auto") {
  const v = clean(value);
  return v || fallback;
}

function buildSpec(args) {
  const category = compact(args.category, "Other");
  const style = compact(args.style, "Clean & Modern");
  const format = compact(args.format, "Instagram Story / WhatsApp Status 9:16");
  const objective = compact(args.objective, "Product Promotion");
  const intensity = compact(args.visualIntensity, "Auto");
  const decoration = compact(args.decoration, "Auto");
  const hero = compact(args.hero, args.product || "Primary subject from client brief");
  const brand = clean(args.brand);
  const product = clean(args.product);
  const mainMessage = clean(args.mainMessage);
  const cta = clean(args.cta);
  const rawBrief = clean(args.brief);
  const referenceNotes = clean(args.referenceNotes);

  const missing = [];
  if (!rawBrief && !product && !mainMessage) missing.push("brief/product or main message");
  if (!product && !hero) missing.push("product/subject");
  if (!mainMessage && !rawBrief) missing.push("main message");

  const categoryDna = CATEGORY_DNA[category] || CATEGORY_DNA.Other;
  const styleDna = STYLE_DNA[style] || STYLE_DNA["Clean & Modern"];
  const formatDna = FORMAT_DNA[format] || FORMAT_DNA["Instagram Story / WhatsApp Status 9:16"];

  const concept = objective === "Grand Opening"
    ? "A clear opening moment built around the real business/brand identity and a single invitation to visit or discover."
    : objective === "Product Launch"
      ? "A launch composition that makes the new product unmistakably primary while preserving brand identity."
      : objective === "Discount / Sale"
        ? "A commercial value-first composition where the offer is legible without overpowering the product or brand."
        : "A purpose-led commercial composition where the primary message and hero subject are immediately understood.";

  const camera = category === "Technology"
    ? "controlled medium product/environmental framing, precise perspective, moderate depth of field"
    : category === "F&B"
      ? "close/medium commercial product framing, eye-level or slightly elevated, shallow-to-moderate depth of field"
      : category === "Automotive"
        ? "medium/wide three-quarter or low-angle hero framing with controlled perspective"
        : "choose framing, angle, perspective, lens character, depth of field, crop, and subject distance from the actual brief and format; do not default to centered framing";

  const lighting = category === "F&B"
    ? "bright commercial food lighting with believable highlights and texture"
    : category === "Technology"
      ? "precise studio lighting with controlled reflections and material separation"
      : category === "Property"
        ? "natural daylight with believable spatial falloff"
        : "lighting selected to support concept and material realism, not decorative effects";

  const typography = format.includes("Story") || format.includes("Status")
    ? "mobile-first display hierarchy, concise text blocks, strong safe-zone discipline, characterful typography derived from brand/category/objective rather than a cliché"
    : "typography derived from brand/category/objective/style/format/audience with deliberate hierarchy, scale, spacing, and letterform personality";

  const negatives = [
    "invented client facts, invented copy, altered brand identity, altered product proportions",
    "misspelled or extra text, duplicate text, warped typography, unreadable letters",
    "generic AI gradient, random dots/circles, meaningless particles, generic splash, purposeless floating objects",
    "unjustified glow, smoke, light streaks, lens flare, holograms, excessive neon, excessive bokeh",
    "generic category cliché, clutter, weak focal hierarchy, accidental cropping"
  ];

  if (category === "F&B") negatives.push("plastic-looking food, unrealistic texture, excessive garnish, artificial shine");
  if (category === "Automotive") negatives.push("distorted vehicle, incorrect wheel geometry, malformed body panels, impossible reflections");
  if (category === "Technology") negatives.push("random holograms, circuit-board cliché, floating UI without purpose, excessive neon");
  if (category === "Fashion") negatives.push("distorted garments, malformed hands, stiff pose, unrealistic fabric");
  if (category === "Beauty & Skincare") negatives.push("airbrushed skin, random flowers, pearls, glitter, plastic product materials");

  return {
    brand: brand || null,
    product: product || null,
    category,
    objective,
    style,
    format,
    mainMessage: mainMessage || null,
    cta: cta || null,
    hero,
    visualIntensity: intensity,
    decoration,
    referenceNotes: referenceNotes || null,
    rawBrief: rawBrief || null,
    concept,
    categoryDna,
    styleDna,
    formatDna,
    composition: "one primary focal point; clear hierarchy; intentional negative space; controlled secondary support; preserve safe zones and immediate readability",
    camera,
    lighting,
    material: "physically believable materials, reflections, shadows, scale, gravity, and surface interaction appropriate to the actual subject",
    color: "derived from brand + product + campaign + category + style + concept; avoid arbitrary AI palettes",
    typography,
    brandProtection: "preserve logo, packaging, product shape, product color, brand name, proportions, and identifying details from client references",
    masterRules: ENGINE_INSTRUCTIONS.trim(),
    negativePrompt: negatives.join("; ")
  };
}

function promptFromSpec(spec) {
  return [
    "QUALITY: commercially usable, physically believable, brand-aware, coherent, professionally art-directed.",
    `CREATIVE CONCEPT: ${spec.concept}`,
    `SUBJECT/PRODUCT: ${spec.hero}${spec.product ? `; product: ${spec.product}` : ""}`,
    `CATEGORY: ${spec.category} — ${spec.categoryDna}`,
    `STYLE: ${spec.style} — ${spec.styleDna}`,
    `OBJECTIVE: ${spec.objective}`,
    `COMPOSITION: ${spec.composition}`,
    `FORMAT: ${spec.format} — ${spec.formatDna}`,
    `CAMERA: ${spec.camera}`,
    `LIGHTING: ${spec.lighting}`,
    `MATERIAL: ${spec.material}`,
    `COLOR: ${spec.color}`,
    `TYPOGRAPHY/COPY: main message exact: ${spec.mainMessage || "do not invent copy"}; CTA exact: ${spec.cta || "do not invent CTA"}; ${spec.typography}`,
    `BRAND: ${spec.brand || "preserve any supplied brand identity exactly"}; ${spec.brandProtection}`,
    `MASTER RULES: one focal point, hierarchy over complexity, intentional negative space, product integrity, physical realism, no invented client facts, reference assets are identity sources.`,
    `DYNAMIC NEGATIVE RULES: ${spec.negativePrompt}`
  ].join("\n");
}

function createServer() {
  const server = new McpServer({
    name: "YUDHANIA.AI Design Studio",
    version: "1.0.0"
  });

  registerAppTool(server, "open_yudhania", {
    title: "Open YUDHANIA.AI Design Studio",
    description: "Open the YUDHANIA.AI fullscreen design workspace for brief parsing, art direction, generation requests, and controlled revisions.",
    inputSchema: z.object({
      brief: z.string().optional().describe("Raw client brief, if already available."),
      objective: z.string().optional().describe("Communication objective."),
      category: z.string().optional().describe("Design category."),
      format: z.string().optional().describe("Output format."),
      style: z.string().optional().describe("Visual style."),
    }),
    annotations: { readOnlyHint: true },
    _meta: { ui: { resourceUri: RESOURCE_URI } },
  }, async (args) => {
    const spec = buildSpec(args);
    return {
      content: [{ type: "text", text: "YUDHANIA.AI Design Studio workspace is ready." }],
      structuredContent: { mode: "workspace", spec, options: { categories: CATEGORIES, styles: STYLES, formats: FORMATS, objectives: OBJECTIVES } }
    };
  });

  registerAppTool(server, "prepare_design", {
    title: "Prepare YUDHANIA Design Direction",
    description: "Compile a client brief into YUDHANIA.AI art direction and a final generation prompt. Never invent missing client facts.",
    inputSchema: z.object({
      brief: z.string().optional(), brand: z.string().optional(), product: z.string().optional(),
      category: z.string().optional(), objective: z.string().optional(), style: z.string().optional(),
      format: z.string().optional(), mainMessage: z.string().optional(), cta: z.string().optional(),
      hero: z.string().optional(), visualIntensity: z.string().optional(), decoration: z.string().optional(),
      referenceNotes: z.string().optional()
    }),
    outputSchema: z.object({
      spec: z.record(z.string(), z.any()),
      finalGenerationPrompt: z.string(),
      negativePrompt: z.string(),
      needsClarification: z.array(z.string())
    }),
    _meta: { ui: { resourceUri: RESOURCE_URI, visibility: ["app"] } },
  }, async (args) => {
    const spec = buildSpec(args);
    const needsClarification = [];
    if (!spec.product && !spec.hero) needsClarification.push("Apa produk/subject utamanya?");
    if (!spec.mainMessage && !spec.rawBrief) needsClarification.push("Apa pesan utama/copy wajibnya?");
    if (needsClarification.length > 3) needsClarification.length = 3;
    const finalGenerationPrompt = promptFromSpec(spec);
    return {
      content: [{ type: "text", text: finalGenerationPrompt }],
      structuredContent: { spec, finalGenerationPrompt, negativePrompt: spec.negativePrompt, needsClarification }
    };
  });

  registerAppTool(server, "prepare_revision", {
    title: "Prepare Controlled Revision",
    description: "Prepare a surgical revision from an approved baseline. Preserve successful design DNA and change only what the user requested.",
    inputSchema: z.object({
      baselineSummary: z.string().min(1),
      revisionRequest: z.string().min(1),
      lockedDecisions: z.string().optional(),
      category: z.string().optional(),
      format: z.string().optional()
    }),
    outputSchema: z.object({
      revisionInstruction: z.string(),
      locked: z.string(),
      dynamicNegative: z.string()
    }),
    _meta: { ui: { resourceUri: RESOURCE_URI, visibility: ["app"] } },
  }, async ({ baselineSummary, revisionRequest, lockedDecisions, category, format }) => {
    const revisionInstruction = [
      "CONTROLLED REVISION — use the existing generated design as the baseline.",
      `BASELINE: ${baselineSummary}`,
      `USER REQUEST: ${revisionRequest}`,
      `LOCKED DECISIONS: ${lockedDecisions || "Preserve all successful decisions not explicitly targeted."}`,
      `CATEGORY: ${category || "preserve existing category"}`,
      `FORMAT: ${format || "preserve existing format"}`,
      "Change only the requested variable(s). Preserve client facts, brand identity, product identity, objective, format, and successful visual DNA.",
      "Do not redesign unrelated areas. Do not introduce new generic decoration. The result should feel like the same design with the disliked part corrected."
    ].join("\n");
    const dynamicNegative = "creative drift, unrelated redesign, altered product/brand identity, invented copy, new generic decoration, unnecessary effects, changed format, changed approved composition outside the requested revision";
    return {
      content: [{ type: "text", text: revisionInstruction }],
      structuredContent: { revisionInstruction, locked: lockedDecisions || "all non-targeted decisions", dynamicNegative }
    };
  });

  registerAppResource(server, "YUDHANIA.AI Design Workspace", RESOURCE_URI, {
    description: "Fullscreen YUDHANIA.AI design workspace for staff.",
    _meta: {
      ui: {
        csp: {
          connectDomains: [],
          resourceDomains: []
        }
      }
    }
  }, async () => ({
    contents: [{
      uri: RESOURCE_URI,
      mimeType: RESOURCE_MIME_TYPE,
      text: UI_HTML,
      _meta: {
        ui: {
          csp: { connectDomains: [], resourceDomains: [] }
        }
      }
    }]
  }));

  return server;
}

const handler = createMcpHandler(createServer);

export default async function(request) {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, Mcp-Session-Id, Last-Event-ID"
      }
    });
  }

  if (url.pathname === "/") {
    return new Response(
      JSON.stringify({
        ok: true,
        service: "YUDHANIA.AI Design Studio MCP",
        endpoint: "/mcp"
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }

  const response = await handler.fetch(request);

  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Accept, Authorization, Mcp-Session-Id, Last-Event-ID"
  );

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

const UI_HTML = String.raw`<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>YUDHANIA.AI Design Studio</title>
<style>
:root{color-scheme:light;--bg:#f6f3ee;--card:#fffdfa;--ink:#171513;--muted:#77716b;--line:#e7e0d8;--accent:#1b1815;--soft:#f0ebe4;--good:#2f6b4f;--warn:#8b5d27}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif}button,input,textarea,select{font:inherit}button{cursor:pointer}.shell{min-height:100vh;padding:24px;max-width:1180px;margin:auto}.top{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:20px}.eyebrow{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:700}.title{font-size:32px;letter-spacing:-.04em;font-weight:800;margin:5px 0}.sub{color:var(--muted);max-width:700px;font-size:14px;line-height:1.5}.pill{background:#ebe5dc;border:1px solid var(--line);padding:8px 10px;border-radius:999px;font-size:11px;font-weight:700}.grid{display:grid;grid-template-columns:1.15fr .85fr;gap:18px}.card{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:18px;box-shadow:0 8px 30px rgba(35,25,15,.04)}.card h2{font-size:16px;margin:0 0 4px}.hint{font-size:12px;color:var(--muted);line-height:1.45;margin-bottom:14px}.fields{display:grid;grid-template-columns:1fr 1fr;gap:10px}.full{grid-column:1/-1}.field label{display:block;font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);margin:0 0 6px}.field input,.field textarea,.field select{width:100%;border:1px solid var(--line);background:#fff;border-radius:12px;padding:11px 12px;outline:none;color:var(--ink)}.field textarea{min-height:118px;resize:vertical}.field input:focus,.field textarea:focus,.field select:focus{border-color:#b8aea4;box-shadow:0 0 0 3px #eee8e1}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}.btn{border:1px solid var(--line);background:#fff;padding:11px 14px;border-radius:12px;font-weight:800;font-size:13px}.btn.primary{background:var(--accent);color:#fff;border-color:var(--accent)}.btn.secondary{background:var(--soft)}.btn:disabled{opacity:.45;cursor:default}.stage{display:flex;flex-direction:column;gap:12px}.status{border:1px dashed var(--line);background:#faf7f2;border-radius:14px;padding:13px;font-size:12px;color:var(--muted);line-height:1.5}.status strong{color:var(--ink)}.spec{display:grid;gap:8px}.row{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid #eee8e1;font-size:12px}.row:last-child{border-bottom:0}.row span:first-child{color:var(--muted)}.row span:last-child{text-align:right;font-weight:700;max-width:65%}.prompt{white-space:pre-wrap;background:#181613;color:#f7f1e9;border-radius:14px;padding:13px;font:11px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;max-height:320px;overflow:auto}.drop{border:1px dashed #cfc5ba;background:#fbf8f4;border-radius:14px;padding:15px}.drop input{width:100%;font-size:12px}.refs{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.ref{background:#efe9e1;border:1px solid var(--line);border-radius:10px;padding:7px 9px;font-size:11px}.lock{background:#f3eee7;border-left:3px solid #1b1815;padding:11px 12px;border-radius:10px;font-size:12px;line-height:1.45}.small{font-size:11px;color:var(--muted)}@media(max-width:850px){.grid{grid-template-columns:1fr}.fields{grid-template-columns:1fr}.shell{padding:16px}.title{font-size:26px}.top{flex-direction:column}.row{align-items:flex-start}.row span:last-child{max-width:58%}}
</style>
</head>
<body>
<div class="shell">
  <div class="top">
    <div><div class="eyebrow">YUDHANIA.AI · DESIGN STUDIO</div><div class="title">Staff Design Workspace</div><div class="sub">Brief → Art Direction → Generation Request → Controlled Revision. AI provides execution; art direction provides the identity.</div></div>
    <div class="pill">MCP APP · V1</div>
  </div>
  <div class="grid">
    <section class="card">
      <h2>01 · Brief</h2><div class="hint">Masukkan fakta klien apa adanya. Jangan menambah harga, tanggal, CTA, klaim, atau spesifikasi yang tidak diberikan.</div>
      <div class="fields">
        <div class="field"><label>Brand</label><input id="brand" placeholder="Nama brand"></div>
        <div class="field"><label>Product / Service</label><input id="product" placeholder="Produk / layanan"></div>
        <div class="field full"><label>Raw Client Brief</label><textarea id="brief" placeholder="Tempel brief klien lengkap di sini..."></textarea></div>
        <div class="field"><label>Main Message</label><input id="message" placeholder="Copy utama, jika ada"></div>
        <div class="field"><label>CTA</label><input id="cta" placeholder="CTA, jika ada"></div>
        <div class="field"><label>Category</label><select id="category"></select></div>
        <div class="field"><label>Objective</label><select id="objective"></select></div>
        <div class="field"><label>Style</label><select id="style"></select></div>
        <div class="field"><label>Format</label><select id="format"></select></div>
        <div class="field"><label>Visual Intensity</label><select id="intensity"><option>Auto</option><option>V1 — Restrained</option><option>V2 — Balanced</option><option>V3 — Energetic</option><option>V4 — High Impact</option></select></div>
        <div class="field"><label>Decoration</label><select id="decoration"><option>Auto</option><option>D0 — Pure</option><option>D1 — Subtle</option><option>D2 — Controlled</option><option>D3 — Expressive</option><option>D4 — Conceptual</option></select></div>
        <div class="field full"><label>Reference Notes</label><textarea id="reference" style="min-height:76px" placeholder="Apa yang harus dipertahankan dari asset/reference klien? Jangan menyalin desain referensi secara mentah."></textarea></div>
      </div>
      <div class="drop"><strong style="font-size:12px">Reference / Product Asset</strong><div class="small">Upload di sini untuk diteruskan ke konteks ChatGPT saat tombol referensi digunakan.</div><input id="file" type="file" accept="image/*,.pdf,.doc,.docx,.png,.jpg,.jpeg" multiple></div>
      <div class="actions"><button class="btn primary" id="analyze">Analyze & Art Direct</button><button class="btn secondary" id="generate" disabled>Generate Design</button></div>
      <div class="actions"><button class="btn" id="sendRef">Send Reference to Chat</button><button class="btn" id="fullscreen">Fullscreen</button></div>
    </section>
    <section class="stage">
      <div class="card"><h2>02 · Art Direction</h2><div class="hint">Keputusan desain dikunci dari fakta + kebutuhan brand + objective + category + style + format.</div><div id="spec" class="spec"><div class="status"><strong>Belum dianalisis.</strong><br>Isi brief lalu tekan Analyze & Art Direct.</div></div></div>
      <div class="card"><h2>03 · Generation Prompt</h2><div id="prompt" class="prompt">Belum ada prompt.</div><div class="actions"><button class="btn" id="copyPrompt" disabled>Copy Prompt</button></div></div>
      <div class="card"><h2>04 · Revision Lock</h2><div class="lock">Gunakan desain hasil sebelumnya sebagai baseline. Revisi hanya bagian yang diminta; keputusan yang sudah disetujui dianggap LOCKED.</div><div class="field" style="margin-top:10px"><label>Revision Request</label><textarea id="revision" style="min-height:90px" placeholder="Contoh: sudah bagus, tapi headline terlalu besar. Kecilkan headline saja, yang lain tetap."></textarea></div><div class="actions"><button class="btn" id="revise" disabled>Prepare Controlled Revision</button></div></div>
      <div id="status" class="status">Status: siap.</div>
    </section>
  </div>
</div>
<script>
(function(){
  const $=id=>document.getElementById(id);
  const state={spec:null,prompt:"",assets:[]};
  const reqMap=new Map(); let seq=1; let initialized=false;
  function rpc(method,params){return new Promise((resolve,reject)=>{const id=seq++;reqMap.set(id,{resolve,reject});parent.postMessage({jsonrpc:"2.0",id,method,params},"*")})}
  addEventListener("message",e=>{const d=e.data;if(!d||typeof d!=="object")return;if(d.id&&reqMap.has(d.id)){const x=reqMap.get(d.id);reqMap.delete(d.id);d.error?x.reject(new Error(d.error.message||"Host error")):x.resolve(d.result)} if(d.method==="ui/notifications/tool-result"&&d.params){const r=d.params.result||d.params;handleToolResult(r)}});
  async function init(){try{await rpc("ui/initialize",{appInfo:{name:"YUDHANIA.AI Design Workspace",version:"1.0.0"},appCapabilities:{},protocolVersion:"2026-01-26"});postMessage({jsonrpc:"2.0",method:"ui/notifications/initialized",params:{}},"*");initialized=true;setStatus("Terhubung ke ChatGPT.");}catch(e){setStatus("Gagal menginisialisasi app: "+e.message)}}
  async function callTool(name,args){if(!initialized)await init();setStatus("Memproses "+name+"…");return rpc("tools/call",{name,arguments:args})}
  function handleToolResult(result){const sc=result.structuredContent||result.structured_content;if(sc?.spec){state.spec=sc.spec;state.prompt=sc.finalGenerationPrompt||state.prompt;renderSpec();renderPrompt();$("generate").disabled=false;$("revise").disabled=false;setStatus("Art direction siap. Review keputusan sebelum Generate.")}}
  function options(id,arr,placeholder){const el=$(id);el.innerHTML="";if(placeholder){const o=document.createElement("option");o.value="";o.textContent=placeholder;el.appendChild(o)}arr.forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v;el.appendChild(o)})}
  options("category",["F&B","Technology","Retail / Product","Education","Beauty & Skincare","Fashion","Automotive","Fitness & Sport","Property","Corporate","Other"],"Auto");
  options("objective",["Product Promotion","Product Launch","Discount / Sale","Grand Opening","Brand Awareness","Event Promotion","Announcement","Educational","Informational","Seasonal Campaign","Menu / Product Showcase","Testimonial","Corporate Communication","Recruitment","Personal Branding"],"Auto");
  options("style",["Fun & Colorful","Premium Commercial","Luxury Minimal","Clean & Modern","Bold & Dynamic","Elegant & Refined","Futuristic","Cinematic","Editorial","Natural & Organic","Playful","Minimalist","Street / Urban","Corporate Professional","Retro / Nostalgic","Luxury Lifestyle","Hyperreal Product","Illustrative"],"Auto");
  options("format",["Instagram Story / WhatsApp Status 9:16","Instagram Feed 4:5","Square 1:1","Landscape 16:9","Poster 2:3","Flyer A-series / 4:5","Marketplace Product","YouTube Thumbnail 16:9"],"Auto");
  function args(){return{brief:$("brief").value,brand:$("brand").value,product:$("product").value,category:$("category").value,objective:$("objective").value,style:$("style").value,format:$("format").value,mainMessage:$("message").value,cta:$("cta").value,hero:$("product").value,visualIntensity:$("intensity").value,decoration:$("decoration").value,referenceNotes:$("reference").value}}
  function renderSpec(){const s=state.spec;const rows=[['Brand',s.brand||'—'],['Product / Hero',s.product||s.hero||'—'],['Category',s.category],['Objective',s.objective],['Style',s.style],['Format',s.format],['Visual Intensity',s.visualIntensity],['Decoration',s.decoration],['Concept',s.concept],['Composition',s.composition],['Camera',s.camera],['Lighting',s.lighting],['Material',s.material],['Typography',s.typography]];$("spec").innerHTML=rows.map(r=>'<div class="row"><span>'+esc(r[0])+'</span><span>'+esc(r[1])+'</span></div>').join("")}
  function renderPrompt(){$("prompt").textContent=state.prompt||"Belum ada prompt.";$('copyPrompt').disabled=!state.prompt}
  function setStatus(x){$("status").innerHTML="<strong>Status:</strong> "+esc(x)}
  function esc(x){return String(x??"").replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\\':'&quot;','"':'&quot;'}[m]))}
  $("analyze").onclick=async()=>{try{const r=await callTool("prepare_design",args());handleToolResult(r);const sc=r.structuredContent||r.structured_content;if(sc?.needsClarification?.length){setStatus("Info material belum lengkap: "+sc.needsClarification.join(" | "))}else{setStatus("Art direction siap. Tekan Generate Design untuk meminta ChatGPT membuat gambar nyata.")}}catch(e){setStatus("Analyze gagal: "+e.message)}};
  $("generate").onclick=async()=>{if(!state.spec)return;try{const context={type:"text",text:"YUDHANIA.AI DESIGN SPEC\n\n"+state.prompt};await rpc("ui/update-model-context",{content:[context],structuredContent:{yudhaniaSpec:state.spec}});await rpc("ui/message",{role:"user",content:[{type:"text",text:"Generate the actual design image now using the YUDHANIA.AI design specification in context. Use any attached client reference assets as primary identity references. Do not return only a prompt. Preserve exact client facts and copy. If material factual information is missing, ask up to 3 numbered questions instead of inventing it."}]});setStatus("Generation request dikirim ke ChatGPT. Tunggu hasil gambar di chat.")}catch(e){setStatus("Generation request gagal: "+e.message)}};
  $("revise").onclick=async()=>{if(!state.spec)return;const rev=$("revision").value.trim();if(!rev){setStatus("Isi revision request terlebih dahulu.");return}try{const r=await callTool("prepare_revision",{baselineSummary:state.prompt,revisionRequest:rev,lockedDecisions:"Semua keputusan yang tidak disebut dalam revision request tetap LOCKED.",category:state.spec.category,format:state.spec.format});const sc=r.structuredContent||r.structured_content;await rpc("ui/update-model-context",{content:[{type:"text",text:(sc?.revisionInstruction||"")+("\nDYNAMIC NEGATIVE: "+(sc?.dynamicNegative||""))}],structuredContent:{revisionLock:sc}});await rpc("ui/message",{role:"user",content:[{type:"text",text:"Revise the existing design image according to the controlled revision instruction in context. Keep the approved baseline and change only the requested part. Do not redesign unrelated areas."}]});setStatus("Revision request dikirim ke ChatGPT.")}catch(e){setStatus("Revision gagal: "+e.message)}};
  $("sendRef").onclick=async()=>{const files=[...$("file").files];if(!files.length){setStatus("Pilih minimal satu asset reference terlebih dahulu.");return}try{for(const f of files.slice(0,3)){if(f.type.startsWith("image/")){const data=await fileData(f);await rpc("ui/message",{role:"user",content:[{type:"text",text:"Client reference asset: "+f.name},{type:"image",data:data.split(",")[1],mimeType:f.type}]});}else{await rpc("ui/message",{role:"user",content:[{type:"text",text:"Client reference file selected: "+f.name+". Use the file if available in the conversation context."}]})}}setStatus("Reference dikirim ke konteks chat. Maksimal 3 asset per aksi.")}catch(e){setStatus("Reference gagal dikirim: "+e.message)}};
  function fileData(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)})}
  $("copyPrompt").onclick=async()=>{try{await navigator.clipboard.writeText(state.prompt);setStatus("Prompt disalin.")}catch(e){setStatus("Clipboard tidak tersedia di host.")}};
  $("fullscreen").onclick=async()=>{try{await rpc("ui/request-display-mode",{mode:"fullscreen"})}catch(e){setStatus("Fullscreen tidak tersedia: "+e.message)}};
  init();
})();
</script>
</body></html>`;
