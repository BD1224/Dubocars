// First screen: "What's your name?" → logs in if the name matches an active user.
"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { fetchUsers } from "@/lib/api";
import { findUserByName } from "@/lib/session";
import type { SessionUser } from "@/lib/types";

type Props = {
  onLogin: (user: SessionUser) => void;
};

export default function LoginScreen({ onLogin }: Props) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const typed = name.trim();
    if (!typed || loading) return;
    setLoading(true);
    setError(null);
    try {
      const user = findUserByName(await fetchUsers(), typed);
      if (!user) {
        setError(`We don't know a "${typed}" yet. Check the spelling?`);
      } else if (user.paused) {
        setError(`${user.name}'s account is paused.`);
      } else {
        onLogin({ id: user.id, name: user.name, color: user.color });
        return;
      }
    } catch {
      setError("Couldn't reach the server. Try again.");
    }
    setLoading(false);
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <form onSubmit={submit} className="w-full max-w-[360px]">
        <h1 className="mb-8 text-center text-[40px] font-bold tracking-tight">Dubocars</h1>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="What's your name?"
          aria-label="Your name"
          autoFocus
          autoCapitalize="words"
          autoCorrect="off"
          enterKeyHint="go"
          className="h-[50px] w-full rounded-[12px] bg-fill px-4 text-[17px] outline-none placeholder:text-secondary"
        />
        <p className="mt-3 min-h-[20px] text-center text-[15px] text-danger" role="alert">
          {error}
        </p>
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="mt-2 h-[50px] w-full rounded-[12px] bg-accent text-[17px] font-semibold text-white transition-opacity disabled:opacity-40"
        >
          {loading ? "Checking…" : "Continue"}
        </button>
      </form>
    </main>
  );
}
