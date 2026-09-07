"use client";

import { useState } from "react";

type Factor = { name: string; score: number; label: string; detail: string };
type Result = { symbol: string; signal: string; confidence: number; conclusion: string; icon_category: string; attribution: string; factors: Factor[]; riskLevel: string };

export default function Home() {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function analyze() {
    setLoading(true); setError(""); setResult(null); setImage(null);
    try {
      const res = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ symbol }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setResult(data.result);
      setImageLoading(true);
      try {
        const imageRes = await fetch("/api/generate-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data.result) });
        const imageData = await imageRes.json();
        if (imageRes.ok && imageData.image) setImage(imageData.image);
      } finally { setImageLoading(false); }
    } catch (e) { setError(e instanceof Error ? e.message : "Analysis failed"); }
    finally { setLoading(false); }
  }

  return (
    <main className="page">
      <section className="card">
        <div className="eyebrow">BEENBE NEWS</div>
        <h1>Crypto intelligence, powered by BinanceAgentOS.</h1>

        <div className="form">
          <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="BTCUSDT" aria-label="Binance symbol" />
          <button onClick={analyze} disabled={loading || !symbol.trim()}>{loading ? "ANALYZING..." : "ANALYZE"}</button>
        </div>

        {error && <div className="error">{error}</div>}

        {result && <div className="result">
          <div className="symbol">{result.symbol}</div>
          <div className={"signal " + result.signal.toLowerCase()}>{result.signal}</div>
          <div className="confidence">Confidence {result.confidence}/100 · Risk {result.riskLevel}</div>
          <div className="conclusion">{result.conclusion}</div>
          <div className="powered">{result.attribution}</div>

          <div className="factorGrid">
            {result.factors.map((factor) => (
              <div className="factor" key={factor.name}>
                <div className="factorTop"><strong>{factor.name}</strong><span>{factor.label}</span></div>
                <div className="factorDetail">{factor.detail}</div>
              </div>
            ))}
          </div>

          <div className="visualStage">
            {imageLoading && <div className="visualLoading">CREATING VISUAL...</div>}
            {image && <img src={image} alt={`${result.symbol} market analysis visual`} className="visual" />}
          </div>
        </div>}
      </section>
    </main>
  );
}
