// UDAWANY App Check — tylko do testów automatycznych (testy/e2e/uruchom.cjs).
// Flaga localStorage „falszywy-appcheck-blad” = "1" udaje odmowę wydania przepustki.
export class ReCaptchaEnterpriseProvider {
  constructor(kluczWitryny) {
    this.kluczWitryny = kluczWitryny;
  }
}

export function initializeAppCheck(app, opcje) {
  return { app, opcje, udawany: true };
}

export async function getToken() {
  let blad = false;
  try {
    blad = localStorage.getItem("falszywy-appcheck-blad") === "1";
  } catch {
    blad = false;
  }
  if (blad) {
    const e = new Error("appCheck/fetch-status-error");
    e.code = "appCheck/fetch-status-error";
    throw e;
  }
  return { token: "udawany-token-app-check" };
}

export function onTokenChanged() {
  return () => {};
}
