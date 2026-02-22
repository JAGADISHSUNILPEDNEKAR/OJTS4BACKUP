import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Origin | Supply Chain Intelligence",
  description: "Agricultural Supply Chain Fraud Detection System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
