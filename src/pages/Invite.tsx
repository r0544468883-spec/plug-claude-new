import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Chrome, Star, Zap, Users } from "lucide-react";

export default function Invite() {
  const { code } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [referrerName, setReferrerName] = useState<string>("");
  const [score, setScore] = useState<number | null>(null);
  const [jobTitle, setJobTitle] = useState<string>("");
  const [jobCompany, setJobCompany] = useState<string>("");
  const [userCount, setUserCount] = useState(3200);

  // Extract share context from URL params
  const sharedScore = searchParams.get("score");
  const sharedJob = searchParams.get("job");
  const sharedCompany = searchParams.get("company");
  const channel = searchParams.get("ch") || "direct";

  useEffect(() => {
    if (sharedScore) setScore(parseInt(sharedScore));
    if (sharedJob) setJobTitle(decodeURIComponent(sharedJob));
    if (sharedCompany) setJobCompany(decodeURIComponent(sharedCompany));
  }, [sharedScore, sharedJob, sharedCompany]);

  useEffect(() => {
    if (!code) return;
    // Track the click
    trackReferralClick(code, channel);
    // Fetch referrer info
    fetchReferrer(code);
  }, [code]);

  async function fetchReferrer(referralCode: string) {
    const { data } = await (supabase as any)
      .from("profiles")
      .select("full_name, referral_code")
      .eq("referral_code", referralCode)
      .single();
    if (data?.full_name) {
      setReferrerName(data.full_name.split(" ")[0]); // First name only
    }
  }

  async function trackReferralClick(referralCode: string, ch: string) {
    // Find referrer
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("user_id")
      .eq("referral_code", referralCode)
      .single();

    if (profile?.user_id) {
      await (supabase as any).from("referrals").insert({
        referrer_id: profile.user_id,
        referral_code: referralCode,
        channel: ch,
        status: "clicked",
        clicked_at: new Date().toISOString(),
        job_title: sharedJob ? decodeURIComponent(sharedJob) : null,
        job_company: sharedCompany ? decodeURIComponent(sharedCompany) : null,
        score: sharedScore ? parseInt(sharedScore) : null,
      });
    }

    // Store in localStorage for post-signup attribution
    localStorage.setItem("plug_referral_code", referralCode);
    localStorage.setItem("plug_referral_channel", ch);
  }

  function handleInstallExtension() {
    window.open(
      "https://chromewebstore.google.com/detail/plug/YOUR_EXTENSION_ID",
      "_blank"
    );
  }

  function handleSignup() {
    // Store referral attribution then go to main page
    navigate("/?signup=true&ref=" + code);
  }

  return (
    <>
      <Helmet>
        <title>PLUG - AI שמנתח לך כל משרה</title>
        <meta
          property="og:title"
          content={
            score
              ? `קיבלתי ${score}% התאמה למשרה${jobCompany ? ` ב-${jobCompany}` : ""}`
              : "PLUG - תוסף AI שמנתח לך כל משרה"
          }
        />
        <meta
          property="og:description"
          content="תוסף חינמי שנותן לך ציון התאמה AI על כל משרה בלינקדאין ובאולג'ובס. מצטרפים ב-30 שניות."
        />
        <meta
          property="og:image"
          content={
            score
              ? `https://llrzeexnzgknpwcxdxpm.supabase.co/functions/v1/og-share-image?score=${score}&job=${encodeURIComponent(jobTitle)}&company=${encodeURIComponent(jobCompany)}`
              : "https://www.plug-hr.com/plug-og-share.png"
          }
        />
        <meta property="og:type" content="website" />
      </Helmet>

      <div
        className="min-h-screen bg-gradient-to-b from-[#0A0E1A] to-[#131B2E] flex items-center justify-center p-4"
        dir="rtl"
      >
        <div className="max-w-md w-full space-y-8 text-center">
          {/* Logo */}
          <div className="flex justify-center">
            <img
              src="/plug-logo-dark.png"
              alt="PLUG"
              className="h-12"
            />
          </div>

          {/* Hero message */}
          <div className="space-y-4">
            {referrerName ? (
              <h1 className="text-2xl font-bold text-white">
                {referrerName} ממליץ/ה לך על PLUG
              </h1>
            ) : (
              <h1 className="text-2xl font-bold text-white">
                תוסף AI שמנתח לך כל משרה
              </h1>
            )}

            {score && (
              <div className="bg-[#1A2340] border border-[#00FF9D]/30 rounded-xl p-6 space-y-3">
                <p className="text-sm text-gray-400">
                  {referrerName
                    ? `${referrerName} קיבל/ה ציון התאמה של`
                    : "ציון התאמה לדוגמה"}
                </p>
                <div className="text-5xl font-black text-[#00FF9D]">{score}%</div>
                {jobTitle && (
                  <p className="text-sm text-gray-300">
                    {jobTitle}
                    {jobCompany && (
                      <span className="text-gray-500"> · {jobCompany}</span>
                    )}
                  </p>
                )}
              </div>
            )}

            {!score && (
              <div className="bg-[#1A2340] border border-[#00FF9D]/30 rounded-xl p-6 space-y-4">
                <div className="text-5xl font-black text-[#00FF9D]">92%</div>
                <p className="text-sm text-gray-400">
                  ככה זה נראה כשהתוסף מנתח משרה בשבילך
                </p>
                <p className="text-xs text-gray-500">
                  ציון AI אמיתי · מותאם לקורות החיים שלך
                </p>
              </div>
            )}
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-2 gap-3 text-right">
            <div className="bg-[#1A2340]/60 rounded-lg p-3 flex items-start gap-2">
              <Zap className="w-4 h-4 text-[#00FF9D] flex-shrink-0 mt-0.5" />
              <span className="text-xs text-gray-300">ציון התאמה AI על כל משרה</span>
            </div>
            <div className="bg-[#1A2340]/60 rounded-lg p-3 flex items-start gap-2">
              <Star className="w-4 h-4 text-[#00FF9D] flex-shrink-0 mt-0.5" />
              <span className="text-xs text-gray-300">ניתוח CV מול דרישות</span>
            </div>
            <div className="bg-[#1A2340]/60 rounded-lg p-3 flex items-start gap-2">
              <Chrome className="w-4 h-4 text-[#00FF9D] flex-shrink-0 mt-0.5" />
              <span className="text-xs text-gray-300">עובד על לינקדאין ואולג'ובס</span>
            </div>
            <div className="bg-[#1A2340]/60 rounded-lg p-3 flex items-start gap-2">
              <Users className="w-4 h-4 text-[#00FF9D] flex-shrink-0 mt-0.5" />
              <span className="text-xs text-gray-300">חינם לגמרי, בלי הגבלה</span>
            </div>
          </div>

          {/* CTA */}
          <div className="space-y-3">
            <Button
              onClick={handleInstallExtension}
              className="w-full py-6 text-lg font-bold bg-[#00FF9D] hover:bg-[#00FF9D]/90 text-black rounded-xl"
            >
              <Chrome className="w-5 h-5 ml-2" />
              התקן תוסף חינם
            </Button>
            <button
              onClick={handleSignup}
              className="text-sm text-gray-400 hover:text-[#00FF9D] transition-colors"
            >
              או הירשם לאתר בלבד →
            </button>
          </div>

          {/* Social proof */}
          <p className="text-xs text-gray-500">
            {userCount.toLocaleString()}+ מחפשי עבודה כבר משתמשים ב-PLUG
          </p>
        </div>
      </div>
    </>
  );
}
