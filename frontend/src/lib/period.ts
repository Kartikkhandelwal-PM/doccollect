// The year the firm is working on now. A request, and every file that comes in on it, carries its own period (below), so nothing else has to
// guess the year. New requests start with this one; a different year can be chosen when the request is made.
export const CURRENT_FY = 'FY 2025-26'

// The years a firm can look at (the current one first), and the way to look at all of them together.
export const YEARS = [CURRENT_FY, 'FY 2024-25', 'FY 2023-24']
export const ALL_YEARS = 'All years'

// The period of a request. Requests made before the period existed (the sample data) are for the current year.
export const periodOf = (r: { period?: string }) => r.period ?? CURRENT_FY
