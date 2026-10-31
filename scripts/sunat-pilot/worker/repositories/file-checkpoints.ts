import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { MailboxError } from "../services/mailbox-error";
import type {
  MailboxCheckpoint,
  MailboxCheckpointStore,
  MailboxJob,
} from "../types/mailbox.types";

export function mailboxCheckpointKey(job: MailboxJob): string {
  return createHash("sha256")
    .update(
      JSON.stringify([job.connection_key, job.mailbox, job.from, job.through]),
    )
    .digest("hex");
}

export async function readMailboxCheckpointFile(
  filename: string,
): Promise<unknown> {
  try {
    return JSON.parse(await readFile(filename, "utf8"));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT")
      return null;
    throw new MailboxError("CHECKPOINT_INVALID");
  }
}

async function writeAtomically(
  filename: string,
  checkpoint: MailboxCheckpoint,
) {
  const temporary = filename + "." + randomUUID() + ".tmp";
  try {
    await writeFile(temporary, JSON.stringify(checkpoint), {
      flag: "wx",
      mode: 0o600,
    });
    await rename(temporary, filename);
  } catch {
    throw new MailboxError("CHECKPOINT_STORE_FAILED");
  }
}

export function createFileMailboxCheckpoints(
  directory: string,
): MailboxCheckpointStore {
  return {
    load: (job) =>
      readMailboxCheckpointFile(
        join(directory, mailboxCheckpointKey(job) + ".working.json"),
      ),
    async save(job, checkpoint) {
      await mkdir(directory, { recursive: true, mode: 0o700 });
      const key = mailboxCheckpointKey(job);
      await writeAtomically(join(directory, key + ".working.json"), checkpoint);
      if (checkpoint.complete)
        await writeAtomically(
          join(directory, key + ".complete.json"),
          checkpoint,
        );
    },
  };
}
