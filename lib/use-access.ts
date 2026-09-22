"use client";
import { useEffect, useState } from "react";
import { hasAccess, pageRequirement, type AccessProfile, type Requirement } from "./permissions";
export function useAccess() {
  const [profile, setProfile] = useState<AccessProfile | null>(null);
  useEffect(() => {
    let active = true;
    const refresh = () => {
      fetch("/api/permissions/me", { cache: "no-store" })
        .then(async res => res.ok ? await res.json() : null)
        .then(data => { if (active) setProfile(data); })
        .catch(() => { if (active) setProfile(null); });
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => { active = false; window.removeEventListener("focus", refresh); };
  }, []);
  const canVisit = (href: string) => {
    const required = pageRequirement(href);
    return !required || (!!profile && hasAccess(profile, required));
  };
  const can = (requirement: Requirement) => !!profile && hasAccess(profile, requirement);
  return { profile, canVisit, can };
}
