/** Web stand-in for expo-haptics. Only used on meaningful moments. */
type Kind = "selection" | "success" | "warning" | "light";
const patterns: Record<Kind, number | number[]> = {
  selection: 6,
  light: 10,
  success: [12, 60, 18],
  warning: [20, 40, 20],
};
export function haptic(kind: Kind) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(patterns[kind]);
    } catch {
      /* ignore */
    }
  }
}
