import { reads, actions } from "./catalog.mjs";
export function configuration(raw) {
  if (!["local", "staging", "production"].includes(raw.environment))
    throw Error("ENVIRONMENT_REQUIRED");
  if (raw.listenHost && !["127.0.0.1", "::1"].includes(raw.listenHost))
    throw Error("LOOPBACK_LISTENER_REQUIRED");
  const env = raw.environment,
    origin = new URL(raw.origin);
  if (
    origin.origin !== raw.origin ||
    origin.username ||
    origin.password ||
    (origin.protocol !== "https:" &&
      !(
        env === "local" &&
        origin.protocol === "http:" &&
        ["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname)
      ))
  )
    throw Error("INVALID_PORTAL_ORIGIN");
  const names = {
    staging: {
      crp: "staging.creditregulatorpro.com",
      affiliate: "affiliates-staging.creditregulatorpro.com",
      mail: "mail-staging.creditregulatorpro.com",
    },
    production: {
      crp: "creditregulatorpro.com",
      affiliate: "affiliates.creditregulatorpro.com",
      mail: "mail.creditregulatorpro.com",
    },
  };
  const upstreams = {};
  for (const app of Object.keys(reads)) {
    const value = raw.upstreams?.[app];
    if (!value) {
      upstreams[app] = null;
      continue;
    }
    const url = new URL(value);
    if (
      url.origin !== value ||
      url.username ||
      url.password ||
      url.origin === origin.origin
    )
      throw Error("INVALID_UPSTREAM");
    if (env === "local") {
      if (
        url.protocol !== "http:" ||
        !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
      )
        throw Error("LOCAL_UPSTREAM_REQUIRED");
    } else if (
      url.protocol !== "https:" ||
      url.hostname !== names[env][app] ||
      url.port
    )
      throw Error("ENVIRONMENT_UPSTREAM_MISMATCH");
    upstreams[app] = url.origin;
  }
  const bindings = structuredClone(raw.bindings || {});
  let affiliateLogin;
  if (raw.affiliateLogin) {
    const value = raw.affiliateLogin;
    const issuers = {
      staging: "https://gorgeous-monkfish-8241.clerk.accounts.dev",
      production: "https://clerk.affiliates.creditregulatorpro.com",
    };
    if (env === "local" || value.issuer !== issuers[env] ||
        typeof value.clientId !== "string" || !/^[A-Za-z0-9_-]{8,128}$/.test(value.clientId) ||
        typeof value.clientSecret !== "string" || value.clientSecret.length < 16 || value.clientSecret.length > 4096)
      throw Error("AFFILIATE_IDENTITY_CONFIGURATION_INVALID");
    affiliateLogin = { issuer: value.issuer, clientId: value.clientId, clientSecret: value.clientSecret };
  }
  for (const [subject, apps] of Object.entries(bindings)) {
    if (!/^acc_[a-f0-9]{24}$/.test(subject))
      throw Error("INVALID_CRP_ACCOUNT_BINDING");
    for (const [app, b] of Object.entries(apps)) {
      if (
        !["affiliate", "mail"].includes(app) ||
        !Array.isArray(b.permissions) ||
        !b.permissions.length ||
        b.permissions.some(
          (p) =>
            !Object.values({ ...reads[app], ...actions[app] }).some(
              (x) => x.permission === p,
            ),
        )
      )
        throw Error("INVALID_BOUND_PERMISSION");
      if (
        app === "affiliate" &&
        (typeof b.subject !== "string" ||
          !b.subject ||
          !Array.isArray(b.roles) ||
          b.roles.some(
            (x) => !["owner", "agent", "operator", "analyst"].includes(x),
          ))
      )
        throw Error("AFFILIATE_SUBJECT_REQUIRED");
      if (
        app === "mail" &&
        (!["admin", "operator"].includes(b.role) ||
          (b.role === "operator" &&
            (typeof b.memberId !== "string" || !b.memberId)))
      )
        throw Error("MAIL_DESIGNATION_REQUIRED");
    }
  }
  if (
    raw.listenPort !== undefined &&
    (!Number.isInteger(raw.listenPort) ||
      raw.listenPort < (env === "local" ? 0 : 1) ||
      raw.listenPort > 65535)
  )
    throw Error("INVALID_LISTEN_PORT");
  return {
    environment: env,
    demo: env === "local" && raw.demo === true,
    origin: origin.origin,
    host: origin.host,
    upstreams,
    bindings,
    affiliateLogin,
    auditDirectory: raw.auditDirectory,
    secure: origin.protocol === "https:",
    port:
      raw.listenPort ?? Number(origin.port || (env === "local" ? 4395 : 4395)),
    listenHost: raw.listenHost || "127.0.0.1",
  };
}
