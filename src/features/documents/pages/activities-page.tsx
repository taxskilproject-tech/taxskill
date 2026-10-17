"use client";
import { PageHeading } from "@/features/access/components/page-heading";
import { ActivityInbox } from "@/features/activities/components/activity-inbox";

export function ActivitiesPage() {
  return (
    <div className="space-y-6">
      <PageHeading
        description="Entregas, revisión y actividades adicionales de tus empresas y del estudio."
        title="Actividades"
      />
      <ActivityInbox />
    </div>
  );
}
