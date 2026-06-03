export type TwitchLiveStatus = {
  configured: boolean;
  isLive: boolean;
  title?: string;
  viewerCount?: number;
  error?: "missing_credentials" | "token_failed" | "api_failed";
};
