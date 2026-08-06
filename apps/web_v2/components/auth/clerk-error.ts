export type ClerkErr =
  { longMessage?: string; message: string } | null | undefined;

export function errMsg(err: ClerkErr): string {
  if (!err) return "Something went wrong. Please try again.";
  return err.longMessage ?? err.message;
}
