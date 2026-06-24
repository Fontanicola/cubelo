import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cubelo",
  description: "Sistema de gestion interno de Cubelo",
  icons: {
    icon: "/Cubelo_favicon_new-1.svg"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="light">
      <body className={`${inter.className} min-h-screen overflow-hidden bg-white text-black antialiased`}>
        <Header />
        <main className="mt-[60px] h-[calc(100dvh-120px)] overflow-y-auto bg-white">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
