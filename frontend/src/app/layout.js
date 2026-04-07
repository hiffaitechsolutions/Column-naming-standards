import { Inter } from 'next/font/google';
import './globals.css';
import AuthProvider from '@/components/auth/AuthProvider';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Automated Column Naming Validation - Driving consistency across every column',
  description: 'Professional data validation platform for Excel and CSV files. Upload your data, define standards, and get detailed validation reports.',
  keywords: 'data validation, excel validation, csv validation, data quality, data standards',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}