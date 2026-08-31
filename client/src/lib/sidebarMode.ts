export function shouldUseCompactSidebar(pathname: string, isMobile: boolean) {
  return !isMobile && pathname.startsWith("/report/");
}
