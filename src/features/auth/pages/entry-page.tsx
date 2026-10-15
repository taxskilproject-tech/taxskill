"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { ResourceState } from "@/components/organisms/resource-state";
import { useAuth } from "@/features/auth/providers/auth-provider";

export function EntryPage() {
  const { status } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (status !== "loading")
      router.replace(status === "ready" ? "/dashboard" : "/login");
  }, [router, status]);
  return (
    <ResourceState
      description="Comprobando tu sesión."
      kind="loading"
      title="Abriendo TaxSkills…"
    />
  );
}
