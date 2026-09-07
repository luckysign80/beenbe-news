import { NextResponse } from "next/server";
import { reasonOverMarket } from "@/lib/agent/reasoner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE = "https://data-api.binance.vision";

async function binance(path: string) {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  const text = await res.text();
  let payload: unknown = null;
  try { payload = JSON.parse(text); } catch {}
  if (!res.ok) {
    const code = typeof payload === "object" && payload && "code" in payload ? Number((payload as { code: unknown }).code) : undefined;
    if (code === -1121) throw new Error("Symbol was not found on Binance Spot. Try a symbol such as ETHUSDT.");
    throw new Error(`Binance market data HTTP ${res.status}: ${text.slice(0, 400)}`);
  }
  return payload;
}

function normalizeSymbol(value: unknown) {
  return String(value ?? "").trim().toUpperCase().replace(/[\s/:-]+/g, "");
}

function candles(rows: unknown[]): { open: number; high: number; low: number; close: number; volume: number }[] {
  return rows.map((k: unknown[]) => ({
    open: Number(k[1]), high: Number(k[2]), low: Number(k[3]), close: Number(k[4]), volume: Number(k[5])
  }));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const symbol = normalizeSymbol(body?.symbol);
    if (!/^[A-Z0-9]{5,20}$/.test(symbol)) {
      return NextResponse.json({ error: "Enter a valid Binance spot symbol, e.g. BTCUSDT or ETHUSDT." }, { status: 400 });
    }

    const [price, stats, h1, h4, d1, depth] = await Promise.all([
      binance(`/api/v3/ticker/price?symbol=${encodeURIComponent(symbol)}`),
      binance(`/api/v3/ticker/24hr?symbol=${encodeURIComponent(symbol)}`),
      binance(`/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=1h&limit=72`),
      binance(`/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=4h&limit=72`),
      binance(`/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=1d&limit=60`),
      binance(`/api/v3/depth?symbol=${encodeURIComponent(symbol)}&limit=100`)
    ]);

    const result = reasonOverMarket({
      symbol,
      price: Number((price as { price: string }).price),
      change24h: Number((stats as { priceChangePercent: string }).priceChangePercent),
      volume24h: Number((stats as { volume: string }).volume),
      timeframes: { h1: candles(h1 as unknown[]), h4: candles(h4 as unknown[]), d1: candles(d1 as unknown[]) },
      orderBook: depth as { bids: [string, string][]; asks: [string, string][] }
    });

    return NextResponse.json({ result, source: "Binance market data" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
