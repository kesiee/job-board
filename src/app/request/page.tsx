"use client";

import { useState } from "react";

const REQUEST_TYPES = [
  { value: "add_company", label: "Add a company" },
  { value: "report_job", label: "Report a job posting" },
  { value: "feature", label: "Feature request" },
  { value: "bug", label: "Report a bug" },
  { value: "other", label: "Other" },
];

export default function RequestPage() {
  const [type, setType] = useState("");
  const [detail, setDetail] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type || !detail) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, detail, email }),
      });
      if (!res.ok) throw new Error();
      setStatus("success");
      setType("");
      setDetail("");
      setEmail("");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Submit a Request</h1>
      <p className="mt-1 text-sm text-gray-500">
        Want us to add a company, report an issue, or suggest a feature? Let us know.
      </p>

      {status === "success" ? (
        <div className="mt-8 rounded-lg border border-green-200 bg-green-50 p-6 text-center">
          <p className="text-lg font-medium text-green-800">Thanks for your request!</p>
          <p className="mt-1 text-sm text-green-600">We&apos;ll review it soon.</p>
          <button
            onClick={() => setStatus("idle")}
            className="mt-4 text-sm font-medium text-green-700 hover:text-green-900"
          >
            Submit another request
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Request type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select a type...</option>
              {REQUEST_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Details
            </label>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              required
              rows={4}
              placeholder={
                type === "add_company"
                  ? "Company name and careers page URL..."
                  : "Describe your request..."
              }
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="For follow-up..."
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {status === "error" && (
            <p className="text-sm text-red-600">Something went wrong. Please try again.</p>
          )}

          <button
            type="submit"
            disabled={status === "loading" || !type || !detail}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {status === "loading" ? "Submitting..." : "Submit Request"}
          </button>
        </form>
      )}
    </div>
  );
}
