import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { MonthProvider } from "@/context/MonthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import AuthWrapper from "@/components/AuthWrapper";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
});

export const metadata: Metadata = {
  title: "WalletAI - Personal Finance Assistant",
  description: "AI-powered personal finance assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme') || 
                             (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                document.documentElement.classList.add(theme);
              })();
            `,
          }}
        />
      </head>
      <body className={plusJakartaSans.className}>
        <ThemeProvider>
          <AuthProvider>
            <MonthProvider>
              <AuthWrapper>
                {children}
              </AuthWrapper>
            </MonthProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}