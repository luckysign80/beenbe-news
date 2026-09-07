import { fallbackConclusion, validateConclusion, Signal } from "./conclusion";

export type Candle = { open: number; high: number; low: number; close: number; volume: number };
export type OrderBook = { bids: [string, string][]; asks: [string, string][] };

export type MarketInput = {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  timeframes: { h1: Candle[]; h4: Candle[]; d1: Candle[] };
  orderBook: OrderBook;
};

export type Factor = { name: string; score: number; label: "BULLISH" | "BEARISH" | "NEUTRAL"; detail: string };
export type AgentResult = { symbol: string; signal: Signal; confidence: number; conclusion: string; icon_category: string; attribution: "Powered by BinanceAgentOS"; factors: Factor[]; riskLevel: "LOW" | "MEDIUM" | "HIGH" };

const clamp = (n: number, min = -1, max = 1) => Math.max(min, Math.min(max, n));
const avg = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
const pct = (a: number, b: number) => b ? a / b - 1 : 0;

function ema(values: number[], period: number) { if (!values.length) return 0; const k = 2 / (period + 1); let value = values[0]; for (let i = 1; i < values.length; i++) value = values[i] * k + value * (1 - k); return value; }
function timeframeScore(candles: Candle[]) { const closes = candles.map(c => c.close); if (closes.length < 12) return 0; const last = closes.at(-1)!; const e9 = ema(closes, 9); const e21 = ema(closes, 21); const lookback = closes[Math.max(0, closes.length - 12)]; const trend = clamp(pct(last, lookback) / 0.08); const emaTrend = clamp(pct(e9, e21) / 0.04); const momentum = clamp(pct(last, closes[Math.max(0, closes.length - 4)]) / 0.04); return trend * 0.4 + emaTrend * 0.35 + momentum * 0.25; }
function volatilityScore(candles: Candle[]) { const closes = candles.map(c => c.close); const returns = closes.slice(1).map((x, i) => pct(x, closes[i])); const vol = Math.sqrt(avg(returns.map(r => r * r))); return { vol, score: clamp((0.025 - vol) / 0.025) }; }
function volumeScore(candles: Candle[]) { if (candles.length < 12) return 0; const recent = avg(candles.slice(-5).map(c => c.volume)); const prior = avg(candles.slice(-10, -5).map(c => c.volume)); return clamp(pct(recent, prior) / 0.35); }
function structureScore(candles: Candle[], price: number) { if (candles.length < 10) return 0; const window = candles.slice(-20); const high = Math.max(...window.map(c => c.high)); const low = Math.min(...window.map(c => c.low)); const range = high - low || price; const position = (price - low) / range; return clamp((position - 0.5) * 2); }
function liquidityScore(orderBook: OrderBook) { const bidQty = orderBook.bids.reduce((s, [p, q]) => s + Number(p) * Number(q), 0); const askQty = orderBook.asks.reduce((s, [p, q]) => s + Number(p) * Number(q), 0); const total = bidQty + askQty; return total ? clamp((bidQty - askQty) / total * 4) : 0; }
function label(score: number): Factor["label"] { if (score >= 0.18) return "BULLISH"; if (score <= -0.18) return "BEARISH"; return "NEUTRAL"; }
function detail(score: number, bullish: string, bearish: string, neutral: string) { return score >= 0.18 ? bullish : score <= -0.18 ? bearish : neutral; }

export function reasonOverMarket(data: MarketInput): AgentResult {
  const h1 = timeframeScore(data.timeframes.h1), h4 = timeframeScore(data.timeframes.h4), d1 = timeframeScore(data.timeframes.d1);
  const momentum = clamp(h1 * 0.25 + h4 * 0.45 + d1 * 0.30);
  const volume = volumeScore(data.timeframes.h4), structure = structureScore(data.timeframes.h4, data.price), liquidity = liquidityScore(data.orderBook);
  const vol = volatilityScore(data.timeframes.h4), volatilityPenalty = clamp((vol.vol - 0.025) / 0.035);
  const riskScore = clamp(Math.max(0, volatilityPenalty) * 0.7 + Math.max(0, -liquidity) * 0.3);
  const factors: Factor[] = [
    { name: "Trend & momentum", score: momentum, label: label(momentum), detail: detail(momentum, "Higher-timeframe momentum is aligned upward.", "Momentum is aligned downward across timeframes.", "Timeframes are mixed with no dominant trend.") },
    { name: "Volume", score: volume, label: label(volume), detail: detail(volume, "Recent 4h volume is expanding.", "Recent 4h volume is contracting.", "Volume is not showing a decisive change.") },
    { name: "Price structure", score: structure, label: label(structure), detail: detail(structure, "Price is positioned in the stronger half of its recent range.", "Price is positioned in the weaker half of its recent range.", "Price is near the middle of its recent range.") },
    { name: "Liquidity", score: liquidity, label: label(liquidity), detail: detail(liquidity, "Top-of-book depth favors bids.", "Top-of-book depth favors asks.", "Bid/ask depth is relatively balanced.") },
    { name: "Volatility / risk", score: -riskScore, label: label(-riskScore), detail: riskScore > 0.35 ? "Volatility is elevated and increases execution risk." : "Volatility is within a more manageable range." }
  ];
  const weighted = momentum * 0.40 + volume * 0.15 + structure * 0.20 + liquidity * 0.10 - riskScore * 0.15;
  let signal: Signal = weighted >= 0.25 ? "BULLISH" : weighted <= -0.25 ? "BEARISH" : "NEUTRAL";
  if (riskScore > 0.55 && Math.abs(weighted) < 0.45) signal = "HIGH_RISK";
  const agreement = factors.filter(f => Math.sign(f.score) === Math.sign(weighted) && Math.abs(f.score) >= 0.18).length;
  const confidence = Math.round(clamp(48 + Math.abs(weighted) * 38 + agreement * 3 + Math.min(1, data.timeframes.h4.length / 60) * 8, 0, 100));
  const iconMap: Record<Signal, string[]> = { BULLISH: ["up_arrow", "breakout", "target"], BEARISH: ["down_arrow", "breakdown", "warning"], NEUTRAL: ["range", "balance", "compass"], HIGH_RISK: ["warning", "volatility", "shield"] };
  const icons = iconMap[signal];
  const icon = icons[data.symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % icons.length];
  let conclusion = fallbackConclusion(signal);
  if (signal === "BULLISH" && momentum > 0.35 && volume > 0.15) conclusion = "Bullish trend has support from momentum and expanding volume.";
  if (signal === "BEARISH" && momentum < -0.35 && structure < -0.15) conclusion = "Bearish pressure is reinforced by weak momentum and price structure.";
  if (signal === "NEUTRAL" && Math.abs(h1 - d1) > 0.55) conclusion = "Timeframes disagree, keeping directional conviction limited for now.";
  if (signal === "HIGH_RISK") conclusion = "Elevated volatility and mixed signals make direction difficult to confirm.";
  return { symbol: data.symbol, signal, confidence, conclusion: validateConclusion(conclusion), icon_category: icon, attribution: "Powered by BinanceAgentOS", factors, riskLevel: riskScore > 0.55 ? "HIGH" : riskScore > 0.25 ? "MEDIUM" : "LOW" };
}
