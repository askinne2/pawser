import type { Metadata } from 'next';
import { Source_Sans_3 } from 'next/font/google';
import './globals.css';

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-source-sans',
});

export const metadata: Metadata = {
  title: 'Pawser — Find homes for every tail.',
  description: 'Embeddable adoption widgets for animal shelters. Sync your ShelterLuv data, customize your widget, and help pets find homes.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={sourceSans.variable}>
      <body className={sourceSans.className}>{children}</body>
    </html>
  );
}
