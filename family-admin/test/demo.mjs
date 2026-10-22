import { fixtures } from "./fixtures.mjs";
const app = await fixtures({ port: Number(process.env.PORT || 4396), singleSignIn: process.env.FAMILY_SSO_DEMO === '1' });
console.log("FICTIONAL LOCAL PREVIEW: " + app.base);
console.log(
  "CRP login: owner@example.test / fictional-password / 123456; admin unlock: 654321.",
);
if(process.env.FAMILY_SSO_DEMO !== '1')console.log('Legacy manual links enabled for this fictional preview.');
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => app.close().then(() => process.exit(0)));
