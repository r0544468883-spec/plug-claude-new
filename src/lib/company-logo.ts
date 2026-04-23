/**
 * Returns the best available logo URL for a company.
 * Priority: stored logo_url → Clearbit (from website) → null
 */
export function getCompanyLogoUrl(company: {
  logo_url?: string | null;
  website?: string | null;
}): string | null {
  if (company.logo_url) return company.logo_url;
  if (company.website) {
    try {
      const raw = company.website.startsWith('http')
        ? company.website
        : 'https://' + company.website;
      const domain = new URL(raw).hostname.replace(/^www\./, '');
      return `https://logo.clearbit.com/${domain}`;
    } catch {
      return null;
    }
  }
  return null;
}
