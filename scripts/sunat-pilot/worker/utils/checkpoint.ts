import type {
  MailboxCheckpoint,
  MailboxJob,
  MailboxPage,
} from "../types/mailbox.types";

export function initialMailboxCheckpoint(job: MailboxJob): MailboxCheckpoint {
  return {
    schema_version: 1,
    connection_key: job.connection_key,
    mailbox: job.mailbox,
    from: job.from,
    through: job.through,
    next_page: 1,
    total: null,
    order: null,
    first_id: null,
    last_date: null,
    seen_ids: [],
    items: [],
    complete: false,
  };
}

export function checkpointMatchesJob(
  checkpoint: MailboxCheckpoint,
  job: MailboxJob,
): boolean {
  return (
    checkpoint.connection_key === job.connection_key &&
    checkpoint.mailbox === job.mailbox &&
    checkpoint.from === job.from &&
    checkpoint.through === job.through
  );
}

export function acceptMailboxPage(
  checkpoint: MailboxCheckpoint,
  page: MailboxPage,
  job: MailboxJob,
): MailboxCheckpoint {
  const selected = page.items.filter(
    (item) => item.published_on >= job.from && item.published_on <= job.through,
  );
  const lastDate = page.items.at(-1)?.published_on ?? null;
  const crossedMonthBoundary =
    page.order === "published_desc" && lastDate !== null && lastDate < job.from;
  return {
    ...checkpoint,
    next_page: page.page + 1,
    total: page.total,
    order: page.order,
    first_id: checkpoint.first_id ?? page.items[0]?.id ?? null,
    last_date: lastDate,
    seen_ids: [...checkpoint.seen_ids, ...page.items.map((item) => item.id)],
    items: [...checkpoint.items, ...selected],
    complete: page.end === page.total || crossedMonthBoundary,
  };
}
