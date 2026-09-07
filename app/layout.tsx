import "./globals.css";

export const metadata = {
  title: "Beenbe News",
  description: "AI crypto market analysis powered by BinanceAgentOS"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
