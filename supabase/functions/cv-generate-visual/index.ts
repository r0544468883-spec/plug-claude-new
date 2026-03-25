import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CVData {
  personalInfo: {
    fullName: string;
    title: string;
    email: string;
    phone: string;
    location: string;
    summary: string;
  };
  experience: Array<{
    company: string;
    role: string;
    startDate: string;
    endDate: string | null;
    current: boolean;
    bullets: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    startDate: string;
    endDate: string;
  }>;
  skills: {
    technical: string[];
    soft: string[];
    languages: Array<{ name: string; level: string }>;
  };
  projects: Array<{
    name: string;
    description: string;
    url?: string;
  }>;
  settings: {
    templateId: string;
    accentColor: string;
    fontSize: string;
    fontFamily: string;
    colorPreset: string;
    spacing: string;
    orientation: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cvData, style } = await req.json() as { cvData: CVData; style?: string };
    
    const CLAUDE_API_KEY = Deno.env.get("CLAUDE_API_KEY");
    if (!CLAUDE_API_KEY) {
      console.error("CLAUDE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build a simplified prompt for generating a professional CV image
    const accentColor = cvData.settings.accentColor || '#3b82f6';
    const orientation = cvData.settings.orientation || 'portrait';
    
    // Truncate text to keep prompt shorter for better image generation
    const name = cvData.personalInfo.fullName || 'John Doe';
    const title = cvData.personalInfo.title || 'Professional';
    const email = cvData.personalInfo.email || '';
    const phone = cvData.personalInfo.phone || '';
    const location = cvData.personalInfo.location || '';
    
    const experienceSummary = cvData.experience.slice(0, 2).map(exp => 
      `${exp.role} at ${exp.company}`
    ).join(', ') || 'Experienced Professional';
    
    const skillsSummary = cvData.skills.technical.slice(0, 5).join(', ') || 'Various skills';
    
    const prompt = `Generate a professional CV/resume document image.

DESIGN: Modern, clean, ATS-friendly resume layout with ${orientation === 'landscape' ? 'landscape' : 'portrait'} A4 format.
COLOR: Primary accent color ${accentColor}, professional styling.

CONTENT TO DISPLAY:
- Name: ${name}
- Title: ${title}
- Contact: ${email} | ${phone} | ${location}
- Experience: ${experienceSummary}
- Skills: ${skillsSummary}

Create a realistic, printable resume image with clear typography, proper sections (header, experience, skills), and professional formatting. Ultra high resolution.`;

    console.log("Generating CV HTML visual with Claude...");

    const systemPrompt = `You are a professional CV/resume designer. Generate ONLY valid HTML code for a printable A4 resume.

RULES:
1. Return ONLY the HTML code starting with <!DOCTYPE html> and ending with </html>
2. Include all CSS inline or in a <style> tag in the <head>
3. Use modern, visually rich design with proper typography and the specified accent color
4. Ensure good contrast and readability (dark text on light background)
5. Support both LTR and RTL text using dir="auto" where needed
6. Make it printer-friendly with reasonable margins (20mm)
7. Use semantic HTML structure (header, main, section, etc.)
8. Do NOT include any markdown, explanations, or code blocks - ONLY pure HTML
9. The page should be A4 size (210mm x 297mm)`;

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
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 4096,
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
        JSON.stringify({ error: "Failed to generate CV visual" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    console.log("CV visual generated successfully");

    let html = result.content?.[0]?.text || "";

    // Remove markdown code blocks if present
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

    // Encode HTML as a data URL so callers expecting imageUrl still work
    const encoder = new TextEncoder();
    const htmlBytes = encoder.encode(html);
    const base64 = btoa(String.fromCharCode(...htmlBytes));
    const imageUrl = `data:text/html;base64,${base64}`;

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: imageUrl,
        html: html,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("CV generation error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate CV. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
