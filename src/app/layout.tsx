import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from 'next/link';
import { Anchor } from 'lucide-react';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Naviera Port App",
  description: "Sistema de gestión de recaladas portuarias",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <header className="bg-slate-900 text-white shadow-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Anchor className="w-6 h-6 text-emerald-400" />
              <span className="font-bold text-lg tracking-wide">NAVIERA PORT APP</span>
            </div>
            <nav className="flex gap-6">
              <Link href="/" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                Nueva Recalada
              </Link>
              <Link href="/history" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                Dashboard e Historial
              </Link>
            </nav>
          </div>
        </header>
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
