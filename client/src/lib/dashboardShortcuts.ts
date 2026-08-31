export type DashboardShortcutInput = {
  key: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  isTyping: boolean;
};

export function getDashboardShortcutPath(input: DashboardShortcutInput): "/" | "/dashboard" | null {
  if (input.isTyping || !input.altKey || input.ctrlKey || input.metaKey || input.shiftKey) return null;
  if (input.key === "1") return "/";
  if (input.key === "2") return "/dashboard";
  return null;
}
