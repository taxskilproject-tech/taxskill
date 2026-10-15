export type SessionListener = (
  event: string,
  session: { user: { id: string } } | null,
) => void;
