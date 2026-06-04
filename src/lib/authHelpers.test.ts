import { afterEach, describe, expect, it, vi } from "vitest";
import { isValidPolishPhone, normalizePhone, phoneToAuthEmail } from "./authHelpers";

describe("phone auth helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    ["500600700", "500600700"],
    ["500 600 700", "500600700"],
    ["+48 500 600 700", "500600700"],
    ["(500)-600-700", "500600700"]
  ])("normalizes %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
    expect(isValidPolishPhone(input)).toBe(true);
    expect(phoneToAuthEmail(input)).toBe(`${expected}@app.local`);
  });

  it("uses the configured technical email domain", () => {
    vi.stubEnv("VITE_AUTH_EMAIL_DOMAIN", "auth.kroll.pl");

    expect(phoneToAuthEmail("500 600 700")).toBe("500600700@auth.kroll.pl");
  });

  it.each(["", "123", "4850060070", "+49 500 600 700", "5006007000"])(
    "rejects invalid phone %s",
    (input) => {
      expect(isValidPolishPhone(input)).toBe(false);
    }
  );
});
