"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setAuthToken } from "@/lib/auth-client";

export default function AuthVerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [message, setMessage] = useState("Verifying your login...");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token found.");
      return;
    }

    async function verify() {
      try {
        const res = await fetch("/api/auth/verify-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Verification failed");
        }

        const { token: jwt } = await res.json();
        setAuthToken(jwt);
        setStatus("success");
        setMessage("Authenticated! Redirecting to dashboard...");
        setTimeout(() => router.push("/dashboard"), 1000);
      } catch (err) {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Verification failed");
      }
    }

    verify();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[oklch(97%_0.008_85)]">
      <div className="w-full max-w-md p-8 rounded-2xl shadow-lg bg-white text-center">
        <h1 className="text-2xl font-bold mb-4" style={{ color: "oklch(18% 0.01 60)" }}>
          AsiliChain
        </h1>
        {status === "verifying" && (
          <div className="flex flex-col items-center gap-3">
            <svg className="h-8 w-8 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p style={{ color: "oklch(55% 0.012 60)" }}>{message}</p>
          </div>
        )}
        {status === "success" && (
          <p style={{ color: "oklch(45% 0.12 145)" }}>{message}</p>
        )}
        {status === "error" && (
          <div>
            <p style={{ color: "oklch(55% 0.2 25)" }}>{message}</p>
            <button
              onClick={() => router.push("/login")}
              className="mt-4 px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ backgroundColor: "oklch(72% 0.16 80)", color: "oklch(12% 0.005 60)" }}
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
