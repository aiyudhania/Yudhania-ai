import { McpServer, createMcpHandler } from "@modelcontextprotocol/server";
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";

const RESOURCE_URI = "ui://yudhania/design-workspace.html";

const ENGINE_INSTRUCTIONS = `
YUDHANIA.AI is an ART DIRECTION ENGINE.
Different designs, same studio DNA.

Priority:
client facts > brand/client needs > communication goal > category DNA > style DNA > format DNA > decoration.

Never invent material client facts:
price, date, time, address, location, phone, discount, claims, product name, CTA, specifications.

Use one primary focal point, hierarchy over complexity, intentional negative space,
product/brand integrity, physical realism, and mobile-first composition.

Avoid generic AI decoration and effects without a conceptual, product, environment,
brand, or communication reason.

Decoration priority:
product-derived > environment-derived > brand-derived > concept-derived > generic graphic.

Revision is surgical:
preserve approved baseline and change only what the user requested.
`;

const CATEGORY_DNA = {
  "F&B":
    "appetizing, sensory, fresh, rich, commercial; realistic food texture; product-dominant framing",
  "Technology":
    "precise, intelligent, modern, sleek, innovative; clean geometry; precise studio lighting",
  "Retail / Product":
    "commercial, attractive, clear, product-focused, accessible; immediate product recognition",
  "Education":
    "accessible, structured, engaging, intelligent, friendly; clear hierarchy",
  "Beauty & Skincare":
    "refined, elegant, sensory, clean, aspirational; soft diffused lighting; tactile materials",
  "Fashion":
    "editorial, stylish, expressive, aspirational; intentional crop; realistic fabric behavior",
  "Automotive":
    "dynamic, powerful, precise, performance-oriented; strong perspective",
  "Fitness & Sport":
    "energetic, strong, movement-oriented, performance-focused; believable anatomy",
  "Property":
    "spacious, architectural, aspirational, comfortable, premium; spatial perspective",
  "Corporate":
    "credible, structured, clear, professional; information-first hierarchy",
  "Other":
    "derive visual language from the actual product, audience, objective, references, and environment"
};

const STYLE_DNA = {
  "Fun & Colorful":
    "playful energy, clear hierarchy, controlled color contrast",
  "Premium Commercial":
    "commercial polish, restrained richness, tactile realism",
  "Luxury Minimal":
    "high restraint, precise spacing, material quality, strong negative space",
  "Clean & Modern":
    "clean geometry, disciplined spacing, contemporary clarity",
  "Bold & Dynamic":
    "strong scale, decisive crop, visual rhythm, controlled intensity",
  "Elegant & Refined":
    "refined proportion, subtle contrast, deliberate detail",
  "Futuristic":
    "forward-looking material and geometry without automatic neon or cyberpunk",
  "Cinematic":
    "directional light, controlled contrast, environmental depth",
  "Editorial":
    "intentional crop, hierarchy, typography and image relationship",
  "Natural & Organic":
    "authentic materials, natural light, tactile irregularity",
  "Playful":
    "friendly visual rhythm and character without clutter",
  "Minimalist":
    "few elements, high negative space, strict hierarchy",
  "Street / Urban":
    "authentic urban context, graphic attitude, grounded materials",
  "Corporate Professional":
    "credible structure, clarity, restrained visual language",
  "Retro / Nostalgic":
    "era-appropriate visual language without generic imitation",
  "Luxury Lifestyle":
    "aspirational context, tactile materials, restrained sophistication",
  "Hyperreal Product":
    "product fidelity, realistic materials, precise studio or contextual lighting",
  "Illustrative":
    "intentional illustration language with controlled hierarchy"
};

const FORMAT_DNA = {
  "Instagram Story / WhatsApp Status 9:16":
    "vertical, mobile-first, safe zones, concise message",
  "Instagram Feed 4:5":
    "mobile-first, strong first-glance hierarchy",
  "Square 1:1":
    "balanced focal hierarchy and compact composition",
  "Landscape 16:9":
    "horizontal visual flow and wider environmental composition",
  "Poster 2:3":
    "strong typographic composition and clear focal point",
  "Flyer A-series / 4:5":
    "information-first, clear sections, no clutter",
  "Marketplace Product":
    "product-first, clean background, immediate recognition",
  "YouTube Thumbnail 16:9":
    "instant recognition, bold focal subject, minimal essential text"
};

const OBJECTIVES = [
  "Product Promotion",
  "Product Launch",
  "Discount / Sale",
  "Grand Opening",
  "Brand Awareness",
  "Event Promotion",
  "Announcement",
  "Educational",
  "Informational",
  "Seasonal Campaign",
  "Menu / Product Showcase",
  "Testimonial",
  "Corporate Communication",
  "Recruitment",
  "Personal Branding"
];

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function compact(value, fallback) {
  const result = clean(value);
  return result || fallback;
}

function buildSpec(args = {}) {
  const category = compact(args.category, "Other");
  const style = compact(args.style, "Clean & Modern");
  const format = compact(
    args.format,
    "Instagram Story / WhatsApp Status 9:16"
  );
  const objective = compact(args.objective, "Product Promotion");

  const brand = clean(args.brand);
  const product = clean(args.product);
  const brief = clean(args.brief);
  const mainMessage = clean(args.mainMessage);
  const cta = clean(args.cta);
  const hero = compact(
    args.hero,
    product || "Primary subject from client brief"
  );

  const categoryDna =
    CATEGORY_DNA[category] || CATEGORY_DNA.Other;

  const styleDna =
    STYLE_DNA[style] || STYLE_DNA["Clean & Modern"];

  const formatDna =
    FORMAT_DNA[format] ||
    FORMAT_DNA["Instagram Story / WhatsApp Status 9:16"];

  let concept =
    "A purpose-led commercial composition where the primary message and hero subject are immediately understood.";

  if (objective === "Grand Opening") {
    concept =
      "A clear opening moment built around the real business identity and a single invitation to discover the brand.";
  }

  if (objective === "Product Launch") {
    concept =
      "A launch composition that makes the product unmistakably primary while preserving brand identity.";
  }

  if (objective === "Discount / Sale") {
    concept =
      "A commercial value-first composition where the offer is legible without overpowering the product or brand.";
  }

  const negatives = [
    "invented client facts",
    "invented copy",
    "altered brand identity",
    "altered product proportions",
    "misspelled text",
    "extra text",
    "duplicate text",
    "warped typography",
    "unreadable letters",
    "generic AI gradient",
    "random dots",
    "meaningless particles",
    "generic splash",
    "purposeless floating objects",
    "unjustified glow",
    "unnecessary smoke",
    "unnecessary light streaks",
    "fake lens flare",
    "holograms without purpose",
    "excessive neon",
    "excessive bokeh",
    "generic category cliché",
    "clutter",
    "weak focal hierarchy"
  ];

  if (category === "F&B") {
    negatives.push(
      "plastic-looking food",
      "unrealistic food texture",
      "excessive garnish",
      "artificial shine"
    );
  }

  if (category === "Technology") {
    negatives.push(
      "random holograms",
      "circuit-board cliché",
      "floating UI without purpose",
      "excessive neon"
    );
  }

  if (category === "Automotive") {
    negatives.push(
      "distorted vehicle",
      "incorrect wheel geometry",
      "malformed body panels",
      "impossible reflections"
    );
  }

  if (category === "Fashion") {
    negatives.push(
      "distorted garments",
      "malformed hands",
      "stiff pose",
      "unrealistic fabric"
    );
  }

  return {
    brand: brand || null,
    product: product || null,
    brief: brief || null,
    category,
    objective,
    style,
    format,
    mainMessage: mainMessage || null,
    cta: cta || null,
    hero,
    concept,
    categoryDna,
    styleDna,
    formatDna,
    composition:
      "one primary focal point, clear hierarchy, intentional negative space, controlled secondary support",
    camera:
      "select framing, angle, perspective, lens character, depth of field, crop, and subject distance from the actual brief and format",
    lighting:
      "lighting selected to support concept and material realism rather than decorative effects",
    material:
      "physically believable materials, reflections, shadows, scale, gravity, and surface interaction",
    color:
      "derived from brand, product, campaign, category, style, and concept; no arbitrary AI palette",
    typography:
      "typography derived from brand, category, objective, style, format, audience, and hierarchy",
    brandProtection:
      "preserve logo, packaging, product shape, product color, brand name, proportions, and identifying details",
    masterRules: ENGINE_INSTRUCTIONS.trim(),
    negativePrompt: negatives.join("; ")
  };
}

function promptFromSpec(spec) {
  return [
    "QUALITY: commercially usable, physically believable, coherent, professional art direction.",
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
    `TYPOGRAPHY/COPY: exact main message: ${spec.mainMessage || "do not invent copy"}; exact CTA: ${spec.cta || "do not invent CTA"}; ${spec.typography}`,
    `BRAND: ${spec.brand || "preserve supplied brand identity exactly"}; ${spec.brandProtection}`,
    "MASTER RULES: one focal point, hierarchy over complexity, intentional negative space, product integrity, physical realism, no invented client facts.",
    `DYNAMIC NEGATIVE RULES: ${spec.negativePrompt}`
  ].join("\n");
}

/*
  Minimal valid MCP App resource.

  The resource intentionally contains a lightweight workspace.
  The important goal at this stage is to make the MCP server
  discoverable and valid for ChatGPT connector validation.
*/
const UI_HTML = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>YUDHANIA.AI Design Studio</title>
<style>
body {
  margin: 0;
  padding: 24px;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  background: #111;
  color: #fff;
}
h1 { margin-top: 0; }
p { color: #bbb; line-height: 1.5; }
.card {
  max-width: 760px;
  margin: auto;
  padding: 28px;
  border: 1px solid #333;
  border-radius: 18px;
  background: #181818;
}
</style>
</head>
<body>
<div class="card">
<h1>YUDHANIA.AI Design Studio</h1>
<p>Design workspace connected successfully.</p>
<p>Brief parsing, art direction, generation and controlled revision tools are available through the MCP tools.</p>
</div>
</body>
</html>`;

function createServer() {
  const server = new McpServer({
    name: "YUDHANIA.AI Design Studio",
    version: "1.0.0"
  });

  registerAppTool(
    server,
    "open_yudhania",
    {
      title: "Open YUDHANIA.AI Design Studio",
      description:
        "Open the YUDHANIA.AI design workspace.",
      inputSchema: z.object({
        brief: z.string().optional(),
        objective: z.string().optional(),
        category: z.string().optional(),
        format: z.string().optional(),
        style: z.string().optional()
      }),
      annotations: {
        readOnlyHint: true
      },
      _meta: {
        ui: {
          resourceUri: RESOURCE_URI
        }
      }
    },
    async (args) => {
      const spec = buildSpec(args);

      return {
        content: [
          {
            type: "text",
            text: "YUDHANIA.AI Design Studio workspace is ready."
          }
        ],
        structuredContent: {
          mode: "workspace",
          spec
        }
      };
    }
  );

  registerAppTool(
    server,
    "prepare_design",
    {
      title: "Prepare YUDHANIA Design Direction",
      description:
        "Compile a client brief into YUDHANIA.AI art direction and a generation prompt.",
      inputSchema: z.object({
        brief: z.string().optional(),
        brand: z.string().optional(),
        product: z.string().optional(),
        category: z.string().optional(),
        objective: z.string().optional(),
        style: z.string().optional(),
        format: z.string().optional(),
        mainMessage: z.string().optional(),
        cta: z.string().optional(),
        hero: z.string().optional()
      }),
      outputSchema: z.object({
        finalGenerationPrompt: z.string(),
        negativePrompt: z.string()
      }),
      _meta: {
        ui: {
          resourceUri: RESOURCE_URI,
          visibility: ["app"]
        }
      }
    },
    async (args) => {
      const spec = buildSpec(args);
      const finalGenerationPrompt = promptFromSpec(spec);

      return {
        content: [
          {
            type: "text",
            text: finalGenerationPrompt
          }
        ],
        structuredContent: {
          finalGenerationPrompt,
          negativePrompt: spec.negativePrompt
        }
      };
    }
  );

  registerAppTool(
    server,
    "prepare_revision",
    {
      title: "Prepare Controlled Revision",
      description:
        "Prepare a surgical revision while preserving the approved baseline.",
      inputSchema: z.object({
        baselineSummary: z.string().min(1),
        revisionRequest: z.string().min(1),
        lockedDecisions: z.string().optional(),
        category: z.string().optional(),
        format: z.string().optional()
      }),
      outputSchema: z.object({
        revisionInstruction: z.string(),
        dynamicNegative: z.string()
      }),
      _meta: {
        ui: {
          resourceUri: RESOURCE_URI,
          visibility: ["app"]
        }
      }
    },
    async ({
      baselineSummary,
      revisionRequest,
      lockedDecisions,
      category,
      format
    }) => {
      const revisionInstruction = [
        "CONTROLLED REVISION",
        `BASELINE: ${baselineSummary}`,
        `USER REQUEST: ${revisionRequest}`,
        `LOCKED DECISIONS: ${lockedDecisions || "Preserve all successful decisions not explicitly targeted."}`,
        `CATEGORY: ${category || "preserve existing category"}`,
        `FORMAT: ${format || "preserve existing format"}`,
        "Change only the requested variable.",
        "Preserve client facts, brand identity, product identity, objective, format, and successful visual DNA.",
        "Do not redesign unrelated areas."
      ].join("\n");

      return {
        content: [
          {
            type: "text",
            text: revisionInstruction
          }
        ],
        structuredContent: {
          revisionInstruction,
          dynamicNegative:
            "creative drift, unrelated redesign, altered product identity, altered brand identity, invented copy, new generic decoration, unnecessary effects"
        }
      };
    }
  );

  registerAppResource(
    server,
    "YUDHANIA.AI Design Workspace",
    RESOURCE_URI,
    {
      description:
        "YUDHANIA.AI design workspace.",
      _meta: {
        ui: {
          csp: {
            connectDomains: [],
            resourceDomains: []
          }
        }
      }
    },
    async () => ({
      contents: [
        {
          uri: RESOURCE_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: UI_HTML
        }
      ]
    })
  );

  return server;
}

const handler = createMcpHandler(createServer);

export default async function(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Accept, Authorization, Mcp-Session-Id, Last-Event-ID, Mcp-Protocol-Version"
      }
    });
  }

  const response = await handler.fetch(request);

  const headers = new Headers(response.headers);

  headers.set("Access-Control-Allow-Origin", "*");
  headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, DELETE, OPTIONS"
  );
  headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Accept, Authorization, Mcp-Session-Id, Last-Event-ID, Mcp-Protocol-Version"
  );
  headers.set(
    "Access-Control-Expose-Headers",
    "Mcp-Session-Id, Last-Event-ID"
  );

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
