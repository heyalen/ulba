import type { Metadata, Viewport } from 'next';
import './globals.css';
import { KontoProvider } from '../lib/konto';

export const metadata: Metadata = {
  title: 'ulba.ai — Packaging Discovery',
  description: 'Find your perfect beauty packaging',
};

/* v79.1 — Browser-Chrome (iOS-Statusleiste/-Toolbar) faerbt sich nach
   theme-color: auf Flaechen-Ton gesetzt, damit oben/unten keine grauen
   Balken mehr stehen; viewport-fit=cover zieht die App bis in die Safe-Areas. */
export const viewport: Viewport = {
  themeColor: '#FAFAFA',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body><KontoProvider>{children}</KontoProvider></body>
    </html>
  );
}
