export function buildEmailWebLink(
  provider: 'gmail' | 'outlook' | string,
  providerMsgId: string
): string {
  if (provider === 'outlook') {
    return `https://outlook.live.com/mail/0/inbox/id/${encodeURIComponent(providerMsgId)}`;
  }
  // Default to Gmail
  return `https://mail.google.com/mail/u/0/#inbox/${providerMsgId}`;
}
