import { NextResponse } from "next/server";
import { createRequire } from "node:module";
import { Resvg } from "@resvg/resvg-js";

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

const require = createRequire(import.meta.url);
// resvg's native font loader does not reliably support WOFF2; use the bundled WOFF files.
const ROBOTO_REGULAR = require.resolve("@fontsource/roboto/files/roboto-latin-400-normal.woff");
const ROBOTO_BOLD = require.resolve("@fontsource/roboto/files/roboto-latin-700-normal.woff");
const ROBOTO_BLACK = require.resolve("@fontsource/roboto/files/roboto-latin-900-normal.woff");

function esc(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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
    .map((line, i) => `<text x="${MARGIN}" y="${conclusionStart + i * 62}" fill="${WHITE}" font-family="Roboto" font-size="48" font-weight="700">${esc(line)}</text>`)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#000000"/>
  <rect x="${MARGIN}" y="${MARGIN}" width="${WIDTH - MARGIN * 2}" height="${HEIGHT - MARGIN * 2}" rx="28" fill="none" stroke="#1C1C1C" stroke-width="2"/>
  <text x="${MARGIN}" y="155" fill="${YELLOW}" font-family="Roboto" font-size="28" font-weight="900" letter-spacing="7">BEENBE NEWS</text>
  <text x="${MARGIN}" y="285" fill="${WHITE}" font-family="Roboto" font-size="82" font-weight="900">${esc(input.symbol)}</text>
  <text x="${MARGIN}" y="410" fill="${color}" font-family="Roboto" font-size="${signalFont}" font-weight="900">${esc(input.signal)}</text>
  <g transform="translate(${WIDTH - 390}, 215) scale(0.85)">${iconSvg(input.icon_category, color)}</g>
  <text x="${MARGIN}" y="505" fill="${MUTED}" font-family="Roboto" font-size="30" font-weight="400">Evidence strength</text>
  <text x="${MARGIN}" y="575" fill="${WHITE}" font-family="Roboto" font-size="54" font-weight="700">${Math.round(input.confidence)}/100</text>
  <line x1="${MARGIN}" y1="620" x2="${WIDTH - MARGIN}" y2="620" stroke="#242424" stroke-width="3"/>
  ${conclusionMarkup}
  <line x1="${MARGIN}" y1="${HEIGHT - 185}" x2="${WIDTH - MARGIN}" y2="${HEIGHT - 185}" stroke="#242424" stroke-width="3"/>
  <text x="${MARGIN}" y="${HEIGHT - 115}" fill="${MUTED}" font-family="Roboto" font-size="25" font-weight="400">${esc(input.attribution)}</text>
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
    const renderer = new Resvg(svg, {
      fitTo: { mode: "original" },
      font: {
        fontFiles: [ROBOTO_REGULAR, ROBOTO_BOLD, ROBOTO_BLACK],
        loadSystemFonts: false,
        defaultFontFamily: "Roboto"
      }
    });
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
