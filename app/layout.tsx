import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/providers/toast-provider";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ConditionalClerkProvider } from "@/components/providers/conditional-clerk-provider";

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
    <html lang="en">
      <body>
        <ErrorBoundary>
          <ConditionalClerkProvider>
            {children}
            <ToastProvider />
          </ConditionalClerkProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
