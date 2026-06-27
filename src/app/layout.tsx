import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ZKM - Zaneva Konsinyasi Manager',
  description: 'Manajemen konsinyasi Zaneva untuk venue padel',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
