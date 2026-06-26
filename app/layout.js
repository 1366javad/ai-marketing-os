import { DM_Sans } from "next/font/google";
import "./globals.css";
import Providers from "@/app/providers";
import { ThemeProvider } from "@/app/lib/context/ThemeProvider";
import { ThemeContextProvider } from "@/app/lib/context/ThemeContext";
import { TextStreamProvider } from "@/app/lib/context/TextStreamContext";
import { NavigationProvider } from "@/app/lib/context/NavigationContext";
import { UserProfileProvider } from "@/app/lib/context/UserProfileContext";
import { Toaster } from "@/components/ui/toaster";
import { Suspense } from "react";

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "AI Marketing OS",
  description: "AI Powered Marketing Command Center",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className="custom-scrollbar">
      <body className={`custom-scrollbar ${dmSans.className}`}>
        <ThemeProvider>
          <Providers>
            <ThemeContextProvider>
              <Suspense fallback={children}>
                <NavigationProvider>
                  <UserProfileProvider>
                    <TextStreamProvider>
                      {children}
                      <Toaster />
                    </TextStreamProvider>
                  </UserProfileProvider>
                </NavigationProvider>
              </Suspense>
            </ThemeContextProvider>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
