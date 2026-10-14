export type WindowState = "UPCOMING" | "AVAILABLE" | "CLOSED";

function latest(dates: (Date | null | undefined)[]): Date | null {
  const real = dates.filter((d): d is Date => d instanceof Date);
  return real.length === 0 ? null : new Date(Math.max(...real.map((d) => d.getTime())));
}

function earliest(dates: (Date | null | undefined)[]): Date | null {
  const real = dates.filter((d): d is Date => d instanceof Date);
  return real.length === 0 ? null : new Date(Math.min(...real.map((d) => d.getTime())));
}

/**
 * When may a student START an exam?
 * - It opens at the LATER of the assignment's open date and the exam's open date.
 * - The last moment to start is the EARLIER of the assignment's due date and the exam's end date.
 * A due date never cuts off an attempt that already began (that rule lives in Phase 11).
 */
export function examWindow(input: {
  now: Date;
  assignmentFrom?: Date | null;
  dueDate?: Date | null;
  examFrom?: Date | null;
  examUntil?: Date | null;
}): { opensAt: Date | null; closesAt: Date | null; state: WindowState } {
  const opensAt = latest([input.assignmentFrom, input.examFrom]);
  const closesAt = earliest([input.dueDate, input.examUntil]);

  let state: WindowState = "AVAILABLE";
  if (opensAt && input.now.getTime() < opensAt.getTime()) {
    state = "UPCOMING";
  } else if (closesAt && input.now.getTime() > closesAt.getTime()) {
    state = "CLOSED";
  }

  return { opensAt, closesAt, state };
}