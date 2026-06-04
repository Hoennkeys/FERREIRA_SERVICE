import { getGlobalStartContext } from "@tanstack/react-start";

import { getClientIpFromRequest } from "./client-ip.server";

export type ServerRequestContext = {
  clientIp: string;
};

export function getRequestClientIp(): string {
  const ctx = getGlobalStartContext() as ServerRequestContext | undefined;
  return ctx?.clientIp ?? "unknown";
}

export { getClientIpFromRequest };
