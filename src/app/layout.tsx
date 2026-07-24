import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IDE",
  description: "Browser-based coding environment.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@fontsource/phantom-sans@5.0.0/index.min.css"
        />
      </head>
      <body className="h-full overflow-hidden bg-background text-foreground">{children}</body>
    </html>
  );
}