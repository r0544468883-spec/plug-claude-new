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
  const [senderProfile, setSenderProfile] = useState<{ full_name: string; title?: string; avatar_url?: string; user_id: string } | null>(null);

  // Extract share context from URL params
  const sharedScore = searchParams.get("score");
  const sharedJob = searchParams.get("job");
  const sharedCompany = searchParams.get("company");
  const channel = searchParams.get("ch") || "direct";
  const sharedJobUrl = searchParams.get("url");
  const senderId = searchParams.get("from");

  useEffect(() => {
    if (sharedScore) setScore(parseInt(sharedScore));
    if (sharedJob) setJobTitle(decodeURIComponent(sharedJob));
    if (sharedCompany) setJobCompany(decodeURIComponent(sharedCompany));
  }, [sharedScore, sharedJob, sharedCompany]);

  // Fetch sender profile
  useEffect(() => {
    if (!senderId) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("full_name, title, avatar_url, user_id")
        .eq("user_id", senderId)
        .single();
      if (data) {
        setSenderProfile(data);
        if (data.full_name && !referrerName) {
          setReferrerName(data.full_name.split(" ")[0]);
        }
      }
    })();
  }, [senderId]);

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
            {jobTitle ? (
              <>
                <h1 className="text-2xl font-bold text-white">
                  {referrerName
                    ? `${referrerName} שלח/ה לך משרה 💌`
                    : "שלחו לך משרה 💌"}
                </h1>
                <div className="bg-[#1A2340] border border-[#00FF9D]/30 rounded-xl p-6 space-y-3">
                  <p className="text-lg font-bold text-white">{jobTitle}</p>
                  {jobCompany && <p className="text-sm text-gray-400">{jobCompany}</p>}
                  {score && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-500">ציון התאמה:</span>
                      <span className="text-2xl font-black text-[#00FF9D]">{score}%</span>
                    </div>
                  )}
                  {sharedJobUrl && (
                    <a
                      href={sharedJobUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 mt-3 bg-[#0A66C2]/20 border border-[#0A66C2]/40 rounded-lg px-4 py-3 hover:bg-[#0A66C2]/30 transition-colors"
                    >
                      <svg className="w-4 h-4 text-[#0A66C2] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                      <span className="text-sm text-[#0A66C2] font-semibold">צפה במשרה בלינקדאין →</span>
                    </a>
                  )}
                </div>
                <p className="text-sm text-gray-400">
                  רוצה לדעת כמה המשרה הזו מתאימה <span className="text-white font-semibold">לך</span>?
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-white">
                  {referrerName
                    ? `${referrerName} ממליץ/ה לך על PLUG`
                    : "תוסף AI שמנתח לך כל משרה"}
                </h1>
                <div className="bg-[#1A2340] border border-[#00FF9D]/30 rounded-xl p-6 space-y-4">
                  <div className="text-5xl font-black text-[#00FF9D]">92%</div>
                  <p className="text-sm text-gray-400">
                    ככה זה נראה כשהתוסף מנתח משרה בשבילך
                  </p>
                  <p className="text-xs text-gray-500">
                    ציון AI אמיתי · מותאם לקורות החיים שלך
                  </p>
                </div>
              </>
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

          {/* Sender profile card */}
          {senderProfile && (
            <a
              href={`/p/${senderProfile.user_id}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 bg-[#1A2340]/60 border border-[#00FF9D]/20 rounded-xl p-4 hover:border-[#00FF9D]/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-[#00FF9D]/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {senderProfile.avatar_url ? (
                  <img src={senderProfile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <span className="text-[#00FF9D] font-bold text-sm">
                    {senderProfile.full_name?.charAt(0)}
                  </span>
                )}
              </div>
              <div className="text-right flex-1">
                <p className="text-sm font-semibold text-white">{senderProfile.full_name}</p>
                {senderProfile.title && (
                  <p className="text-xs text-gray-400">{senderProfile.title}</p>
                )}
              </div>
              <span className="text-xs text-[#00FF9D]">צפה בפרופיל →</span>
            </a>
          )}

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
