import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export function ReportJobsAnalytics() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/analytics?tab=jobs'); }, [navigate]);
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
}
