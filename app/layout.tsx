import type { Metadata, Viewport } from 'next';
import { Inter, Newsreader, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const newsreader = Newsreader({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'RetinaSetu — Rural Diabetic Retinopathy Screening',
    template: '%s · RetinaSetu',
  },
  description:
    'An explainable, staged clinical decision-support platform that turns a fundus photograph captured at a rural Primary Health Centre into a doctor-ready diabetic retinopathy assessment — and knows when to hand the case to a human.',
  applicationName: 'RetinaSetu',
  authors: [{ name: 'RetinaSetu' }],
  keywords: [
    'diabetic retinopathy',
    'fundus screening',
    'clinical decision support',
    'rural health',
    'explainable AI',
  ],
};

export const viewport: Viewport = {
  themeColor: '#060b14',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${newsreader.variable} ${plexMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
