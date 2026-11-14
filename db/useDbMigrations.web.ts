/** Na webie migracje wykonuje `prepareDb()` (client.web.ts). */
export function useDbMigrations(): { success: boolean; error?: Error } {
  return { success: true };
}
