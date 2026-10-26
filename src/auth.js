import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
const hash = (s) => createHash("sha256").update(s).digest("hex");
export const constantEqual = (a, b) => {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};
export function createAuth(
  ownerToken,
  {
    ttl = 8 * 60 * 60 * 1000,
    now = Date.now,
    maxAttempts = 8,
    secure = false,
  } = {},
) {
  const sessions = new Map(),
    attempts = new Map();
  const cookies = (req) =>
    Object.fromEntries(
      (req.headers.cookie || "")
        .split(";")
        .filter(Boolean)
        .map((v) => {
          const i = v.indexOf("=");
          return [v.slice(0, i).trim(), v.slice(i + 1)];
        }),
    );
  const cookie = (value) =>
    `frobot_session=${value}; HttpOnly; SameSite=Strict; Path=/; ${secure ? "Secure; " : ""}`;
  function sweep() {
    for (const [key, s] of sessions)
      if (s.expires <= now()) sessions.delete(key);
    for (const [key, a] of attempts) if (a.reset <= now()) attempts.delete(key);
  }
  return {
    login(req, token) {
      sweep();
      const key = req.socket.remoteAddress || "unknown";
      const a = attempts.get(key) || {
        count: 0,
        reset: now() + 15 * 60 * 1000,
      };
      if (a.count >= maxAttempts)
        return {
          status: 429,
          error: "Too many login attempts. Try again in 15 minutes.",
        };
      if (typeof token !== "string" || !constantEqual(token, ownerToken)) {
        a.count++;
        attempts.set(key, a);
        return { status: 401, error: "Invalid Owner credential." };
      }
      attempts.delete(key);
      if (sessions.size >= 1000)
        return { status: 503, error: "Session capacity reached." };
      const old = cookies(req).frobot_session;
      if (old) sessions.delete(hash(old));
      const value = randomBytes(32).toString("hex"),
        csrf = randomBytes(24).toString("hex");
      const expires = now() + ttl;
      sessions.set(hash(value), { csrf, expires });
      return {
        status: 200,
        cookie: cookie(value) + `Max-Age=${Math.floor(ttl / 1000)}`,
        csrf,
        expires,
      };
    },
    session(req) {
      sweep();
      const value = cookies(req).frobot_session;
      return value ? sessions.get(hash(value)) : null;
    },
    allowed(req) {
      if (!ownerToken) return true;
      if (
        constantEqual(req.headers.authorization || "", `Bearer ${ownerToken}`)
      )
        return true;
      const session = this.session(req);
      return (
        !!session &&
        (req.method === "GET" ||
          req.method === "HEAD" ||
          constantEqual(req.headers["x-frobot-csrf"] || "", session.csrf))
      );
    },
    logout(req) {
      const value = cookies(req).frobot_session;
      if (value) sessions.delete(hash(value));
      return cookie("") + "Max-Age=0";
    },
    required: !!ownerToken,
  };
}
