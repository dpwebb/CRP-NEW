import { fixtures } from "./fixtures.mjs";
const app = await fixtures({ port: Number(process.env.PORT || 4396) });
console.log("FICTIONAL LOCAL PREVIEW: " + app.base);
console.log(
  "CRP login: owner@example.test / fictional-password / 123456; admin unlock: 654321.",
);
console.log(
  "Affiliate fixture access token: fixture-affiliate-bearer-only; Mail fixture code: " +
    "a".repeat(48),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => app.close().then(() => process.exit(0)));
