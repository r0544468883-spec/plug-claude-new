import { Helmet } from "react-helmet-async";

const PrivacyPolicy = () => (
  <>
    <Helmet>
      <title>Privacy Policy | PLUG</title>
    </Helmet>
    <div dir="ltr" className="min-h-screen bg-white text-gray-800 px-6 py-12 max-w-3xl mx-auto leading-relaxed">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: May 19, 2026</p>

      <p className="mb-6">
        PLUG ("we", "our", or "us") operates the PLUG web application at{" "}
        <a href="https://www.plug-hr.com" className="text-blue-600 underline">www.plug-hr.com</a>{" "}
        and the PLUG Chrome extension. This Privacy Policy explains what data we collect, how we use it, and your rights.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">1. Data We Collect</h2>
      <ul className="list-disc pl-6 space-y-1 mb-4">
        <li><strong>Account information</strong> — name, email address, and profile details you provide during registration.</li>
        <li><strong>Resume and career data</strong> — uploaded resumes, work experience, skills, and preferences used for job matching.</li>
        <li><strong>Job browsing activity</strong> — job listings you view on supported platforms (LinkedIn, AllJobs, JobMaster, Glassdoor, Workday) when the extension is active, used to provide match scores and prevent duplicates.</li>
        <li><strong>Application history</strong> — records of jobs you applied to, application status, and recruiter responses.</li>
        <li><strong>Email metadata</strong> — sender, subject, and body of recruiter-related emails (when Gmail sync is enabled) to classify application statuses.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-3">2. How We Use Your Data</h2>
      <ul className="list-disc pl-6 space-y-1 mb-4">
        <li>Analyze job listings and provide personalized match scores.</li>
        <li>Auto-fill job application forms on your behalf.</li>
        <li>Track application statuses and notify you of updates.</li>
        <li>Improve our AI matching algorithms and product features.</li>
        <li>Send you relevant notifications (new matches, interview reminders).</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-3">3. Data Storage and Security</h2>
      <p className="mb-4">
        Your data is stored securely on Supabase-hosted infrastructure with row-level security (RLS) policies ensuring
        each user can only access their own data. All communication between the extension, web app, and servers uses HTTPS encryption.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">4. Data Sharing</h2>
      <p className="mb-4">
        We do <strong>not</strong> sell, rent, or share your personal data with third parties for marketing purposes.
        Data may be shared only with:
      </p>
      <ul className="list-disc pl-6 space-y-1 mb-4">
        <li>AI providers (Anthropic Claude) — job listing text is sent for analysis. No personal identifiers are included.</li>
        <li>Service providers (Supabase, Vercel) — for hosting and infrastructure.</li>
        <li>Legal authorities — if required by law.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-3">5. Chrome Extension Permissions</h2>
      <ul className="list-disc pl-6 space-y-1 mb-4">
        <li><strong>storage</strong> — save preferences and session data locally.</li>
        <li><strong>tabs</strong> — open job pages and detect navigation to job platforms.</li>
        <li><strong>activeTab</strong> — read the current job listing page for analysis.</li>
        <li><strong>scripting</strong> — inject scripts into job platforms for reading listings and auto-apply.</li>
        <li><strong>sidePanel</strong> — display the PLUG interface alongside job sites.</li>
        <li><strong>notifications</strong> — alert you about new matching jobs and status updates.</li>
        <li><strong>alarms</strong> — schedule periodic data sync in the background.</li>
        <li><strong>history</strong> (optional) — track visited job pages to prevent duplicates.</li>
        <li><strong>Host permissions</strong> — access specific job platforms and Gmail for core functionality.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-3">6. Your Rights</h2>
      <p className="mb-4">You have the right to:</p>
      <ul className="list-disc pl-6 space-y-1 mb-4">
        <li>Access, update, or delete your personal data at any time from your profile settings.</li>
        <li>Disable the extension or revoke specific permissions.</li>
        <li>Request a full export or deletion of your data by contacting us.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-3">7. Contact Us</h2>
      <p className="mb-4">
        For any privacy-related questions, contact us at:{" "}
        <a href="mailto:plug.hotjobs@gmail.com" className="text-blue-600 underline">plug.hotjobs@gmail.com</a>
      </p>
    </div>
  </>
);

export default PrivacyPolicy;
