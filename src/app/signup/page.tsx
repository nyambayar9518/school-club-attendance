"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { MASTER_CLUBS } from "@/config/clubs";
import { ImageUploader } from "@/components/ImageUploader";

export default function StudentSignupPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [grade, setGrade] = useState("9");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [firstClub, setFirstClub] = useState(MASTER_CLUBS[0] || "");
  const [secondClub, setSecondClub] = useState(MASTER_CLUBS[1] || "");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!fullName.trim() || !phone.trim() || !password || !grade) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }

    if (firstClub === secondClub) {
      setErrorMessage("Please select two different clubs. Both choices cannot be the same.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          grade: parseInt(grade, 10),
          phone: phone.trim(),
          password,
          avatarUrl: avatarUrl || null,
          firstClubName: firstClub,
          secondClubName: secondClub,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to register student");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create account. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-10 px-4 sm:px-6">
      <div className="max-w-sm w-full mx-auto space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
            Student Registration
          </h1>
          <p className="text-xs text-zinc-500">
            Join your school clubs and track attendance
          </p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4">
          {errorMessage && (
            <div className="p-2.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1">
              <label
                htmlFor="fullName"
                className="block text-xs font-medium text-zinc-700"
              >
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="fullName"
                type="text"
                required
                placeholder="Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 placeholder:text-zinc-400"
              />
            </div>

            {/* Grade */}
            <div className="space-y-1">
              <label
                htmlFor="grade"
                className="block text-xs font-medium text-zinc-700"
              >
                Grade <span className="text-red-500">*</span>
              </label>
              <select
                id="grade"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
              >
                {[6, 7, 8, 9, 10, 11, 12].map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <label
                htmlFor="phone"
                className="block text-xs font-medium text-zinc-700"
              >
                Phone Number <span className="text-red-500">*</span>
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

            {/* Password */}
            <div className="space-y-1">
              <label
                htmlFor="password"
                className="block text-xs font-medium text-zinc-700"
              >
                Password <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                placeholder="Choose a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 placeholder:text-zinc-400"
              />
            </div>

            {/* Optional Profile Picture */}
            <ImageUploader
              bucket="avatars"
              label="Profile Picture (Optional)"
              onUploaded={(url) => setAvatarUrl(url)}
            />

            {/* Club Selection */}
            <div className="pt-2 border-t border-zinc-100 space-y-3">
              <p className="text-xs font-medium text-zinc-900">
                Club Selection (Choose 2 different clubs)
              </p>

              <div className="space-y-1">
                <label
                  htmlFor="firstClub"
                  className="block text-xs font-medium text-zinc-600"
                >
                  First Club <span className="text-red-500">*</span>
                </label>
                <select
                  id="firstClub"
                  value={firstClub}
                  onChange={(e) => setFirstClub(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
                >
                  {MASTER_CLUBS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="secondClub"
                  className="block text-xs font-medium text-zinc-600"
                >
                  Second Club <span className="text-red-500">*</span>
                </label>
                <select
                  id="secondClub"
                  value={secondClub}
                  onChange={(e) => setSecondClub(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
                >
                  {MASTER_CLUBS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-60 rounded-md px-4 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 pt-2.5"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Creating account..." : "Complete Registration"}
            </button>
          </form>

          <div className="pt-2 border-t border-zinc-100 text-center">
            <p className="text-xs text-zinc-500">
              Already registered?{" "}
              <Link
                href="/login"
                className="text-zinc-900 font-medium hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
