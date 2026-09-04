/** `Date` → MySQL `DATETIME` string in UTC (`YYYY-MM-DD HH:MM:SS`). */
export function toMysqlDateTime(d: Date = new Date()): string {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

export function minutesFromNow(minutes: number): string {
  return toMysqlDateTime(new Date(Date.now() + minutes * 60_000));
}
