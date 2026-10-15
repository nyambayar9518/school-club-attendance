"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Navbar } from "@/components/Navbar";
import { StatusBadge } from "@/components/StatusBadge";
import { ImageUploader } from "@/components/ImageUploader";
import { ImageModal } from "@/components/ImageModal";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  Send,
} from "lucide-react";

interface ClubInfo {
  id: string;
  name: string;
  teacherName: string;
}

interface OpenSession {
  id: string;
  title: string;
  sessionDate: string;
  isOpen: boolean;
  submission: {
    id: string;
    photo_url: string | null;
    description: string;
    status: "pending" | "approved" | "rejected";
    submitted_at: string;
  } | null;
}

interface SessionHistoryItem {
  id: string;
  title: string;
  sessionDate: string;
  isOpen: boolean;
  status: "approved" | "pending" | "rejected" | "absent";
  submission: {
    photo_url: string | null;
    description: string;
    submitted_at: string;
  } | null;
}

export default function StudentClubPage() {
  const params = useParams();
  const router = useRouter();
  const clubId = params.id as string;

  const [club, setClub] = useState<ClubInfo | null>(null);
  const [openSession, setOpenSession] = useState<OpenSession | null>(null);
  const [history, setHistory] = useState<SessionHistoryItem[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Attendance Form State
  const [photoUrl, setPhotoUrl] = useState("");
  const [description, setDescription] = useState("");

  // Modal image viewer
  const [selectedImage, setSelectedImage] = useState<{
    url: string;
    alt: string;
  } | null>(null);

  const fetchClubData = async () => {
    try {
      const [clubRes, userRes] = await Promise.all([
        fetch(`/api/student/club/${clubId}`),
        fetch("/api/auth/me"),
      ]);

      const clubData = await clubRes.json();
      const userData = await userRes.json();

      if (!clubRes.ok) {
        throw new Error(clubData.error || "Failed to load club details");
      }

      setClub(clubData.club);
      setOpenSession(clubData.openSessionToday);
      setHistory(clubData.sessionHistory || []);
      setCurrentUser(userData.user);
    } catch (err: any) {
      console.error("Fetch club error:", err);
      setError(err.message || "Failed to load club details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClubData();
  }, [clubId]);

  const handleSubmitAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openSession) return;
    setError(null);
    setSuccessMessage(null);

    if (!description.trim()) {
      setError("Please explain what you worked on today.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/student/submit-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: openSession.id,
          photoUrl: photoUrl || null,
          description: description.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit attendance");
      }

      setSuccessMessage("Attendance submitted successfully!");
      setPhotoUrl("");
      setDescription("");
      await fetchClubData();
    } catch (err: any) {
      console.error("Attendance submission error:", err);
      setError(err.message || "Failed to submit attendance");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-zinc-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading club details...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-12">
      <Navbar
        userName={currentUser?.fullName || "Student"}
        role="student"
        grade={currentUser?.grade}
        avatarUrl={currentUser?.avatarUrl}
      />

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Back navigation & Club header */}
        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200 pb-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
                {club?.name}
              </h1>
              <p className="text-xs text-zinc-500">
                Faculty Advisor:{" "}
                <span className="text-zinc-700 font-medium">
                  {club?.teacherName}
                </span>
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="p-3 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* TOP SECTION: Today's Session Check-in Box */}
        {openSession ? (
          <section className="bg-white border border-zinc-200 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <h2 className="text-sm font-semibold tracking-tight text-zinc-900">
                  Today&apos;s Session: {openSession.title}
                </h2>
              </div>
              <span className="text-xs font-medium text-zinc-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {openSession.sessionDate}
              </span>
            </div>

            {/* Check if student already submitted */}
            {openSession.submission ? (
              <div className="space-y-3 bg-zinc-50 border border-zinc-200 rounded-md p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-600">
                    Your Submission Status:
                  </span>
                  <StatusBadge status={openSession.submission.status} />
                </div>

                <div className="flex gap-4 items-start">
                  {openSession.submission.photo_url && (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedImage({
                          url: openSession.submission!.photo_url!,
                          alt: `Attendance photo for ${openSession.title}`,
                        })
                      }
                      className="relative w-20 h-20 rounded border border-zinc-200 overflow-hidden flex-shrink-0 group hover:opacity-90 transition-opacity bg-zinc-100"
                    >
                      <Image
                        src={openSession.submission.photo_url}
                        alt="Attendance submission"
                        fill
                        sizes="80px"
                        className="object-cover"
                        unoptimized
                      />
                      <span className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white font-medium">
                        View
                      </span>
                    </button>
                  )}

                  <div className="flex-1 space-y-1">
                    <p className="text-xs font-medium text-zinc-700">
                      Work completed:
                    </p>
                    <p className="text-xs text-zinc-900 leading-relaxed whitespace-pre-wrap">
                      {openSession.submission.description}
                    </p>
                    <p className="text-[11px] text-zinc-400 pt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Submitted at{" "}
                      {new Date(
                        openSession.submission.submitted_at
                      ).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Check-in form */
              <form onSubmit={handleSubmitAttendance} className="space-y-4">
                <ImageUploader
                  bucket="attendance-photos"
                  label="Attendance Photo (Optional proof of work)"
                  onUploaded={(url) => setPhotoUrl(url)}
                />

                <div className="space-y-1">
                  <label
                    htmlFor="description"
                    className="block text-xs font-medium text-zinc-700"
                  >
                    What did you work on today?{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="description"
                    required
                    rows={3}
                    placeholder="Briefly describe your progress, project tasks, or topics discussed during today's session..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 placeholder:text-zinc-400"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-60 rounded-md px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {submitting ? "Submitting..." : "Submit Attendance"}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </section>
        ) : (
          <div className="bg-white border border-zinc-200 rounded-lg p-5 flex items-center justify-between text-xs text-zinc-500">
            <span>No attendance sessions are currently open today.</span>
            <span className="font-medium text-zinc-600">
              Check back during club hours
            </span>
          </div>
        )}

        {/* BOTTOM SECTION: Complete Club Sessions History */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900">
              Session History
            </h2>
            <span className="text-xs text-zinc-500">
              {history.length} {history.length === 1 ? "session" : "sessions"}{" "}
              recorded
            </span>
          </div>

          <div className="bg-white border border-zinc-200 rounded-lg divide-y divide-zinc-200 overflow-hidden">
            {history.map((session) => (
              <div
                key={session.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-50/50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-zinc-500">
                      {session.sessionDate}
                    </span>
                    <span className="text-xs font-semibold text-zinc-900">
                      {session.title}
                    </span>
                  </div>

                  {session.submission && (
                    <div className="flex items-center gap-3 pt-1">
                      {session.submission.photo_url && (
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedImage({
                              url: session.submission!.photo_url!,
                              alt: `Photo for ${session.title}`,
                            })
                          }
                          className="relative w-7 h-7 rounded border border-zinc-200 overflow-hidden flex-shrink-0"
                          title="View photo"
                        >
                          <Image
                            src={session.submission.photo_url}
                            alt="Thumbnail"
                            fill
                            sizes="28px"
                            className="object-cover"
                            unoptimized
                          />
                        </button>
                      )}
                      <p className="text-xs text-zinc-600 line-clamp-1 max-w-md">
                        {session.submission.description}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <StatusBadge status={session.status} />
                </div>
              </div>
            ))}

            {history.length === 0 && (
              <div className="p-8 text-center text-xs text-zinc-500">
                No past sessions recorded yet for this club.
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Lightbox Modal */}
      <ImageModal
        imageUrl={selectedImage?.url || null}
        altText={selectedImage?.alt || "Photo"}
        onClose={() => setSelectedImage(null)}
      />
    </div>
  );
}
