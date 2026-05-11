import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function loadLocalEnv() {
  for (const filename of [".env.local", ".env"]) {
    const path = join(process.cwd(), filename);

    if (!existsSync(path)) {
      continue;
    }

    const content = readFileSync(path, "utf8");

    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separator = trimmed.indexOf("=");

      if (separator === -1) {
        continue;
      }

      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^"|"$/g, "");
      process.env[key] ??= value;
    }
  }
}

function readArg(name, fallback) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function appendSetCookie(cookieJar, response) {
  const setCookie = response.headers.getSetCookie?.() ?? [];
  const rawCookies =
    setCookie.length > 0
      ? setCookie
      : response.headers.get("set-cookie")
        ? [response.headers.get("set-cookie")]
        : [];

  for (const rawCookie of rawCookies) {
    if (!rawCookie) {
      continue;
    }

    const [cookiePair] = rawCookie.split(";");
    const separator = cookiePair.indexOf("=");

    if (separator === -1) {
      continue;
    }

    const name = cookiePair.slice(0, separator);
    const value = cookiePair.slice(separator + 1);
    cookieJar.set(name, value);
  }
}

function cookieHeader(cookieJar) {
  return [...cookieJar.entries()]
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

async function request(cookieJar, url, init = {}) {
  const response = await fetch(url, {
    ...init,
    redirect: "manual",
    headers: {
      ...(init.headers ?? {}),
      Cookie: cookieHeader(cookieJar),
    },
  });

  appendSetCookie(cookieJar, response);

  return response;
}

loadLocalEnv();

const baseUrl = readArg("base-url", "http://127.0.0.1:3000").replace(/\/$/, "");
const username = readArg(
  "username",
  process.env.SMOKE_USERNAME ?? process.env.BOOTSTRAP_ADMIN_USERNAME ?? "admin",
);
const password = readArg(
  "password",
  process.env.SMOKE_PASSWORD ?? process.env.BOOTSTRAP_ADMIN_PASSWORD ?? "ChangeMe123!",
);
const pagePaths = [
  "/dashboard/users",
  "/dashboard/data-management",
  "/dashboard/people",
  "/dashboard/archive/students",
  "/dashboard/approvals",
  "/dashboard/exports",
];

const cookieJar = new Map();

const csrfResponse = await request(cookieJar, `${baseUrl}/api/auth/csrf`);

if (!csrfResponse.ok) {
  throw new Error(`CSRF request failed with HTTP ${csrfResponse.status}`);
}

const { csrfToken } = await csrfResponse.json();
const loginBody = new URLSearchParams({
  username,
  password,
  csrfToken,
  callbackUrl: `${baseUrl}/dashboard`,
  json: "true",
});

const loginResponse = await request(cookieJar, `${baseUrl}/api/auth/callback/credentials`, {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: loginBody,
});

if (![200, 302].includes(loginResponse.status)) {
  throw new Error(`Login failed with HTTP ${loginResponse.status}`);
}

cookieJar.set("school-browser-session", "active");

const results = [];

for (const pagePath of pagePaths) {
  const response = await request(cookieJar, `${baseUrl}${pagePath}`);
  const body = await response.text();
  const hasServerError = /__next_error__|This page couldn/i.test(body);
  const passed = response.status === 200 && !hasServerError;

  results.push({
    path: pagePath,
    status: response.status,
    passed,
  });
}

console.table(results);

const failures = results.filter((result) => !result.passed);

if (failures.length > 0) {
  throw new Error(
    `Authenticated page smoke failed: ${failures
      .map((failure) => `${failure.path} (${failure.status})`)
      .join(", ")}`,
  );
}
