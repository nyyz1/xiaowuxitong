export const browserSessionCookieName = "school-browser-session";
const browserSessionCookieValue = "active";

function buildCookieSuffix() {
  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    return "; Secure";
  }

  return "";
}

export function setBrowserSessionCookie() {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie =
    `${browserSessionCookieName}=${browserSessionCookieValue}; Path=/; SameSite=Lax` +
    buildCookieSuffix();
}

export function clearBrowserSessionCookie() {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie =
    `${browserSessionCookieName}=; Path=/; Max-Age=0; SameSite=Lax` +
    buildCookieSuffix();
}
