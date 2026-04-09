import type { Metadata } from "next";
import { Varela_Round, Nunito_Sans, Geist } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { cn } from "@/lib/utils";
import { PlaylistProvider } from "@/lib/playlist-context";
import { PlaylistMiniBar } from "@/components/PlaylistMiniBar";
import { ThemeProvider } from "@/components/ThemeProvider";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const varelaRound = Varela_Round({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-varela-round",
  display: "swap",
});

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-nunito-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Fenua Chords — Accords de chants polynesiens",
  description:
    "Partagez et trouvez les accords de bringues, himene et chants polynesiens.",
  icons: {
    icon: [
      { url: "/favicon/favicon.ico", sizes: "any" },
      { url: "/favicon/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: "/favicon/apple-touch-icon.png",
  },
  manifest: "/favicon/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", varelaRound.variable, nunitoSans.variable, geistMono.variable, "font-sans", geist.variable)}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <PlaylistProvider>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
            <PlaylistMiniBar />
          </PlaylistProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
