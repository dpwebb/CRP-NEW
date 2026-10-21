import http from "node:http";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { configuration } from "./config.mjs";
import { Journal } from "./journal.mjs";
import { Gateway } from "./gateway.mjs";
const publicRoot = new URL("../public/", import.meta.url);
const messages = {
  SESSION_REQUIRED: "Sign in to the family workspace.",
  ADMIN_UNLOCK_REQUIRED:
    "Unlock administration with a current authenticator code.",
  FRESH_FACTOR_REQUIRED:
    "Enter a fresh authenticator code before making this change.",
  APPLICATION_NOT_LINKED: "Connect your authorized application access first.",
  APPLICATION_BINDING_REQUIRED:
    "Your application membership has not been linked by the owner.",
  LINKED_MEMBERSHIP_CHANGED:
    "Application access changed or expired. Reconnect your access.",
  PERMISSION_REQUIRED: "Your CRP role does not allow this action.",
  LINKED_PERMISSION_REQUIRED:
    "Your linked membership does not allow this action.",
  UPSTREAM_OUTCOME_UNKNOWN:
    "The result could not be confirmed. Check the originating application before taking another action.",
  PREVIOUS_OUTCOME_UNRESOLVED:
    "An earlier matching action has an uncertain result. Reconcile it in the originating application; it was not sent again.",
  CONFIRMATION_REQUIRED: "Confirm the exact action and environment.",
  APPLICATION_ALREADY_LINKED:
    "Disconnect the existing link before linking another session.",
};
function json(res, status, data, headers = {}) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    ...headers,
  });
  res.end(JSON.stringify(data));
}
async function body(req) {
  if (!String(req.headers["content-type"] || "").startsWith("application/json"))
    throw Object.assign(Error("JSON_REQUIRED"), { status: 415 });
  let total = 0;
  const chunks = [];
  for await (const chunk of req) {
    total += chunk.length;
    if (total > 32768)
      throw Object.assign(Error("BODY_TOO_LARGE"), { status: 413 });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw Object.assign(Error("INVALID_JSON"), { status: 400 });
  }
}
export function createPortal(raw, options = {}) {
  const config = configuration(raw),
    journal = options.journal || new Journal(config.auditDirectory),
    gateway = new Gateway(config, journal, options);
  const assets = new Map(
    [
      ["/", ["index.html", "text/html; charset=utf-8"]],
      ["/app.js", ["app.js", "text/javascript; charset=utf-8"]],
      ["/style.css", ["style.css", "text/css; charset=utf-8"]],
    ].map(([url, [file, type]]) => [
      url,
      { bytes: readFileSync(new URL(file, publicRoot)), type },
    ]),
  );
  const server = http.createServer(async (req, res) => {
    res.setHeader("cache-control", "no-store");
    res.setHeader("x-content-type-options", "nosniff");
    res.setHeader("referrer-policy", "no-referrer");
    res.setHeader("x-frame-options", "DENY");
    res.setHeader(
      "content-security-policy",
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    );
    if (config.secure)
      res.setHeader("strict-transport-security", "max-age=31536000");
    try {
      if (req.headers.host !== config.host)
        throw Object.assign(Error("HOST_REFUSED"), { status: 403 });
      if (
        (req.headers.origin && req.headers.origin !== config.origin) ||
        (!["GET", "HEAD"].includes(req.method) &&
          req.headers.origin !== config.origin)
      )
        throw Object.assign(Error("ORIGIN_REFUSED"), { status: 403 });
      const url = new URL(req.url, config.origin);
      if (url.origin !== config.origin || url.pathname.includes("%"))
        throw Object.assign(Error("INVALID_PATH"), { status: 400 });
      const path = url.pathname;
      if (req.method === "GET" && assets.has(path)) {
        const a = assets.get(path);
        res.writeHead(200, { "content-type": a.type });
        res.end(a.bytes);
        return;
      }
      if (path === "/health" && req.method === "GET") {
        json(res, 200, {
          ok: true,
          application: "crp-family-admin",
          environment: config.environment,
        });
        return;
      }
      if (path === "/api/login" && req.method === "POST") {
        const result = await gateway.login(
          await body(req),
          req.socket.remoteAddress,
        );
        json(res, 200, result.data, { "set-cookie": result.cookie });
        return;
      }
      const session = gateway.getSession(req);
      if (!["GET", "HEAD"].includes(req.method)) gateway.csrf(req, session);
      if (path === "/api/unlock" && req.method === "POST") {
        json(res, 200, await gateway.unlock(session, await body(req)));
        return;
      }
      if (path === "/api/logout" && req.method === "POST") {
        await gateway.logout(session);
        json(
          res,
          200,
          { signedOut: true },
          { "set-cookie": gateway.cookie("", true) },
        );
        return;
      }
      if (path === "/api/session" && req.method === "GET") {
        json(res, 200, await gateway.session(session));
        return;
      }
      if (path === "/api/audit" && req.method === "GET") {
        const principal = await gateway.authorize(session);
        if (!principal.permissions.includes("audit.read"))
          throw Object.assign(Error("PERMISSION_REQUIRED"), { status: 403 });
        json(res, 200, {
          items: journal.events
            .filter(
              (x) =>
                principal.role === "owner" || x.subject === session.subject,
            )
            .slice(-200)
            .reverse(),
        });
        return;
      }
      let match = /^\/api\/connections\/(affiliate|mail)$/.exec(path);
      if (match && req.method === "POST") {
        json(
          res,
          200,
          await gateway.connect(session, match[1], await body(req)),
        );
        return;
      }
      if (match && req.method === "DELETE") {
        await gateway.authorize(session);
        if (match[1] === "mail" && session.links.mail)
          await gateway.call("mail", "/staff/api/logout", session, {
            method: "POST",
            body: {},
          });
        delete session.links[match[1]];
        journal.append("APPLICATION_DISCONNECTED", {
          subject: session.subject,
          app: match[1],
        });
        json(res, 200, { disconnected: true });
        return;
      }
      match = /^\/api\/apps\/(crp|affiliate|mail)\/([a-z.]+)$/.exec(path);
      if (match && req.method === "GET") {
        const query = Object.fromEntries(url.searchParams);
        const id = query.id;
        delete query.id;
        json(
          res,
          200,
          await gateway.read(session, match[1], match[2], id, query),
        );
        return;
      }
      match = /^\/api\/actions\/(crp|affiliate|mail)\/([a-z.]+)$/.exec(path);
      if (match && req.method === "POST") {
        json(
          res,
          200,
          await gateway.execute(session, match[1], match[2], await body(req)),
        );
        return;
      }
      json(res, 404, {
        error: { code: "NOT_FOUND", message: "That page is unavailable." },
      });
    } catch (e) {
      const code = /^[A-Z0-9_]{1,80}$/.test(e.code || e.message || "")
          ? e.code || e.message
          : "REQUEST_UNAVAILABLE",
        status = Number.isInteger(e.status) ? e.status : 500;
      json(res, status, {
        error: {
          code,
          message:
            messages[code] ||
            (status === 500
              ? "The workspace is temporarily unavailable."
              : `Request could not be completed (${code.replaceAll("_", " ").toLowerCase()}).`),
        },
      });
    }
  });
  const reaper = setInterval(() => {
    for (const session of gateway.sessions.values())
      if (session.expires <= gateway.now())
        void gateway.logout(session).catch(() => {});
  }, 30000);
  reaper.unref();
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 5000;
  return {
    server,
    gateway,
    config,
    journal,
    close: async () => {
      clearInterval(reaper);
      await Promise.allSettled(
        [...gateway.sessions.values()].map((s) => gateway.logout(s)),
      );
      await Promise.allSettled([...gateway.pendingLogouts]);
      await new Promise((r) => server.close(r));
      journal.close();
    },
  };
}
if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  if (!process.env.CRP_FAMILY_CONFIG)
    throw Error(
      "Set CRP_FAMILY_CONFIG to the protected configuration file. See README.md.",
    );
  const config = JSON.parse(
      readFileSync(process.env.CRP_FAMILY_CONFIG, "utf8").replace(
        /^\uFEFF/,
        "",
      ),
    ),
    app = createPortal(config);
  app.server.listen(app.config.port, app.config.listenHost, () =>
    process.stdout.write(
      `CRP Family Admin listening on ${app.config.origin}\n`,
    ),
  );
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () => app.close().then(() => process.exit(0)));
}
