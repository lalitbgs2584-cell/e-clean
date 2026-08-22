import { config } from "../config/env";

export const DUMP_TYPES = [
  "OVERFLOWING_BIN",
  "OPEN_DUMP",
  "ROAD_SIDE_DUMP",
  "DRAIN_DUMP",
  "VACANT_LAND",
  "CONSTRUCTION_DUMP",
  "ILLEGAL_DUMPING",
  "OTHER",
] as const;

export const WASTE_CATEGORIES = [
  "HOUSEHOLD",
  "PLASTIC",
  "ORGANIC",
  "CONSTRUCTION",
  "ELECTRONIC",
  "MEDICAL",
  "HAZARDOUS",
  "MIXED",
  "OTHER",
] as const;

export const WASTE_VOLUMES = [
  "SMALL",
  "MEDIUM",
  "LARGE",
  "VERY_LARGE",
] as const;

export const TRUCK_SIZES = ["SMALL", "MEDIUM", "LARGE"] as const;

export const INTERVENTIONS = [
  "MANUAL_CLEANUP",
  "WORKER_TRUCK_DISPATCH",
  "RECYCLING_PARTNER",
  "ESCALATION",
] as const;

export interface WasteAssessment {
  dumpType: (typeof DUMP_TYPES)[number];
  wasteCategory: (typeof WASTE_CATEGORIES)[number];
  wasteVolume: (typeof WASTE_VOLUMES)[number];
  truckSize: (typeof TRUCK_SIZES)[number];
  workersNeeded: number;
  recommendedAction: (typeof INTERVENTIONS)[number];
  attention: "NORMAL" | "URGENT";
  nearSensitiveLocation: boolean;
  severityScore: number;
  aiConfidence: number;
  description: string;
  isLikelyAIGenerated: boolean;
  aiGeneratedConfidence: number;
}

export const CATEGORY_LABELS: Record<string, string> = {
  HOUSEHOLD: "Mixed Waste",
  PLASTIC: "Plastic / Packaging",
  ORGANIC: "Organic / Food Waste",
  CONSTRUCTION: "Construction Debris",
  ELECTRONIC: "Electronic Waste",
  MEDICAL: "Hazardous / Chemical",
  HAZARDOUS: "Hazardous / Chemical",
  MIXED: "Mixed Waste",
  OTHER: "Mixed Waste",
};

export function severityFromScore(score: number): "Low" | "Medium" | "High" {
  if (score < 40) return "Low";
  if (score < 70) return "Medium";
  return "High";
}

const assessmentSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "dumpType",
    "wasteCategory",
    "wasteVolume",
    "truckSize",
    "workersNeeded",
    "recommendedAction",
    "attention",
    "nearSensitiveLocation",
    "severityScore",
    "aiConfidence",
    "description",
    "isLikelyAIGenerated",
    "aiGeneratedConfidence",
  ],
  properties: {
    dumpType: { type: "string", enum: [...DUMP_TYPES] },
    wasteCategory: { type: "string", enum: [...WASTE_CATEGORIES] },
    wasteVolume: { type: "string", enum: [...WASTE_VOLUMES] },
    truckSize: { type: "string", enum: [...TRUCK_SIZES] },
    workersNeeded: { type: "integer" },
    recommendedAction: { type: "string", enum: [...INTERVENTIONS] },
    attention: { type: "string", enum: ["NORMAL", "URGENT"] },
    nearSensitiveLocation: { type: "boolean" },
    severityScore: { type: "integer" },
    aiConfidence: { type: "integer" },
    description: { type: "string" },
    isLikelyAIGenerated: { type: "boolean" },
    aiGeneratedConfidence: { type: "number" },
  },
};

const SYSTEM_PROMPT = `You are the AI assessment engine for E-CLEAN, a municipal waste-management platform.
Analyze the attached photo(s) of a citizen-reported waste/garbage issue and fill the structured assessment form using ONLY the allowed enum values.

Rules:
- dumpType: how/where the waste is dumped (overflowing bin, open dump, roadside, drain, vacant land, construction dump, illegal dumping, other).
- wasteCategory: dominant waste material visible.
- wasteVolume: estimated pile size (SMALL < 1m3, MEDIUM 1-3m3, LARGE 3-8m3, VERY_LARGE > 8m3).
- truckSize: smallest truck that can collect it (SMALL/MEDIUM/LARGE); MANUAL_CLEANUP cases can use SMALL.
- workersNeeded: integer 1-8 based on volume and hazard.
- recommendedAction: MANUAL_CLEANUP (small litter), WORKER_TRUCK_DISPATCH (large pile), RECYCLING_PARTNER (mostly recyclables), ESCALATION (hazardous/medical/drain-blocking).
- attention: URGENT only for hazardous/medical waste, drain blockage, or dumps next to schools/hospitals/water bodies.
- severityScore: 0-100 (0 trivial, 100 dangerous).
- aiConfidence: your confidence 0-100 in the assessment.
- description: write exactly 1-2 plain-language sentences describing the waste, its approximate size and the impact (smell, blocked path, health risk). It is shown to citizens and municipal reviewers. Do not mention the AI model.`;
// Also assess whether imagery is likely synthetic/manipulated. This is a
// review flag only: never reject a civic report solely from this estimate.`;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sanitizeAssessment(raw: any): WasteAssessment | null {
  if (!raw || typeof raw !== "object") return null;

  return {
    dumpType: DUMP_TYPES.includes(raw.dumpType) ? raw.dumpType : "OTHER",
    wasteCategory: WASTE_CATEGORIES.includes(raw.wasteCategory)
      ? raw.wasteCategory
      : "MIXED",
    wasteVolume: WASTE_VOLUMES.includes(raw.wasteVolume)
      ? raw.wasteVolume
      : "MEDIUM",
    truckSize: TRUCK_SIZES.includes(raw.truckSize) ? raw.truckSize : "MEDIUM",
    workersNeeded: clamp(Math.round(Number(raw.workersNeeded) || 2), 1, 8),
    recommendedAction: INTERVENTIONS.includes(raw.recommendedAction)
      ? raw.recommendedAction
      : "WORKER_TRUCK_DISPATCH",
    attention: raw.attention === "URGENT" ? "URGENT" : "NORMAL",
    nearSensitiveLocation: Boolean(raw.nearSensitiveLocation),
    severityScore: clamp(Math.round(Number(raw.severityScore) || 50), 0, 100),
    aiConfidence: clamp(Math.round(Number(raw.aiConfidence) || 50), 0, 100),
    description: String(raw.description ?? "").slice(0, 500),
    isLikelyAIGenerated: Boolean(raw.isLikelyAIGenerated),
    aiGeneratedConfidence: clamp(Number(raw.aiGeneratedConfidence) || 0, 0, 1),
  };
}

export async function checkImageAuthenticity(image: {
  base64: string;
  mimeType: string;
}) {
  if (!config.openaiApiKey)
    return { isLikelyAIGenerated: false, aiGeneratedConfidence: 0 };
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "Assess whether this civic evidence photo appears AI-generated or materially synthetic. Return only JSON.",
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${image.mimeType};base64,${image.base64}`,
                },
              },
            ],
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "authenticity",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["isLikelyAIGenerated", "aiGeneratedConfidence"],
              properties: {
                isLikelyAIGenerated: { type: "boolean" },
                aiGeneratedConfidence: {
                  type: "number",
                  minimum: 0,
                  maximum: 1,
                },
              },
            },
          },
        },
      }),
    });
    if (!response.ok)
      return { isLikelyAIGenerated: false, aiGeneratedConfidence: 0 };
    const raw = JSON.parse(
      ((await response.json()) as any).choices?.[0]?.message?.content ?? "{}",
    );
    return {
      isLikelyAIGenerated: Boolean(raw.isLikelyAIGenerated),
      aiGeneratedConfidence: clamp(
        Number(raw.aiGeneratedConfidence) || 0,
        0,
        1,
      ),
    };
  } catch {
    return { isLikelyAIGenerated: false, aiGeneratedConfidence: 0 };
  }
}

export async function assessWasteImages(
  images: { base64: string; mimeType: string }[],
  hint?: string | null,
): Promise<WasteAssessment | null> {
  if (!config.openaiApiKey || images.length === 0) return null;

  try {
    const userContent: any[] = [
      ...images.map((img) => ({
        type: "image_url",
        image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
      })),
      {
        type: "text",
        text: hint
          ? `Citizen note (context only): ${hint}\nAssess the reported waste issue in these photo(s).`
          : "Assess the reported waste issue in these photo(s).",
      },
    ];

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "waste_assessment",
            strict: true,
            schema: assessmentSchema,
          },
        },
      }),
    });

    if (!res.ok) {
      console.error("OpenAI request failed:", res.status, await res.text());
      return null;
    }

    const json: any = await res.json();
    const raw = json?.choices?.[0]?.message?.content;
    if (!raw) return null;

    return sanitizeAssessment(JSON.parse(raw));
  } catch (error) {
    console.error("AI assessment failed:", error);
    return null;
  }
}

export function fallbackAssessment(
  hint?: string | null,
  location?: string | null,
): WasteAssessment {
  const place = location ? ` near ${location.split("\n")[0]}` : "";
  const description =
    hint && hint.trim().length > 0
      ? hint.slice(0, 500)
      : `Waste accumulation reported${place}. Needs municipal inspection and cleanup.`;

  return {
    dumpType: "OTHER",
    wasteCategory: "MIXED",
    wasteVolume: "MEDIUM",
    truckSize: "MEDIUM",
    workersNeeded: 2,
    recommendedAction: "WORKER_TRUCK_DISPATCH",
    attention: "NORMAL",
    nearSensitiveLocation: false,
    severityScore: 50,
    aiConfidence: 0,
    description,
    isLikelyAIGenerated: false,
    aiGeneratedConfidence: 0,
  };
}
