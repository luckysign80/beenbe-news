import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import * as opentype from "opentype.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WIDTH = 1020;
const HEIGHT = 1360;
const MARGIN = 70;
const YELLOW = "#F0B90B";
const WHITE = "#FFFFFF";
const MUTED = "#A0A0A0";
const RED = "#FF7A7A";
const ORANGE = "#FFB000";

const ROBOTO_DIR = path.join(process.cwd(), "node_modules", "roboto-fontface", "fonts", "roboto");
const FONT_PATHS = {
  regular: path.join(ROBOTO_DIR, "Roboto-Regular.ttf"),
  bold: path.join(ROBOTO_DIR, "Roboto-Bold.ttf"),
  black: path.join(ROBOTO_DIR, "Roboto-Black.ttf")
};

type FontKey = keyof typeof FONT_PATHS;
const fontCache = new Map<FontKey, opentype.Font>();

function getFont(weight: FontKey) {
  const cached = fontCache.get(weight);
  if (cached) return cached;
  const file = fs.readFileSync(FONT_PATHS[weight]);
  const arrayBuffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
  const font = opentype.parse(arrayBuffer);
  fontCache.set(weight, font);
  return font;
}

function esc(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function textPath(text: string, x: number, baseline: number, size: number, weight: FontKey, fill: string, letterSpacing = 0) {
  const font = getFont(weight);
  const pathData = font.getPath(text, x, baseline, size, { kerning: true }).toPathData(2);
  return `<path d="${pathData}" fill="${fill}"/>`;
}

function textPathCentered(text: string, centerX: number, baseline: number, size: number, weight: FontKey, fill: string) {
  const font = getFont(weight);
  const advance = font.getAdvanceWidth(text, size, { kerning: true });
  return textPath(text, centerX - advance / 2, baseline, size, weight, fill);
}

function wrapText(text: string, maxChars: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

function signalColor(signal: string) {
  if (signal === "BEARISH") return RED;
  if (signal === "HIGH_RISK") return ORANGE;
  return YELLOW;
}

function iconSvg(category: string, color: string) {
  const stroke = `stroke="${color}" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
  if (["down_arrow", "breakdown"].includes(category)) return `<path d="M180 40v150M120 130l60 60 60-60" ${stroke}/>`;
  if (["up_arrow", "breakout", "target"].includes(category)) return `<path d="M180 190V40M120 100l60-60 60 60" ${stroke}/>`;
  if (["warning", "shield", "volatility"].includes(category)) return `<path d="M180 25l145 250H35L180 25z" ${stroke}/><path d="M180 95v70M180 205h1" ${stroke}/>`;
  if (["range", "balance", "compass"].includes(category)) return `<circle cx="180" cy="145" r="115" ${stroke}/><path d="M105 220l42-117 108-42-42 117-108 42z" ${stroke}/>`;
  return `<circle cx="180" cy="145" r="115" ${stroke}/>`;
}

function buildSvg(input: { symbol: string; signal: string; confidence: number; conclusion: string; icon_category: string; attribution: string }) {
  const color = signalColor(input.signal);
  const conclusionLines = wrapText(input.conclusion, 34);
  const signalFont = input.signal === "HIGH_RISK" ? 82 : 92;
  const conclusionStart = 700;
  const conclusionMarkup = conclusionLines
    .map((line, i) => textPath(line, MARGIN, conclusionStart + i * 62, 48, "bold", WHITE))
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#000000"/>
  <rect x="${MARGIN}" y="${MARGIN}" width="${WIDTH - MARGIN * 2}" height="${HEIGHT - MARGIN * 2}" rx="28" fill="none" stroke="#1C1C1C" stroke-width="2"/>
  ${textPath("BEENBE NEWS", MARGIN, 155, 28, "black", YELLOW)}
  ${textPath(input.symbol, MARGIN, 285, 82, "black", WHITE)}
  ${textPath(input.signal, MARGIN, 410, signalFont, "black", color)}
  <g transform="translate(${WIDTH - 390}, 215) scale(0.85)">${iconSvg(input.icon_category, color)}</g>
  ${textPath("Evidence strength", MARGIN, 505, 30, "regular", MUTED)}
  ${textPath(`${Math.round(input.confidence)}/100`, MARGIN, 575, 54, "bold", WHITE)}
  <line x1="${MARGIN}" y1="620" x2="${WIDTH - MARGIN}" y2="620" stroke="#242424" stroke-width="3"/>
  ${conclusionMarkup}
  <line x1="${MARGIN}" y1="${HEIGHT - 185}" x2="${WIDTH - MARGIN}" y2="${HEIGHT - 185}" stroke="#242424" stroke-width="3"/>
  ${textPath(input.attribution, MARGIN, HEIGHT - 115, 25, "regular", MUTED)}
</svg>`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const symbol = String(body?.symbol || "").trim().toUpperCase();
    const signal = String(body?.signal || "NEUTRAL").toUpperCase();
    const confidence = Number(body?.confidence || 0);
    const conclusion = String(body?.conclusion || "").trim().slice(0, 100);
    const icon_category = String(body?.icon_category || "range");
    const attribution = "Powered by BinanceAgentOS";

    if (!symbol || !conclusion) return NextResponse.json({ error: "A valid analysis result is required." }, { status: 400 });

    const svg = buildSvg({ symbol, signal, confidence, conclusion, icon_category, attribution });
    const renderer = new Resvg(svg, { fitTo: { mode: "original" } });
    const png = renderer.render().asPng();

    return NextResponse.json({
      image: `data:image/png;base64,${Buffer.from(png).toString("base64")}`,
      format: "png",
      width: WIDTH,
      height: HEIGHT,
      generator: "Beenbe News local visual generator"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
