/** Parses "1", "0.5", "2.25". Returns the cleaned text, or null if invalid (0.01 to 100.00). */
export function parsePoints(input: string): string | null {
    const text = input.trim();
    if (!/^\d{1,3}(\.\d{1,2})?$/.test(text)) return null;
    const hundredths = toHundredths(text);
    if (hundredths < 1 || hundredths > 10000) return null;
    return formatHundredths(hundredths);
  }
  
  /** "2.5" -> 250. Exact integer math, no floating-point rounding. */
  export function toHundredths(value: string): number {
    const [whole, fraction = ""] = value.trim().split(".");
    return Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
  }
  
  /** 250 -> "2.5", 100 -> "1", 5 -> "0.05" */
  export function formatHundredths(hundredths: number): string {
    const whole = Math.floor(hundredths / 100);
    const fraction = hundredths % 100;
    if (fraction === 0) return String(whole);
    return `${whole}.${String(fraction).padStart(2, "0").replace(/0$/, "")}`;
  }