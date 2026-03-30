import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "Schindler MAS | Sistema Multi-Agente",
  description: "Plataforma de mantenimiento predictivo y diagnóstico de ascensores.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.variable} ${outfit.variable} antialiased font-sans`}>
        {children}
      </body>
    </html>
  );
}
