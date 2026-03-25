import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CalendarEventRequest {
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
  attendees?: string[];
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, description, location, startTime, endTime, attendees }: CalendarEventRequest = await req.json();

    console.log("Creating calendar event:", { title, startTime, endTime });

    // Build Google Calendar URL for adding event
    const baseUrl = "https://calendar.google.com/calendar/render";
    
    // Format dates for Google Calendar (YYYYMMDDTHHmmssZ)
    const formatDateForGoogle = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    const startFormatted = formatDateForGoogle(startTime);
    const endFormatted = formatDateForGoogle(endTime);

    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: title,
      dates: `${startFormatted}/${endFormatted}`,
    });

    if (description) {
      params.set("details", description);
    }

    if (location) {
      params.set("location", location);
    }

    if (attendees && attendees.length > 0) {
      params.set("add", attendees.join(","));
    }

    const calendarUrl = `${baseUrl}?${params.toString()}`;

    console.log("Generated calendar URL:", calendarUrl);

    // Also generate ICS file content for download option
    const icsContent = generateICS({
      title,
      description: description || "",
      location: location || "",
      startTime,
      endTime,
    });

    return new Response(
      JSON.stringify({
        success: true,
        calendarUrl,
        icsContent,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error creating calendar event:", error);
    return new Response(
      JSON.stringify({ error: "Failed to create calendar event. Please try again." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

function generateICS(event: {
  title: string;
  description: string;
  location: string;
  startTime: string;
  endTime: string;
}): string {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '').replace('Z', 'Z');
  };

  const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@plug.app`;
  const now = formatDate(new Date().toISOString());

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Plug App//Interview Scheduler//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${now}
DTSTART:${formatDate(event.startTime)}
DTEND:${formatDate(event.endTime)}
SUMMARY:${event.title}
DESCRIPTION:${event.description.replace(/\n/g, '\\n')}
LOCATION:${event.location}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;
}

serve(handler);
