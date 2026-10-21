import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "@fontsource-variable/bricolage-grotesque";
import { themeCss } from "@splitly/theme";
import { SiteHeader } from "@/components/SiteHeader";
import { AppStoreProvider } from "@/lib/AppStore";
import { themeScript } from "@/lib/theme";
import "./globals.css";

// No title here: the home page sets "Splitly" and each group page sets "<group name> · Splitly" itself,
// so the two never compete for the browser tab.
export const metadata: Metadata = {
  description: "Split shared expenses with friends and settle up in as few payments as possible.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The theme script may set data-theme before React loads, so the attribute can differ.
    <html lang="en" className={`${GeistSans.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeCss() }} />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full font-sans">
        <AppStoreProvider>
          <SiteHeader />
          <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-8">{children}</main>
        </AppStoreProvider>
      </body>
    </html>
  );
}
