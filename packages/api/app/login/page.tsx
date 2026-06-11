"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setAuthToken } from "@/lib/auth-client";

type LoginMethod = "wallet" | "email" | "code";

export default function LoginPage() {
  const router = useRouter();
  const [method, setMethod] = useState<LoginMethod>("wallet");

  // Wallet login state
  const [address, setAddress] = useState("");
  const [connectedAccount, setConnectedAccount] = useState("");
  const [walletStatus, setWalletStatus] = useState<"idle" | "connecting" | "requesting" | "signing" | "verifying" | "success" | "error">("idle");
  const [walletMessage, setWalletMessage] = useState("");

  // Email login state
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "verifying" | "success" | "error">("idle");
  const [emailMessage, setEmailMessage] = useState("");

  async function handleWalletLogin() {
    if (!address || !address.startsWith("0x")) {
      setWalletMessage("Enter a valid wallet address");
      return;
    }
    if (!window.ethereum) {
      setWalletMessage("MetaMask or compatible wallet required");
      return;
    }

    setWalletStatus("requesting");
    setWalletMessage("Requesting nonce...");

    try {
      const nonceRes = await fetch(`/api/auth/nonce?address=${address}`);
      if (!nonceRes.ok) {
        const err = await nonceRes.json();
        throw new Error(err.error || "Failed to get nonce");
      }
      const { nonce } = await nonceRes.json();

      setWalletStatus("signing");
      setWalletMessage("Sign the message in your wallet...");

      const signature = (await window.ethereum.request({
        method: "personal_sign",
        params: [nonce, address],
      })) as string;

      setWalletStatus("verifying");
      setWalletMessage("Verifying signature and role...");

      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signature, nonce }),
      });

      if (!loginRes.ok) {
        const err = await loginRes.json();
        throw new Error(err.error || "Login failed");
      }

      const { token } = await loginRes.json();
      setAuthToken(token);
      setWalletStatus("success");
      setWalletMessage("Authenticated! Redirecting...");
      setTimeout(() => router.push("/dashboard"), 1000);
    } catch (err) {
      setWalletStatus("error");
      setWalletMessage(err instanceof Error ? err.message : "Login failed");
    }
  }

  async function handleConnectWallet() {
    if (!window.ethereum) {
      setWalletMessage("MetaMask or compatible wallet required");
      return;
    }

    setWalletStatus("connecting");
    setWalletMessage("Connecting to wallet...");

    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts returned");
      }

      const account = accounts[0];
      setConnectedAccount(account);
      setAddress(account);
      setWalletStatus("idle");
      setWalletMessage(`Connected: ${account.slice(0, 6)}...${account.slice(-4)}`);
    } catch (err) {
      setWalletStatus("error");
      setWalletMessage(err instanceof Error ? err.message : "Failed to connect wallet");
    }
  }

  async function handleRequestCode() {
    if (!email || !email.includes("@")) {
      setEmailMessage("Enter a valid email address");
      return;
    }

    setEmailStatus("sending");
    setEmailMessage("Sending verification code...");

    try {
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to send code");
      }

      setEmailStatus("sent");
      setEmailMessage("Code sent! Check your email (or console in dev mode).");
    } catch (err) {
      setEmailStatus("error");
      setEmailMessage(err instanceof Error ? err.message : "Failed to send code");
    }
  }

  async function handleVerifyCode() {
    if (!code || code.length !== 6) {
      setEmailMessage("Enter the 6-digit code");
      return;
    }

    setEmailStatus("verifying");
    setEmailMessage("Verifying code...");

    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Verification failed");
      }

      const { token } = await res.json();
      setAuthToken(token);
      setEmailStatus("success");
      setEmailMessage("Authenticated! Redirecting...");
      setTimeout(() => router.push("/dashboard"), 1000);
    } catch (err) {
      setEmailStatus("error");
      setEmailMessage(err instanceof Error ? err.message : "Verification failed");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[oklch(97%_0.008_85)]">
      <div className="w-full max-w-md p-8 rounded-2xl shadow-lg bg-white">
        <div className="flex justify-center mb-4">
          <img src="/asilichain-symbol.svg" alt="AsiliChain" className="h-12 w-12" />
        </div>
        <h1 className="text-2xl font-bold mb-2 text-center" style={{ color: "oklch(18% 0.01 60)" }}>
          AsiliChain Login
        </h1>
        <p className="text-sm mb-6" style={{ color: "oklch(55% 0.012 60)" }}>
          Sign in with your wallet or email to access the dashboard.
        </p>

        {/* Method toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMethod("wallet")}
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              backgroundColor: method === "wallet" ? "oklch(72% 0.16 80)" : "oklch(95% 0.005 85)",
              color: method === "wallet" ? "oklch(12% 0.005 60)" : "oklch(55% 0.012 60)",
            }}
          >
            Wallet
          </button>
          <button
            onClick={() => setMethod("email")}
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              backgroundColor: method === "email" ? "oklch(72% 0.16 80)" : "oklch(95% 0.005 85)",
              color: method === "email" ? "oklch(12% 0.005 60)" : "oklch(55% 0.012 60)",
            }}
          >
            Email
          </button>
        </div>

        {/* Wallet login */}
        {method === "wallet" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "oklch(30% 0.01 60)" }}>
                Wallet Address
              </label>
              {connectedAccount ? (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-mono border"
                  style={{ backgroundColor: "oklch(45% 0.12 145 / 0.1)", color: "oklch(40% 0.12 145)", borderColor: "oklch(45% 0.12 145 / 0.3)" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                  <span className="truncate">{connectedAccount}</span>
                  <button
                    onClick={() => { setConnectedAccount(""); setAddress(""); setWalletStatus("idle"); setWalletMessage(""); }}
                    className="ml-auto text-xs underline underline-offset-2"
                    style={{ color: "oklch(55% 0.012 60)" }}
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-3 py-2 rounded-lg border text-sm font-mono"
                  style={{ borderColor: "oklch(88% 0.006 60)" }}
                />
              )}
            </div>

            {!connectedAccount && typeof window !== "undefined" && window.ethereum && (
              <div className="text-center">
                <button
                  onClick={handleConnectWallet}
                  disabled={walletStatus === "connecting"}
                  className="text-xs underline underline-offset-2 hover:opacity-80 transition-opacity inline-flex items-center gap-1"
                  style={{ color: "oklch(60% 0.01 58)" }}
                >
                  <svg width="12" height="12" viewBox="0 0 35 33" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="1" y="1" width="33" height="31" rx="6" fill="white" stroke="#E4761B" strokeWidth="2"/>
                    <path d="M17 5L20 13H14L17 5Z" fill="#E4761B"/>
                    <path d="M17 5L10 18L14 13L17 5Z" fill="#E4761B" fillOpacity="0.6"/>
                    <path d="M17 20L20 13L14 13L17 20Z" fill="#E4761B"/>
                    <path d="M10 18L14 13L17 20L10 18Z" fill="#E4761B" fillOpacity="0.6"/>
                  </svg>
                  {walletStatus === "connecting" ? "Connecting..." : "Connect Wallet Instead"}
                </button>
              </div>
            )}

            <button
              onClick={handleWalletLogin}
              disabled={!address || walletStatus === "requesting" || walletStatus === "signing" || walletStatus === "verifying"}
              className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
              style={{ backgroundColor: "oklch(72% 0.16 80)", color: "oklch(12% 0.005 60)" }}
            >
              {walletStatus === "requesting" && "Requesting nonce..."}
              {walletStatus === "signing" && "Sign in wallet..."}
              {walletStatus === "verifying" && "Verifying..."}
              {walletStatus === "success" && "Success!"}
              {walletStatus === "idle" && "Sign in"}
            </button>

            {walletMessage && (
              <p className="text-sm text-center" style={{ color: walletStatus === "error" ? "oklch(55% 0.2 25)" : "oklch(55% 0.012 60)" }}>
                {walletMessage}
              </p>
            )}

            <div className="pt-1">
              <p className="text-xs leading-relaxed" style={{ color: "oklch(60% 0.01 58)" }}>
                Wallet verification uses <strong>cryptographic signing</strong> — you sign a unique challenge with your wallet to prove you control the private key. This is stronger than email OTP which proves only inbox access.
              </p>
            </div>
          </div>
        )}

        {/* Email login */}
        {method === "email" && (
          <div className="space-y-4">
            {emailStatus === "sent" || emailStatus === "verifying" ? (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "oklch(30% 0.01 60)" }}>
                    Verification Code
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="6-digit code"
                    maxLength={6}
                    className="w-full px-3 py-2 rounded-lg border text-sm font-mono tracking-widest text-center text-lg"
                    style={{ borderColor: "oklch(88% 0.006 60)" }}
                  />
                </div>

                <button
                  onClick={handleVerifyCode}
                  disabled={code.length !== 6 || emailStatus === "verifying"}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
                  style={{ backgroundColor: "oklch(72% 0.16 80)", color: "oklch(12% 0.005 60)" }}
                >
                  {emailStatus === "verifying" ? "Verifying..." : "Verify Code"}
                </button>

                <button
                  onClick={() => setEmailStatus("idle")}
                  className="text-xs underline underline-offset-2 w-full text-center hover:opacity-80 transition-opacity"
                  style={{ color: "oklch(60% 0.01 58)" }}
                >
                  Use a different email
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "oklch(30% 0.01 60)" }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: "oklch(88% 0.006 60)" }}
                  />
                </div>

                <button
                  onClick={handleRequestCode}
                  disabled={!email || !email.includes("@") || emailStatus === "sending"}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
                  style={{ backgroundColor: "oklch(72% 0.16 80)", color: "oklch(12% 0.005 60)" }}
                >
                  {emailStatus === "sending" ? "Sending..." : "Send Code"}
                </button>

                {emailMessage && (
                  <p className="text-sm text-center" style={{ color: emailStatus === "error" ? "oklch(55% 0.2 25)" : "oklch(55% 0.012 60)" }}>
                    {emailMessage}
                  </p>
                )}

                <div className="pt-1">
                  <p className="text-xs leading-relaxed" style={{ color: "oklch(60% 0.01 58)" }}>
                    A 6-digit code will be sent to your email. The code expires after 10 minutes.
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
