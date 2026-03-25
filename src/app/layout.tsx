import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Header } from "@/components/layout/Header";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Echo — Oral Exam Prep for Maritime Officers",
  description:
    "Prepare for your MCA oral exam with an AI examiner. Voice-to-voice exam practice, available 24/7.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: "#2563EB",
              colorText: "#111111",
              colorTextSecondary: "#6B7280",
              colorBackground: "#FFFFFF",
              borderRadius: "8px",
              fontFamily: "Inter, sans-serif",
            },
          }}
        >
          <Header />
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
