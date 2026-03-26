import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'pawser Admin',
  description: 'Admin dashboard for pawser platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

