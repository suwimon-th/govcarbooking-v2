// https://developers.line.biz/en/reference/line-login/#verify-access-token
export async function verifiedLineProfile(accessToken: unknown): Promise<{ userId: string; pictureUrl?: string } | null> {
  if (typeof accessToken !== "string" || !accessToken) return null;
  const testLiffId = process.env.NODE_ENV === 'development' ? process.env.NEXT_PUBLIC_LINE_LIFF_ID_DRIVER_TEST : undefined;
  const channelId = testLiffId?.split('-')[0] || process.env.LINE_LOGIN_CHANNEL_ID || process.env.NEXT_PUBLIC_LINE_LIFF_ID_DRIVER?.split("-")[0];
  if (!channelId) throw new Error("LINE Login channel is not configured");
  const verified = await fetch(`https://api.line.me/oauth2/v2.1/verify?access_token=${encodeURIComponent(accessToken)}`, { cache: "no-store" });
  if (!verified.ok) return null;
  const token = await verified.json();
  if (token.client_id !== channelId || !(token.expires_in > 0)) return null;
  const response = await fetch("https://api.line.me/v2/profile", { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  if (!response.ok) return null;
  const profile = await response.json();
  return typeof profile.userId === "string" && profile.userId ? profile : null;
}
