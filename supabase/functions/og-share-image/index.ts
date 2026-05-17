import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate an SVG-based OG image for share cards
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const score = url.searchParams.get("score") || "92";
  const job = url.searchParams.get("job") || "Software Engineer";
  const company = url.searchParams.get("company") || "";

  // Color based on score
  const scoreNum = parseInt(score);
  const color = scoreNum >= 80 ? "#00FF9D" : scoreNum >= 60 ? "#F59E0B" : "#EF4444";

  // Truncate long titles
  const jobTitle = job.length > 35 ? job.slice(0, 35) + "..." : job;
  const companyName = company.length > 25 ? company.slice(0, 25) + "..." : company;

  const svg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0A0E1A"/>
      <stop offset="100%" style="stop-color:#131B2E"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Score circle -->
  <circle cx="600" cy="250" r="100" fill="none" stroke="#2A3A5C" stroke-width="12"/>
  <circle cx="600" cy="250" r="100" fill="none" stroke="${color}" stroke-width="12"
    stroke-dasharray="${2 * Math.PI * 100}"
    stroke-dashoffset="${2 * Math.PI * 100 * (1 - scoreNum / 100)}"
    stroke-linecap="round"
    transform="rotate(-90 600 250)"/>

  <!-- Score text -->
  <text x="600" y="265" text-anchor="middle" font-family="Arial, sans-serif" font-size="64" font-weight="bold" fill="${color}">${score}%</text>

  <!-- Label above -->
  <text x="600" y="120" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#9CA3AF" direction="rtl">ציון התאמה AI</text>

  <!-- Job title -->
  <text x="600" y="420" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="#FFFFFF">${escapeXml(jobTitle)}</text>

  <!-- Company -->
  ${companyName ? `<text x="600" y="465" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#9CA3AF">${escapeXml(companyName)}</text>` : ""}

  <!-- PLUG branding -->
  <text x="600" y="570" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#00FF9D">PLUG — AI Career Network</text>
  <text x="600" y="600" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#6B7280">plug-hr.com</text>
</svg>`;

  return new Response(svg, {
    headers: {
      ...corsHeaders,
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400",
    },
  });
});

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
