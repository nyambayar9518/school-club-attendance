"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!phone || !password) {
      setErrorMessage("Please enter both phone number and password.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Invalid credentials");
      }

      if (data.role === "teacher") {
        router.push("/teacher");
      } else {
        router.push("/dashboard");
      }
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to sign in. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6">
      <div className="max-w-sm w-full mx-auto space-y-6">
        {/* Minimal header */}
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
            School Club Attendance
          </h1>
          <p className="text-xs text-zinc-500">
            Sign in with your phone number and password
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4">
          {errorMessage && (
            <div className="p-2.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label
                htmlFor="phone"
                className="block text-xs font-medium text-zinc-700"
              >
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                required
                autoComplete="tel"
                placeholder="e.g. 555-0199"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 placeholder:text-zinc-400"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="password"
                className="block text-xs font-medium text-zinc-700"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 placeholder:text-zinc-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-60 rounded-md px-4 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="pt-2 border-t border-zinc-100 text-center">
            <p className="text-xs text-zinc-500">
              New student?{" "}
              <Link
                href="/signup"
                className="text-zinc-900 font-medium hover:underline"
              >
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
