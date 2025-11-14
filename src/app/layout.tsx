import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { MonthProvider } from "@/context/MonthContext";
import AuthWrapper from "@/components/AuthWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FinAI - Personal Finance Dashboard",
  description: "AI-powered personal finance management dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-900 text-white`}>
        <AuthProvider>
          <MonthProvider>
            <AuthWrapper>
              {children}
            </AuthWrapper>
          </MonthProvider>
        </AuthProvider>
      </body>
    </html>
  );
}