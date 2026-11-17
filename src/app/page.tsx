// Entry point: show LoginScreen until someone is logged in, then CalendarScreen.
"use client";

import { useEffect, useState } from "react";
import CalendarScreen from "@/components/CalendarScreen";
import LoginScreen from "@/components/LoginScreen";
import { clearSession, loadSession, saveSession } from "@/lib/session";
import type { SessionUser } from "@/lib/types";

export default function Page() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Read localStorage after mount so server and client HTML match.
  useEffect(() => {
    setUser(loadSession());
    setLoaded(true);
  }, []);

  if (!loaded) return null;

  if (!user) {
    return (
      <LoginScreen
        onLogin={(u) => {
          saveSession(u);
          setUser(u);
        }}
      />
    );
  }

  return (
    <CalendarScreen
      user={user}
      onLogout={() => {
        clearSession();
        setUser(null);
      }}
    />
  );
}
