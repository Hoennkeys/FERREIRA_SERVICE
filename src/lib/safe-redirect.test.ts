import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_AUTH_REDIRECT,
  sanitizeRedirectPath,
} from "./safe-redirect.ts";

describe("sanitizeRedirectPath", () => {
  it("returns default for empty or external URLs", () => {
    assert.equal(sanitizeRedirectPath(undefined), DEFAULT_AUTH_REDIRECT);
    assert.equal(sanitizeRedirectPath(""), DEFAULT_AUTH_REDIRECT);
    assert.equal(
      sanitizeRedirectPath("https://evil.com"),
      DEFAULT_AUTH_REDIRECT,
    );
    assert.equal(sanitizeRedirectPath("//evil.com"), DEFAULT_AUTH_REDIRECT);
  });

  it("allows /dispatch and subpaths only", () => {
    assert.equal(sanitizeRedirectPath("/dispatch"), "/dispatch");
    assert.equal(
      sanitizeRedirectPath("/dispatch/agenda"),
      "/dispatch/agenda",
    );
    assert.equal(sanitizeRedirectPath("/login"), DEFAULT_AUTH_REDIRECT);
    assert.equal(sanitizeRedirectPath("/"), DEFAULT_AUTH_REDIRECT);
  });

  it("blocks encoded and scheme tricks", () => {
    assert.equal(
      sanitizeRedirectPath("/dispatch%2f%2fevil.com"),
      DEFAULT_AUTH_REDIRECT,
    );
    assert.equal(
      sanitizeRedirectPath("/javascript:alert(1)"),
      DEFAULT_AUTH_REDIRECT,
    );
  });
});
