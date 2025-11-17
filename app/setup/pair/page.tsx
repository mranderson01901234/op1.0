"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

function PairPageContent() {
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") || null;
  const [status, setStatus] = useState<"pairing" | "success" | "error">("pairing");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("No pairing token provided");
      return;
    }

    // Check if local agent is running
    const checkAndPair = async () => {
      try {
        // First check if agent is running
        const healthResponse = await fetch("http://127.0.0.1:50152/health", {
          method: "GET",
          cache: "no-store",
        });

        if (!healthResponse.ok) {
          throw new Error("Local agent is not running. Please start the agent first.");
        }

        // Send pairing request to local agent
        const pairResponse = await fetch("http://127.0.0.1:50152/pair", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (!pairResponse.ok) {
          const errorData = await pairResponse.json();
          throw new Error(errorData.error || "Pairing failed");
        }

        setStatus("success");
      } catch (err: any) {
        setStatus("error");
        setError(err.message || "Failed to pair agent");
      }
    };

    checkAndPair();
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
        <div className="flex flex-col items-center gap-4">
          {status === "pairing" && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <h1 className="text-2xl font-semibold">Pairing agent...</h1>
              <p className="text-center text-muted-foreground">
                Please wait while we connect your local agent to your account.
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
              <h1 className="text-2xl font-semibold">Pairing successful!</h1>
              <p className="text-center text-muted-foreground">
                Your local agent is now connected. You can close this window.
              </p>
              <button
                onClick={() => (window.location.href = "/")}
                className="mt-4 rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
              >
                Go to app
              </button>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
              <h1 className="text-2xl font-semibold">Pairing failed</h1>
              <p className="text-center text-muted-foreground">{error}</p>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => window.location.reload()}
                  className="rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
                >
                  Try again
                </button>
                <button
                  onClick={() => (window.location.href = "/")}
                  className="rounded border px-4 py-2 hover:bg-muted"
                >
                  Go back
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PairPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <h1 className="text-2xl font-semibold">Loading...</h1>
          </div>
        </div>
      </div>
    }>
      <PairPageContent />
    </Suspense>
  );
}
