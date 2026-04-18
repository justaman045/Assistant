import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/context/ToastContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import AnalyticsProvider from "@/components/AnalyticsProvider";
import GlobalErrorSetup from "@/components/GlobalErrorSetup";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

const APP_URL = "https://personal-dashboard.app";

export const metadata: Metadata = {
  title: {
    default: "Dashboard — AI Content Studio",
    template: "%s | Dashboard",
  },
  description:
    "Generate LinkedIn posts, cold emails, blog articles, and more with 30+ AI models. Powered by your brand voice and personal memory.",
  keywords: ["AI content generator", "LinkedIn post writer", "brand voice AI", "OpenRouter", "content automation"],
  authors: [{ name: "Dashboard" }],
  metadataBase: new URL(APP_URL),
  openGraph: {
    type: "website",
    url: APP_URL,
    title: "Dashboard — AI Content Studio",
    description: "Generate on-brand content in seconds. 30+ AI models, brand voice, memory system, and more.",
    siteName: "Dashboard",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dashboard — AI Content Studio",
    description: "Generate on-brand content in seconds. 30+ AI models, brand voice, memory system, and more.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning prevents mismatch from ThemeProvider adding .dark before hydration
    <html lang="en" className={`${geist.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="h-full bg-background text-foreground">
        <ThemeProvider>
          <ErrorBoundary>
            <AuthProvider>
              <ToastProvider>
                <AnalyticsProvider />
                <GlobalErrorSetup />
                {children}
              </ToastProvider>
            </AuthProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
