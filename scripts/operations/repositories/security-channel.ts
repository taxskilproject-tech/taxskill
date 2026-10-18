import type { AppSupabaseClient } from "../../../src/lib/supabase/types/client.types";

const JOIN_TIMEOUT_MS = 8000;

export async function canJoinPrivateNotice(
  client: AppSupabaseClient,
  topic: string,
): Promise<boolean> {
  const channel = client.channel(topic, { config: { private: true } });
  await client.realtime.setAuth();
  const allowed = await new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => resolve(false), JOIN_TIMEOUT_MS);
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(timeout);
        resolve(true);
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(timeout);
        resolve(false);
      }
    });
  });
  const removed = await client.removeChannel(channel);
  client.realtime.disconnect();
  if (removed !== "ok")
    throw new Error("No se pudo cerrar el canal de verificación local.");
  return allowed;
}
