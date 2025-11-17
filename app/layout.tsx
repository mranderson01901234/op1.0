import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { ToastProvider } from "@/components/providers/toast-provider";
import { ErrorBoundary } from "@/components/ui/error-boundary";

export const metadata: Metadata = {
  title: "OperaStudio - Premium Chat Interface",
  description: "Enterprise-grade dark monochrome chat application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <ErrorBoundary>
            {children}
            <ToastProvider />
          </ErrorBoundary>
        </body>
      </html>
    </ClerkProvider>
  );
}
