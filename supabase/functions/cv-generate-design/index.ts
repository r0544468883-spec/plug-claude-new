import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, cvData, style, mode } = await req.json();
    // mode: 'create' (default) | 'modify' (apply changes to existing HTML)

    const CLAUDE_API_KEY = Deno.env.get("CLAUDE_API_KEY");
    if (!CLAUDE_API_KEY) {
      console.error("CLAUDE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`CV design mode: ${mode || 'create'}`);

    // Three system prompts for different modes
    // modify_css: most reliable for visual changes — only patches the CSS block
    const modifyCssSystemPrompt = `You are an expert CSS developer specializing in CV/resume styling.
The user will provide the EXISTING CSS of a CV design and a visual change request.
Your job is to return the COMPLETE updated CSS with the change applied.

RULES:
1. Return ONLY the CSS content (no <style> tags, no HTML, no markdown, no explanations)
2. Preserve ALL existing CSS rules — only add/modify what is needed for the requested change
3. For background effects (bubbles, patterns, shapes): use body::before or html::before pseudo-elements with position:fixed OR add decorative elements to existing selectors
4. For "bubbles" background: use body::before with radial-gradient circles or CSS box-shadow trick
5. For color changes: find and update the relevant CSS variables or color values
6. Do NOT use position:fixed on any layout elements — only decorative pseudo-elements may use it
7. The output must be valid CSS that can be dropped into a <style> tag`;

    const createSystemPrompt = `You are a world-class CV/resume designer who creates stunning, Canva-quality resume designs. Generate ONLY valid HTML code for a printable A4 resume.

DESIGN PHILOSOPHY — Think Canva, Behance, Dribbble quality:
• Bold, striking visual hierarchy — the name/header must POP immediately
• Rich use of the accent color: colored header band, colored section titles, colored dividers
• Two-column layouts where sidebar holds contact/skills and main column holds experience/education
• Card-style sections with subtle borders or background tints (rgba fills)
• Skill tags as styled <span> badges with border-radius: 4px and padding
• Clean typography using Google Fonts (import via @import in CSS)
• Generous white space — never cramped, always breathable
• Section icons using Unicode symbols (📧 ✆ 📍 or elegant CSS shapes) OR simple SVG-like borders
• Horizontal rule accents: colored 3px lines under section headings
• Page background: white or very light gray (#f8f9fa)

ABSOLUTE RULES:
1. Return ONLY the HTML code starting with <!DOCTYPE html> and ending with </html>
2. Include ALL CSS in a <style> tag in the <head>
3. Import a Google Font at the top of <style>: e.g. @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&family=Montserrat:wght@700;800&display=swap');
4. Do NOT include any markdown, explanations, or code blocks — ONLY pure HTML
5. A4 size exactly: width 210mm, min-height 297mm
6. Body/html: margin:0; padding:0; font-size:11px; line-height:1.6; color:#1a1a2e;
7. ZERO horizontal scrollbar — content must fit within 210mm
8. Print-safe: no JavaScript, no external images (background patterns via CSS only)

LAYOUT STRUCTURE — Choose ONE based on style:
- professional/modern: Two-column (left sidebar 30% for photo/contact/skills, right main 70% for experience/education)
- creative: Bold colored top header band (full-width, accent-color background) + single column below
- minimal: Clean single column with elegant thin borders and lots of breathing room

HEADER DESIGN:
• Full name: font-size 26-32px, font-weight 800, letter-spacing -0.5px, accent color or white-on-accent
• Job title: font-size 14px, font-weight 300, slightly muted
• Contact row: small icons + text inline, separated by thin dots or pipes

SECTION HEADINGS:
• ALL CAPS or Title Case, font-size 10px, letter-spacing 2px, font-weight 700
• Accent-colored OR with a 3px solid accent-color left border (border-left) + padding-left 8px
• margin-bottom 12px, margin-top 20px

EXPERIENCE ITEMS:
• Company + Role: clear hierarchy (role bold 12px, company 11px muted)
• Date on right side (flex justify-between)
• Bullet points: margin-left 16px, each bullet margin-bottom 4px
• subtle bottom border or spacing between items

SKILLS:
• Badge style: background: rgba(accent, 0.1); border: 1px solid rgba(accent, 0.3); border-radius: 4px; padding: 2px 8px; font-size: 9px; display:inline-block; margin: 2px;

SPACING REQUIREMENTS:
• section-gap: 20px between sections
• item-gap: 14px between experience items
• line-height: 1.6 for all body text
• Padding inside containers: minimum 16px

DO NOT use: position:fixed (use position:relative or normal flow only)`;

    const systemPrompt = mode === 'modify_css' ? modifyCssSystemPrompt : createSystemPrompt;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        system: systemPrompt,
        messages: [
          { role: "user", content: prompt },
        ],
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Claude API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to generate CV design" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    console.log("CV design generated successfully");

    const content = result.content?.[0]?.text || "";

    // For modify_css mode: return the raw CSS (not HTML)
    if (mode === 'modify_css') {
      let css = content;
      // Strip markdown code blocks if present
      css = css.replace(/```css\n?/g, "").replace(/```\n?/g, "").trim();
      return new Response(
        JSON.stringify({ success: true, css }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For create mode: clean up and validate HTML
    let html = content;
    if (html.includes("```html")) {
      html = html.replace(/```html\n?/g, "").replace(/```\n?/g, "");
    } else if (html.includes("```")) {
      html = html.replace(/```\n?/g, "");
    }
    html = html.trim();

    if (!html.includes("<!DOCTYPE") && !html.includes("<html")) {
      console.error("Response doesn't contain valid HTML:", html.substring(0, 200));
      return new Response(
        JSON.stringify({ error: "AI did not return valid HTML. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        html: html,
        css: "",
        metadata: { style: style || "professional" },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("CV design generation error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate CV design. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
