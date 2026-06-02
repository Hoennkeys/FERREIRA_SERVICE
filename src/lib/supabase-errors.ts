export function isMissingTableError(
  code: string | undefined,
  message: string | undefined,
): boolean {
  return (
    code === "PGRST205" ||
    code === "42P01" ||
    (message?.includes("Could not find the table") ?? false)
  );
}
