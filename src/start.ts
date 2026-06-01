import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    // #region agent log
    const errMsg = String(error);
    const errStack = (error instanceof Error && error.stack) ? error.stack : errMsg;
    return new Response(
      `<!DOCTYPE html><html><body><h1>SSR Error [debug-7b787a]</h1><pre style="white-space:pre-wrap;word-break:break-all">${errStack}</pre></body></html>`,
      { status: 500, headers: { "content-type": "text/html; charset=utf-8" } }
    );
    // #endregion
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware],
}));
