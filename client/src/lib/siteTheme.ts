export type SiteTheme = "light" | "dark";

export function nextSiteTheme(theme: SiteTheme): SiteTheme {
  return theme === "light" ? "dark" : "light";
}
