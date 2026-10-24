"use client";
import { PageHeading } from "@/features/access/components/page-heading";
import { ActivityInbox } from "@/features/activities/components/activity-inbox";

export function ActivitiesPage() {
  return (
    <div className="space-y-3">
      <PageHeading
        description="Entregas, revisión y actividades adicionales."
        title="Actividades"
      />
      <ActivityInbox />
    </div>
  );
}
