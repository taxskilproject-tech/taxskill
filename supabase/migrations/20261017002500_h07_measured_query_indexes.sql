-- The reference dataset exposed full scans in the existing correlated summary.
-- UUIDs are globally unique; these covering indexes complement tenant-leading indexes.
create index deliverables_h07_obligation on public.deliverables(obligation_id) include(id,review_state);
create index cycles_h07_deliverable on public.submission_cycles(deliverable_id) include(state,first_submitted_at,due_date);
create index versions_h07_deliverable on public.document_versions(deliverable_id,finalized_at desc);
