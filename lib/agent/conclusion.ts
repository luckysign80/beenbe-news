export type Signal = "BULLISH" | "BEARISH" | "NEUTRAL" | "HIGH_RISK";

export function validateConclusion(text: string, max = 100): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;

  const shortened = clean.slice(0, max).replace(/\s+\S*$/, "").trim();
  return shortened.endsWith(".") ? shortened : shortened + ".";
}

export function fallbackConclusion(signal: Signal): string {
  const text: Record<Signal, string> = {
    BULLISH: "Bullish momentum is strengthening, supported by current price structure.",
    BEARISH: "Bearish pressure is building as momentum and price structure weaken.",
    NEUTRAL: "Price remains indecisive with no clear directional advantage yet.",
    HIGH_RISK: "High volatility is raising risk and making direction difficult to confirm."
  };
  return validateConclusion(text[signal]);
}
