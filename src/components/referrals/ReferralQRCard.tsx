import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { QrCode, Download, Share2, Loader2 } from 'lucide-react';

interface ReferralQRCardProps {
  /** The invite link to encode (e.g. https://plug-hr.com/invite/ABC123) */
  inviteLink: string;
  /** Referral code, used to name the downloaded file */
  referralCode?: string;
  isHebrew?: boolean;
  /** Award-credits action fired once when the user downloads/shares the QR. Pass null to disable. */
  awardAction?: string | null;
}

/**
 * Renders a scannable QR of the user's referral link — the offline bridge:
 * print it, add it to a slide, or show it on your phone at an event.
 * Scanning opens the same /invite/:code flow the online share links use.
 */
export function ReferralQRCard({
  inviteLink,
  referralCode,
  isHebrew = true,
  awardAction = 'job_share',
}: ReferralQRCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const awardedRef = useRef(false);

  useEffect(() => {
    if (!inviteLink) return;
    // Tag scans as channel "qr" for attribution (Invite page reads ?ch=)
    const encodedLink = inviteLink + (inviteLink.includes('?') ? '&' : '?') + 'ch=qr';
    QRCode.toDataURL(encodedLink, {
      width: 512,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [inviteLink]);

  // Fire the share reward at most once per mounted card
  const awardOnce = () => {
    if (awardedRef.current || !awardAction) return;
    awardedRef.current = true;
    supabase.functions.invoke('award-credits', { body: { action: awardAction } }).catch(() => {});
  };

  const downloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `plug-invite-${referralCode || 'qr'}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    awardOnce();
    toast.success(isHebrew ? 'ה-QR הורד! אפשר להדפיס או לשתף' : 'QR downloaded! Print or share it');
  };

  const shareQR = async () => {
    if (!qrDataUrl) return;
    setBusy(true);
    try {
      // Prefer native share sheet with the image file (mobile)
      const blob = await (await fetch(qrDataUrl)).blob();
      const file = new File([blob], `plug-invite-${referralCode || 'qr'}.png`, { type: 'image/png' });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({
          files: [file],
          title: 'PLUG',
          text: isHebrew
            ? 'סרוק את הקוד והצטרף ל-PLUG'
            : 'Scan the code to join PLUG',
        });
        awardOnce();
      } else {
        // Desktop / unsupported → fall back to download
        downloadQR();
      }
    } catch {
      /* user cancelled share — no-op */
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card dir={isHebrew ? 'rtl' : 'ltr'}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <QrCode className="w-4 h-4 text-primary" />
          {isHebrew ? 'קוד QR להזמנה' : 'Invite QR Code'}
        </CardTitle>
        <CardDescription className="text-xs">
          {isHebrew
            ? 'הדפיסו, הוסיפו למצגת, או הראו בטלפון. כל סריקה = הצטרפות + נקודות לשניכם'
            : 'Print it, add it to a slide, or show it on your phone. Each scan = a signup + credits for both of you'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-center">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={isHebrew ? 'קוד QR להזמנה ל-PLUG' : 'PLUG invite QR code'}
              className="w-44 h-44 rounded-lg border bg-white p-2"
              width={176}
              height={176}
            />
          ) : (
            <div className="w-44 h-44 rounded-lg border bg-muted/30 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={downloadQR} disabled={!qrDataUrl}>
            <Download className="w-4 h-4" />
            {isHebrew ? 'הורדה' : 'Download'}
          </Button>
          <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={shareQR} disabled={!qrDataUrl || busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
            {isHebrew ? 'שיתוף' : 'Share'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
