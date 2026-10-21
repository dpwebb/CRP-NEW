"use strict";
const $ = (id) => document.getElementById(id),
  S = {
    session: null,
    csrf: null,
    view: "overview",
    page: 1,
    query: "",
    generation: 0,
    dialog: null,
  };
const labels = {
  crp: "CRP Consumer",
  affiliate: "Affiliate Program",
  mail: "Mail Operations",
};
const pages = {
  overview: {
    label: "Family overview",
    icon: "◫",
    description: "A clear view across your three applications.",
  },
  accounts: {
    label: "Consumer accounts",
    app: "crp",
    resource: "accounts",
    icon: "♙",
  },
  cases: { label: "Cases & packets", app: "crp", resource: "cases", icon: "▤" },
  billing: {
    label: "Consumer billing",
    app: "crp",
    resource: "billing",
    icon: "▣",
  },
  organizations: {
    label: "Organizations",
    app: "crp",
    resource: "organizations",
    icon: "▦",
  },
  campaigns: {
    label: "Campaigns",
    app: "affiliate",
    resource: "campaigns",
    icon: "↗",
  },
  holds: {
    label: "Commission holds",
    app: "affiliate",
    resource: "holds",
    icon: "◷",
  },
  partners: {
    label: "Partners",
    app: "affiliate",
    resource: "partners",
    icon: "♧",
  },
  commissions: {
    label: "Commissions",
    app: "affiliate",
    resource: "commissions",
    icon: "↗",
  },
  proposals: {
    label: "Payout review",
    app: "affiliate",
    resource: "proposals",
    icon: "▣",
  },
  orders: {
    label: "Mailing orders",
    app: "mail",
    resource: "orders",
    icon: "✉",
  },
  pricing: {
    label: "Mailing prices",
    app: "mail",
    resource: "pricing",
    icon: "≡",
  },
  routes: {
    label: "Mailing routes",
    app: "mail",
    resource: "routes",
    icon: "⌁",
  },
  team: { label: "Team & access", icon: "♙" },
  activity: { label: "Activity log", icon: "◷" },
};
function el(tag, text, cls) {
  const n = document.createElement(tag);
  if (text !== undefined && text !== null) n.textContent = String(text);
  if (cls) n.className = cls;
  return n;
}
function btn(text, fn, cls) {
  const b = el("button", text, cls);
  b.type = "button";
  b.addEventListener("click", fn);
  return b;
}
function human(s) {
  return String(s || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_:.]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
function notice(text) {
  $("notice").textContent = text || "";
}
async function api(path, { method = "GET", body } = {}) {
  const r = await fetch(path, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      ...(method !== "GET" ? { "x-csrf-token": S.csrf || "" } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data;
  try {
    data = await r.json();
  } catch {
    throw Error("The workspace returned an unreadable response.");
  }
  if (!r.ok) {
    const e = Object.assign(
      Error(data.error?.message || "This request could not be completed."),
      { code: data.error?.code, status: r.status },
    );
    if (["SESSION_REQUIRED", "ADMIN_UNLOCK_REQUIRED"].includes(e.code))
      showLogin(e.message);
    throw e;
  }
  return data;
}
function showLogin(error = "") {
  S.session = null;
  S.csrf = null;
  S.generation++;
  $("workspace").hidden = true;
  $("auth").hidden = false;
  $("login").hidden = false;
  $("unlock").hidden = true;
  $("auth-error").textContent = error;
  $("content").replaceChildren();
  if ($("dialog").open) $("dialog").close();
  document.body.classList.remove("nav-open");
}
function unlocked(session) {
  S.session = session;
  S.csrf = session.csrf;
  $("auth").hidden = true;
  $("workspace").hidden = false;
  $("environment").textContent = session.environment.toUpperCase();
  $("environment").classList.toggle(
    "production",
    session.environment === "production",
  );
  $("who").textContent = session.email || session.role;
  $("demo-banner").hidden = !session.demo;
  renderNav();
  navigate(S.view);
}
function renderNav() {
  const nav = $("nav");
  nav.replaceChildren();
  for (const [group, ids] of [
    ["Workspace", ["overview"]],
    ["CRP", ["accounts", "cases", "billing", "organizations"]],
    [
      "Affiliate",
      ["partners", "campaigns", "commissions", "holds", "proposals"],
    ],
    ["Mail Operations", ["orders", "pricing", "routes"]],
    ["Administration", ["team", "activity"]],
  ]) {
    nav.append(el("div", group, "nav-label"));
    for (const id of ids) {
      const p = pages[id];
      if (p.app && !S.session.catalog.reads[p.app].includes(p.resource))
        continue;
      if (id === "activity" && !S.session.permissions.includes("audit.read"))
        continue;
      const a = el("a");
      a.href = "#" + id;
      a.append(el("span", p.icon), el("span", p.label));
      a.dataset.view = id;
      a.addEventListener("click", (e) => {
        e.preventDefault();
        navigate(id);
      });
      nav.append(a);
    }
  }
}
function navigate(view) {
  if (!pages[view]) view = "overview";
  S.view = view;
  notice("");
  window.scrollTo({ top: 0, behavior: "instant" });
  S.page = 1;
  S.query = "";
  document.body.classList.remove("nav-open");
  $("menu").setAttribute("aria-expanded", "false");
  load();
}
function empty(text, button) {
  const box = el("div", null, "panel empty");
  box.append(el("h3", "Nothing to show yet"), el("p", text));
  if (button) box.append(button);
  return box;
}
function dialog(title, description, fields, submit, submitText = "Confirm") {
  $("dialog-title").textContent = title;
  $("dialog-description").textContent = description;
  $("dialog-error").textContent = "";
  $("dialog-fields").replaceChildren();
  $("dialog-submit").textContent = submitText;
  $("dialog-submit").hidden = !submit;
  const nodes = new Map();
  for (const f of fields) {
    const l = el("label", f.label);
    let input;
    if (f.type?.startsWith("select:")) {
      input = el("select");
      for (const option of f.type.slice(7).split(",")) {
        const o = el("option", human(option));
        o.value = option;
        input.append(o);
      }
    } else if (f.type === "textarea" || f.type === "array")
      input = el("textarea");
    else {
      input = el("input");
      input.type =
        f.type === "boolean"
          ? "checkbox"
          : f.type === "number"
            ? "number"
            : f.type === "password"
              ? "password"
              : "text";
    }
    input.name = f.name;
    if (input.type !== "checkbox") input.required = !!f.required;
    if (input.tagName === "INPUT" && input.type === "number") {
      input.min = "0";
      input.max = "10000000";
      input.step = "1";
    }
    if (f.type === "password") {
      input.autocomplete = "off";
      input.spellcheck = false;
    } else if (f.type !== "boolean") input.value = f.value ?? "";
    else input.checked = !!f.value;
    if (f.type === "array") input.placeholder = "One permission per line";
    l.append(input);
    $("dialog-fields").append(l);
    nodes.set(f.name, { input, f });
  }
  S.dialog = { submit, nodes, generation: S.generation };
  // Replacing an open dialog must not enqueue a close event that clears the
  // replacement's fields and submit handler on the next browser task.
  if (!$("dialog").open) $("dialog").showModal();
  $("dialog-close").focus();
}
function closeDialog() {
  $("dialog").close();
  S.dialog = null;
  $("dialog-fields").replaceChildren();
}
$("dialog-close").onclick = closeDialog;
$("dialog-cancel").onclick = closeDialog;
$("dialog").addEventListener("close", () => {
  $("dialog-fields").replaceChildren();
  S.dialog = null;
});
$("dialog-form").onsubmit = async (e) => {
  e.preventDefault();
  const d = S.dialog;
  if (!d?.submit) return;
  const values = {};
  for (const [name, { input, f }] of d.nodes) {
    values[name] =
      f.type === "boolean"
        ? input.checked
        : f.type === "number"
          ? Number(input.value)
          : f.type === "array"
            ? input.value
                .split(/[\n,]/)
                .map((x) => x.trim())
                .filter(Boolean)
            : input.value.trim();
  }
  const button = $("dialog-submit");
  button.disabled = true;
  try {
    await d.submit(values);
    if (d.generation !== S.generation) return;
    closeDialog();
    await load();
  } catch (error) {
    if (d.generation === S.generation && $("dialog").open)
      $("dialog-error").textContent = error.message;
  } finally {
    button.disabled = false;
    for (const { input, f } of d.nodes.values())
      if (f.type === "password") input.value = "";
  }
};
function confirmAction(app, name, id) {
  const action = S.session.catalog.actions[app]?.[name];
  if (!action) return;
  const fields = [
    ...(action.needsId
      ? [
          {
            name: "recordId",
            label: "Record ID",
            value: id || "",
            required: true,
          },
        ]
      : []),
    ...action.fields,
    ...(action.requiresStepUp
      ? [
          {
            name: "freshCode",
            label: "Fresh authenticator code",
            type: "password",
            required: true,
          },
        ]
      : []),
    {
      name: "confirmText",
      label: `Type ${S.session.environment}:${app}:${name} to confirm`,
      required: true,
    },
  ];
  const key = crypto.randomUUID();
  dialog(
    action.label,
    `${labels[app]} · ${S.session.environment.toUpperCase()}. The originating application checks access and validates this change. Refresh the record if its result is uncertain.`,
    fields,
    async (values) => {
      const { recordId, freshCode, confirmText, ...body } = values;
      if (action.requiresStepUp)
        await api("/api/unlock", { method: "POST", body: { code: freshCode } });
      const result = await api("/api/actions/" + app + "/" + name, {
        method: "POST",
        body: { id: recordId, body, requestId: key, confirmation: confirmText },
      });
      notice(
        result.status === "APPLIED"
          ? "Change recorded."
          : "This request was already submitted. Refresh the application record; it was not sent again.",
      );
    },
    "Confirm change",
  );
}
function actionButtons(app, resource) {
  const box = el("div", null, "buttons"),
    list = S.session.catalog.actions[app] || {};
  const prefixes =
    {
      accounts: [],
      cases: [],
      billing: [],
      team: ["team."],
      organizations: ["organization."],
      partners: ["partner.", "campaign."],
      commissions: ["hold."],
      holds: ["hold."],
      proposals: ["proposal."],
      orders: ["note.", "order."],
      pricing: ["pricing."],
      routes: [],
    }[resource] || [];
  for (const [name, action] of Object.entries(list))
    if (prefixes.some((prefix) => name.startsWith(prefix)))
      box.append(btn(action.label, () => confirmAction(app, name)));
  return box;
}
function items(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.orders)) return value.orders;
  return null;
}
function showDetails(app, row) {
  dialog(
    "Record details",
    `${labels[app]}. Fields shown are supplied by that application.`,
    [],
    null,
  );
  $("dialog-fields").append(el("pre", JSON.stringify(row, null, 2)));
  const id = row.id || row.orderId || row.admin_id || row.org_id;
  const actions = el("div", null, "record-actions");
  if (app === "mail" && id)
    actions.append(
      btn("Open full order", async () => {
        try {
          const result = await api(
            "/api/apps/mail/order?id=" + encodeURIComponent(id),
          );
          showDetails(app, result.data);
        } catch (e) {
          $("dialog-error").textContent = e.message;
        }
      }),
    );
  if (app === "affiliate" && S.view === "proposals" && id)
    actions.append(
      btn("Review payout export", async () => {
        try {
          const result = await api(
            "/api/apps/affiliate/proposal?id=" + encodeURIComponent(id),
          );
          showDetails(app, result.data);
        } catch (e) {
          $("dialog-error").textContent = e.message;
        }
      }),
    );
  for (const [name, action] of Object.entries(
    S.session.catalog.actions[app] || {},
  ))
    if (
      action.needsId &&
      id &&
      (
        {
          partners: ["partner.activate"],
          orders: ["note.add", "order.cancel", "order.assign", "order.refund"],
          team: ["team.update", "team.revoke"],
          organizations: ["organization.update"],
        }[S.view] || []
      ).includes(name)
    )
      actions.append(btn(action.label, () => confirmAction(app, name, id)));
  $("dialog-fields").append(actions);
}
function table(app, rows) {
  if (!rows.length) return empty("No records were returned for this view.");
  const wrap = el("div", null, "table-wrap"),
    t = el("table"),
    head = el("thead"),
    tr = el("tr");
  const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))]
    .filter(
      (k) =>
        ![
          "snapshot_json",
          "metadata",
          "details",
          "scope",
          "permissions",
          "packet",
        ].includes(k),
    )
    .slice(0, 7);
  for (const key of keys)
    tr.append(el("th", human(key.replace(/_?minor$/i, ""))));
  tr.append(el("th", "Details"));
  head.append(tr);
  t.append(head);
  const body = el("tbody");
  for (const row of rows) {
    const line = el("tr");
    for (const key of keys) {
      let value = row[key];
      const td = el("td");
      if (value === null || value === undefined) td.textContent = "—";
      else if (typeof value === "object")
        td.textContent = Array.isArray(value)
          ? value.join(", ")
          : "View details";
      else if (/status|state|role/.test(key))
        td.append(el("span", human(value), "badge"));
      else if (
        /(?:amount|delta|paid|price).*minor|minor$/i.test(key) &&
        row.currency &&
        Number.isSafeInteger(value)
      ) {
        try {
          td.textContent = new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: String(row.currency).toUpperCase(),
          }).format(value / 100);
        } catch {
          td.textContent = String(value);
        }
      } else td.textContent = String(value);
      line.append(td);
    }
    const td = el("td");
    td.append(btn("View", () => showDetails(app, row)));
    line.append(td);
    body.append(line);
  }
  t.append(body);
  wrap.append(t);
  return wrap;
}
async function appView(app, resource, root, generation) {
  if (!S.session.applications[app].linked) {
    root.append(
      empty(
        `Your ${labels[app]} access is not linked to this session.`,
        btn("Connect application", () => connectDialog(app), "primary"),
      ),
    );
    return;
  }
  const toolbar = el("div", null, "toolbar");
  const fields =
    ["crp", "mail"].includes(app) &&
    !["overview", "pricing", "routes", "team"].includes(resource);
  if (fields) {
    const input = el("input");
    input.type = "search";
    input.placeholder = "Search records";
    input.setAttribute("aria-label", "Search records");
    input.value = S.query;
    const form = el("form");
    form.append(input);
    form.onsubmit = (e) => {
      e.preventDefault();
      S.query = input.value.trim();
      S.page = 1;
      load();
    };
    toolbar.append(form);
  }
  toolbar.append(actionButtons(app, resource));
  root.append(toolbar);
  const params = new URLSearchParams();
  if (app === "crp" && !["overview"].includes(resource)) {
    params.set("page", S.page);
    params.set("page_size", "25");
    if (S.query) params.set("q", S.query);
  }
  if (app === "mail" && resource === "orders") {
    params.set("page", S.page);
    if (S.query) params.set("search", S.query);
  }
  const result = await api(
    "/api/apps/" + app + "/" + resource + (params.size ? "?" + params : ""),
  );
  if (generation !== S.generation) return;
  const rows = items(result.data);
  if (rows) root.append(table(app, rows));
  else root.append(el("pre", JSON.stringify(result.data, null, 2)));
  if (result.data?.totals)
    root.append(
      el(
        "p",
        "Verified totals by currency: " +
          result.data.totals
            .map(
              (x) =>
                `${x.currency} ${x.verified_paid_minor} minor units (${x.purchase_count} purchases)`,
            )
            .join(" · "),
        "table-hint",
      ),
    );
  if (app === "affiliate")
    root.append(
      el(
        "p",
        "This is the originating application’s current list.",
        "table-hint",
      ),
    );
  if (app === "mail" && resource === "routes")
    root.append(
      el(
        "p",
        "Route and provider changes remain in the Mail Operations workspace. Open that application to review postal evidence and customer approval.",
        "table-hint",
      ),
    );
  const total = result.data?.total;
  if (Number.isFinite(total)) {
    const size = app === "mail" ? 20 : 25,
      pager = el("div", null, "pager"),
      prev = btn("Previous", () => {
        S.page--;
        load();
      }),
      next = btn("Next", () => {
        S.page++;
        load();
      });
    prev.disabled = S.page <= 1;
    next.disabled = S.page * size >= total;
    pager.append(prev, el("span", `Page ${S.page} · ${total} records`), next);
    root.append(pager);
  }
  $("observed").textContent =
    "Checked " + new Date(result.observedAt).toLocaleTimeString();
}
function numeric(value, depth = 0) {
  if (depth > 2 || !value || typeof value !== "object") return [];
  return Object.entries(value)
    .flatMap(([k, v]) =>
      typeof v === "number" && Number.isFinite(v)
        ? [{ key: k, value: v }]
        : typeof v === "object" && !Array.isArray(v)
          ? numeric(v, depth + 1)
          : [],
    )
    .filter(
      (x) =>
        !/minor|amount|price|revision|budget|time|date|enabled|seconds|rate/i.test(
          x.key,
        ),
    )
    .slice(0, 4);
}
async function overview(root, generation) {
  const cards = el("div", null, "cards");
  root.append(cards);
  for (const [app, description, icon] of [
    ["crp", "Consumer accounts, cases and approved packets.", "▤"],
    ["affiliate", "Partners, attributed sales and commissions.", "↗"],
    [
      "mail",
      "Mailing orders, staff assignments and delivery exceptions.",
      "✉",
    ],
  ]) {
    const status = S.session.applications[app],
      card = el("article", null, "card");
    card.append(
      el("div", icon, "app-icon"),
      el("h2", labels[app]),
      el("p", description, "muted"),
    );
    const badge = el(
      "span",
      status.linked
        ? "Checking access…"
        : status.configured
          ? "Not linked"
          : "Not configured",
      "badge",
    );
    card.append(badge);
    const metrics = el("div", null, "metrics");
    card.append(metrics);
    if (!status.linked) {
      card.append(btn("Connect access", () => connectDialog(app)));
    } else if (!S.session.catalog.reads[app].includes("overview"))
      badge.textContent = "Overview not permitted";
    else {
      api("/api/apps/" + app + "/overview")
        .then((result) => {
          if (generation !== S.generation) return;
          badge.textContent = "Access verified";
          badge.className = "badge ok";
          for (const item of numeric(result.data)) {
            const m = el("div", null, "metric");
            m.append(
              el("strong", new Intl.NumberFormat().format(item.value)),
              el("small", human(item.key)),
            );
            metrics.append(m);
          }
          if (!metrics.children.length)
            metrics.append(
              el("small", "Open application for operational details."),
            );
        })
        .catch((error) => {
          if (generation !== S.generation) return;
          badge.textContent = "Unavailable";
          badge.className = "badge warn";
          card.append(el("p", error.message, "muted"));
        });
    }
    if (S.session.demo) {
      card.append(
        btn("View records →", () =>
          navigate(
            { crp: "accounts", affiliate: "partners", mail: "orders" }[app],
          ),
        ),
      );
    } else if (status.url) {
      const a = el("a", "Open workspace →");
      a.href = status.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      card.append(a);
    }
    cards.append(card);
  }
  const title = el("div", null, "section-title");
  title.append(el("h2", "Work that needs a clear decision"));
  root.append(title);
  const grid = el("div", null, "panel-grid");
  for (const [heading, text] of [
    [
      "Financial review",
      "Review verified sales, commission movements and prepared payouts in their own currencies. Payout exports continue through the existing external human release process.",
    ],
    [
      "Mailing oversight",
      "Review orders, assigned staff and delivery exceptions. Mailing status and customer approval remain authoritative in Mail Operations.",
    ],
  ]) {
    const panel = el("article", null, "panel");
    panel.append(el("h3", heading), el("p", text, "muted"));
    grid.append(panel);
  }
  root.append(grid);
}
async function load() {
  if (!S.session) return;
  const generation = ++S.generation,
    view = pages[S.view];
  $("title").textContent = view.label;
  $("crumb").textContent = view.label;
  $("eyebrow").textContent = view.app
    ? labels[view.app].toUpperCase()
    : "YOUR CONNECTED WORKSPACE";
  $("description").textContent =
    view.description ||
    "Review current records and the actions your role allows.";
  for (const a of $("nav").querySelectorAll("a"))
    a.classList.toggle("active", a.dataset.view === S.view);
  const root = $("content");
  root.replaceChildren();
  root.setAttribute("aria-busy", "true");
  try {
    if (S.view === "overview") await overview(root, generation);
    else if (S.view === "team") {
      for (const app of ["crp", "affiliate", "mail"]) {
        if (!S.session.catalog.reads[app].includes("team")) continue;
        const section = el("section", null, "panel");
        section.append(el("h2", labels[app]));
        root.append(section);
        try {
          await appView(app, "team", section, generation);
        } catch (error) {
          if (generation === S.generation)
            section.append(el("p", error.message, "error"));
        }
      }
    } else if (S.view === "activity") {
      const result = await api("/api/audit");
      if (generation === S.generation) root.append(table("crp", result.items));
    } else await appView(view.app, view.resource, root, generation);
  } catch (e) {
    if (generation === S.generation) root.replaceChildren(empty(e.message));
  } finally {
    if (generation === S.generation) root.setAttribute("aria-busy", "false");
  }
}
function connectDialog(app) {
  if (app === "crp") return;
  const status = S.session.applications[app];
  if (!status.bindingConfigured) {
    dialog(
      "Application access",
      "The owner must explicitly link this CRP account to an existing application membership before connection is allowed.",
      [],
      null,
    );
    return;
  }
  if (status.linked) {
    dialog(
      "Disconnect " + labels[app],
      "Disconnect the application from this family session. This does not remove the person’s application membership.",
      [],
      async () => {
        await api("/api/connections/" + app, { method: "DELETE" });
        S.session = await api("/api/session");
      },
      "Disconnect",
    );
    return;
  }
  if (app === "affiliate" && status.browserSignIn) {
    dialog("Connect Affiliate Program",
      "Sign in with your existing Affiliate account. Your current membership will be checked before connection.",
      [], async () => {
        const result = await api("/api/connections/affiliate/signin", {method:"POST",body:{}});
        location.assign(result.url);
      }, "Continue to Affiliate sign-in");
    return;
  }
  dialog(
    "Connect " + labels[app],
    app === "mail"
      ? "Use your own one-use staff access code. The existing Mail Operations role and assignment restrictions still apply."
      : "Use an access token issued by the existing Affiliate identity provider for your explicitly linked subject. It stays on the server only for this session.",
    [
      {
        name: app === "mail" ? "code" : "token",
        label:
          app === "mail"
            ? "One-use staff access code"
            : "Affiliate access token",
        type: "password",
        required: true,
      },
    ],
    async (body) => {
      await api("/api/connections/" + app, { method: "POST", body });
      S.session = await api("/api/session");
    },
    "Connect access",
  );
}
$("connections").onclick = () => {
  dialog(
    "Your application access",
    "Connections are specific to your account and this environment. Expired access must be reconnected.",
    [],
    null,
  );
  for (const app of ["crp", "affiliate", "mail"]) {
    const s = S.session.applications[app],
      section = el("section", null, "connection");
    section.append(
      el("h3", labels[app]),
      el(
        "p",
        app === "crp"
          ? "Connected through your CRP MFA session."
          : !s.configured
            ? "Application endpoint is not configured."
            : !s.bindingConfigured
              ? "Owner membership linking is required."
              : s.linked
                ? "Linked for this session. Access is rechecked on every operation."
                : "Ready to connect your existing access.",
      ),
    );
    if (app !== "crp" && s.configured && s.bindingConfigured)
      section.append(
        btn(s.linked ? "Disconnect" : "Connect", () => connectDialog(app)),
      );
    $("dialog-fields").append(section);
  }
};
$("login").onsubmit = async (e) => {
  e.preventDefault();
  const b = e.submitter;
  b.disabled = true;
  $("auth-error").textContent = "";
  const f = new FormData(e.target);
  try {
    const r = await api("/api/login", {
      method: "POST",
      body: {
        email: f.get("email"),
        password: f.get("password"),
        code: f.get("code"),
      },
    });
    S.csrf = r.csrf;
    e.target.reset();
    $("login").hidden = true;
    $("unlock").hidden = false;
    $("auth-title").textContent = "Unlock administration";
    $("auth-help").textContent =
      "Use the next current authenticator code to unlock your admin access.";
  } catch (error) {
    $("auth-error").textContent = error.message;
  } finally {
    e.target.elements.password.value = "";
    e.target.elements.code.value = "";
    b.disabled = false;
  }
};
$("unlock").onsubmit = async (e) => {
  e.preventDefault();
  e.submitter.disabled = true;
  try {
    unlocked(
      await api("/api/unlock", {
        method: "POST",
        body: { code: e.target.elements.code.value.trim() },
      }),
    );
  } catch (error) {
    $("auth-error").textContent = error.message;
  } finally {
    e.target.elements.code.value = "";
    e.submitter.disabled = false;
  }
};
$("logout").onclick = async () => {
  try {
    await api("/api/logout", { method: "POST", body: {} });
  } finally {
    showLogin();
  }
};
$("back-login").onclick = async () => {
  try {
    await api("/api/logout", { method: "POST", body: {} });
  } finally {
    showLogin();
  }
};
$("refresh").onclick = () => {
  notice("");
  load();
};
$("menu").onclick = () => {
  const open = document.body.classList.toggle("nav-open");
  $("menu").setAttribute("aria-expanded", String(open));
};
setInterval(async () => {
  if (!S.session) return;
  try {
    S.session = await api("/api/session");
  } catch (e) {
    showLogin(e.message);
  }
}, 30000);
(async () => {
  let data;
  try { data = await api("/api/session"); } catch { showLogin(); return; }
  S.csrf = data.csrf;
  let message = "";
  if (data.applications.affiliate.browserSignIn && !data.applications.affiliate.linked) {
    try {
      const result = await api("/api/connections/affiliate/finish", {method:"POST",body:{}});
      if (result.linked) data = await api("/api/session");
    } catch (e) { message = e.message; }
  }
  unlocked(data);
  if (message) notice(message);
})();
