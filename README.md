# Beenbe News

**AI-powered crypto market intelligence for Binance markets.**

Beenbe News analyzes Binance market data across multiple timeframes and turns complex market conditions into a simple, readable market signal.

Enter a Binance spot symbol such as `BTCUSDT`, `ETHUSDT`, `BNBUSDT`, or `SOLUSDT`, and Beenbe News evaluates the market using multiple technical and market-structure factors.

---

## What Beenbe News Does

Beenbe News analyzes the selected Binance trading pair and produces:

- **Market Signal** — BULLISH, BEARISH, NEUTRAL, or HIGH_RISK
- **Confidence Score** — 0–100
- **Risk Level**
- **Market Factors**
- **Short Market Conclusion**

The goal is to make market analysis easier to understand without requiring users to interpret dozens of indicators themselves.

---

## Multi-Timeframe Market Analysis

Beenbe News evaluates market conditions across:

- **1H**
- **4H**
- **1D**

Using multiple timeframes helps identify whether short-term and longer-term market conditions are aligned or conflicting.

---

## Analysis Factors

### Trend & Momentum

Evaluates recent price direction and momentum across multiple timeframes.

### Volume

Examines trading volume and whether market activity supports the current price movement.

### Price Structure

Analyzes recent highs, lows, support/resistance behavior, and overall market structure.

### Liquidity

Uses order-book depth to evaluate available market liquidity.

### Volatility & Risk

Measures market volatility and identifies conditions where price movement may become unstable.

### Timeframe Agreement

Compares different timeframes to determine whether the market is showing consistent directional evidence.

---

## Market Signals

### BULLISH

The available evidence shows stronger conditions supporting an upward market direction.

### BEARISH

The available evidence shows stronger conditions supporting a downward market direction.

### NEUTRAL

The available evidence does not provide a strong directional advantage.

### HIGH_RISK

Market conditions show elevated risk, significant volatility, or conflicting signals.

---

## Confidence Score

The confidence score represents the **strength and consistency of the available market evidence**.

It is **not a probability of profit** and does not represent a guarantee of future price movement.

For example:

```text
Confidence: 82/100
```

means the analyzed factors are relatively consistent with the resulting signal.

---

## Binance Market Data

Beenbe News currently retrieves public Binance market data including:

- Current price
- 24-hour price change
- 24-hour volume
- 1H candlesticks
- 4H candlesticks
- 1D candlesticks
- Order-book depth

The current implementation uses Binance's public market-data API.

---

## Vercel Deployment

Beenbe News is designed to run as a Next.js application on Vercel.

After connecting the GitHub repository to Vercel, the project can be deployed using the standard Next.js configuration.

---

## Run Locally

### 1. Clone the repository

```bash
git clone https://github.com/luckysign80/beenbe-news.git
cd beenbe-news
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm run dev
```

### 4. Open Beenbe News

Open:

```text
http://localhost:3000
```

Enter a Binance symbol such as:

```text
BTCUSDT
```

or:

```text
ETH USDT
```

and click **Analyze Market**.

---

## Disclaimer

Beenbe News is an **analytical and educational tool**.

Market signals, confidence scores, and conclusions are generated from available market data and analytical logic. They are not financial advice, investment recommendations, or guarantees of future performance.

Cryptocurrency markets are highly volatile and involve substantial risk.

**Always conduct your own research and risk assessment before making financial decisions.**

---

## License

This project is currently provided for development and demonstration purposes.
