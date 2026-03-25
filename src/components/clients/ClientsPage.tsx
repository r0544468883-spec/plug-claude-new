import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { SLAMonitor } from '@/components/dashboard/SLAMonitor';
import { VacancyCalculator } from '@/components/jobs/VacancyCalculator';
import { PlacementRevenue } from '@/components/dashboard/PlacementRevenue';
import { AddContactPrompt } from '@/components/clients/AddContactPrompt';
import { Building2, Plus, Search, Globe, Loader2, TrendingUp, AlertTriangle, DollarSign, Users, Clock, Activity, BarChart3, Wrench } from 'lucide-react';

interface ClientCompany {
  id: string;
  name: string;
  description: string | null;
  industry: string | null;
  website: string | null;
  logo_url: string | null;
  logo_scraped_url: string | null;
  lead_status: string | null;
  tech_stack: string[] | null;
  estimated_revenue: number | null;
  historical_value: number | null;
  last_contact_at: string | null;
  avg_hiring_speed_days: number | null;
  response_rate: number | null;
  total_hires: number | null;
  created_at: string;
}

interface ClientsPageProps {
  onViewClient: (companyId: string) => void;
}

export function ClientsPage({ onViewClient }: ClientsPageProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [scraping, setScraping] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', description: '', industry: '', website: '', lead_status: 'lead' });
  
  // Auto-contact prompt state
  const [newlyCreatedClient, setNewlyCreatedClient] = useState<{ id: string; name: string } | null>(null);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['my-clients', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('created_by', user.id)
        .order('last_contact_at', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data || []) as ClientCompany[];
    },
    enabled: !!user?.id,
  });

  const { data: jobCounts = {} } = useQuery({
    queryKey: ['client-job-counts', user?.id],
    queryFn: async () => {
      if (!user?.id) return {};
      const { data } = await supabase
        .from('jobs')
        .select('company_id, status')
        .eq('created_by', user.id)
        .eq('status', 'active');
      if (!data) return {};
      const counts: Record<string, number> = {};
      data.forEach(j => { if (j.company_id) counts[j.company_id] = (counts[j.company_id] || 0) + 1; });
      return counts;
    },
    enabled: !!user?.id,
  });

  const { data: urgentTasks = [] } = useQuery({
    queryKey: ['urgent-client-tasks', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('client_tasks')
        .select('*, companies:company_id(name)')
        .eq('recruiter_id', user.id)
        .in('priority', ['high', 'urgent'])
        .eq('status', 'pending')
        .order('due_date', { ascending: true })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const createClientMutation = useMutation({
    mutationFn: async (client: typeof newClient) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('companies')
        .insert({
          name: client.name, description: client.description || null,
          industry: client.industry || null, website: client.website || null,
          created_by: user.id, lead_status: client.lead_status,
        })
        .select('id, name')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['my-clients'] });
      setShowCreateDialog(false);
      setNewClient({ name: '', description: '', industry: '', website: '', lead_status: 'lead' });
      toast.success(isRTL ? 'הלקוח נוסף בהצלחה!' : 'Client added successfully!');
      // Auto-show contact prompt
      if (data) {
        setNewlyCreatedClient({ id: data.id, name: data.name });
      }
    },
    onError: () => toast.error(isRTL ? 'שגיאה ביצירת לקוח' : 'Error creating client'),
  });

  const handleScrapeUrl = async () => {
    if (!scrapeUrl.trim() || !user?.id) return;
    setScraping(true);
    try {
      const { data, error } = await supabase.functions.invoke('scrape-company', { body: { url: scrapeUrl } });
      if (error) throw error;
      if (data?.company) {
        setNewClient({
          name: data.company.name || '', description: data.company.description || '',
          industry: data.company.industry || '', website: scrapeUrl,
          lead_status: data.company.lead_status || 'lead',
        });
        toast.success(isRTL ? 'המידע נשלף בהצלחה!' : 'Data scraped successfully!');
      }
    } catch {
      toast.error(isRTL ? 'לא הצלחתי לשלוף מידע' : 'Could not scrape data');
    } finally { setScraping(false); }
  };

  const filteredClients = clients.filter(c => {
    if (search) {
      const q = search.toLowerCase();
      if (!c.name.toLowerCase().includes(q) && !c.industry?.toLowerCase().includes(q)) return false;
    }
    if (statusFilter !== 'all' && c.lead_status !== statusFilter) return false;
    return true;
  });

  const stats = {
    total: clients.length,
    active: clients.filter(c => c.lead_status === 'active').length,
    leads: clients.filter(c => c.lead_status === 'lead').length,
    totalRevenue: clients.reduce((sum, c) => sum + (c.historical_value || 0), 0),
  };

  const getHealthScore = (c: ClientCompany) => {
    let score = 50;
    if (c.avg_hiring_speed_days) {
      if (c.avg_hiring_speed_days <= 7) score += 25;
      else if (c.avg_hiring_speed_days <= 21) score += 10;
      else score -= 10;
    }
    if (c.last_contact_at) {
      const daysSince = (Date.now() - new Date(c.last_contact_at).getTime()) / 86400000;
      if (daysSince <= 7) score += 20;
      else if (daysSince <= 30) score += 5;
      else score -= 15;
    }
    if (c.total_hires && c.total_hires > 0) score += 5;
    return Math.min(100, Math.max(0, score));
  };

  const getHealthColor = (score: number) => {
    if (score >= 70) return 'text-green-500';
    if (score >= 40) return 'text-amber-500';
    return 'text-destructive';
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'active': return <Badge className="bg-primary/20 text-primary border-primary/30">{isRTL ? 'פעיל' : 'Active'}</Badge>;
      case 'lead': return <Badge variant="secondary">{isRTL ? 'ליד' : 'Lead'}</Badge>;
      case 'cold': return <Badge variant="outline" className="text-muted-foreground">{isRTL ? 'קר' : 'Cold'}</Badge>;
      default: return <Badge variant="secondary">{status || 'Lead'}</Badge>;
    }
  };

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'} data-tour="clients-list">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <Building2 className="w-6 h-6 text-primary" />
          {isRTL ? 'הלקוחות שלי' : 'My Clients'}
        </h2>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" />{isRTL ? 'לקוח חדש' : 'New Client'}</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>{isRTL ? 'הוסף לקוח חדש' : 'Add New Client'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  {isRTL ? 'יצירה חכמה מ-URL' : 'Smart Create from URL'}
                </Label>
                <div className="flex gap-2">
                  <Input value={scrapeUrl} onChange={(e) => setScrapeUrl(e.target.value)} placeholder="https://company.com" className="flex-1" />
                  <Button onClick={handleScrapeUrl} disabled={scraping || !scrapeUrl.trim()} size="sm" variant="outline">
                    {scraping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2"><Label>{isRTL ? 'שם החברה' : 'Company Name'} *</Label><Input value={newClient.name} onChange={(e) => setNewClient(p => ({ ...p, name: e.target.value }))} /></div>
              <div className="space-y-2"><Label>{isRTL ? 'תיאור' : 'Description'}</Label><Textarea value={newClient.description} onChange={(e) => setNewClient(p => ({ ...p, description: e.target.value }))} rows={3} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>{isRTL ? 'תעשייה' : 'Industry'}</Label><Input value={newClient.industry} onChange={(e) => setNewClient(p => ({ ...p, industry: e.target.value }))} /></div>
                <div className="space-y-2"><Label>{isRTL ? 'סטטוס' : 'Status'}</Label>
                  <Select value={newClient.lead_status} onValueChange={(v) => setNewClient(p => ({ ...p, lead_status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lead">{isRTL ? 'ליד' : 'Lead'}</SelectItem>
                      <SelectItem value="active">{isRTL ? 'פעיל' : 'Active'}</SelectItem>
                      <SelectItem value="cold">{isRTL ? 'קר' : 'Cold'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>{isRTL ? 'אתר' : 'Website'}</Label><Input value={newClient.website} onChange={(e) => setNewClient(p => ({ ...p, website: e.target.value }))} /></div>
              <Button onClick={() => createClientMutation.mutate(newClient)} disabled={!newClient.name.trim() || createClientMutation.isPending} className="w-full">
                {createClientMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isRTL ? 'צור לקוח' : 'Create Client'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Auto Contact Prompt after creating a client */}
      {newlyCreatedClient && (
        <AddContactPrompt
          companyId={newlyCreatedClient.id}
          companyName={newlyCreatedClient.name}
          onDismiss={() => setNewlyCreatedClient(null)}
        />
      )}

      {/* Tabs with clear visual distinction */}
      <Tabs defaultValue="clients" className="w-full">
        <TabsList className="w-full h-12 p-1 bg-muted/60 rounded-xl gap-1">
          <TabsTrigger 
            value="clients" 
            className="flex-1 gap-2 h-10 rounded-lg text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
          >
            <Building2 className="w-4 h-4" />
            {isRTL ? 'לקוחות' : 'Clients'}
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 data-[state=active]:bg-primary-foreground/20 data-[state=active]:text-primary-foreground">{stats.total}</Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="b2b-tools" 
            className="flex-1 gap-2 h-10 rounded-lg text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
          >
            <Wrench className="w-4 h-4" />
            {isRTL ? 'כלים עסקיים' : 'Business Tools'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="space-y-6 mt-4">
          {/* High Priority Alerts */}
          {urgentTasks.length > 0 && (
            <Card className="bg-destructive/5 border-destructive/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-4 h-4" />
                  {isRTL ? 'התראות בעדיפות גבוהה' : 'High Priority Alerts'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {urgentTasks.map((task: any) => (
                  <div key={task.id} className="flex items-center justify-between p-2 rounded-lg bg-background/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{(task.companies as any)?.name}</p>
                    </div>
                    <Badge variant={task.priority === 'urgent' ? 'destructive' : 'default'} className="shrink-0">
                      {task.priority === 'urgent' ? (isRTL ? 'דחוף' : 'Urgent') : (isRTL ? 'גבוה' : 'High')}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: isRTL ? 'סה"כ' : 'Total', value: stats.total, icon: Building2, color: 'text-foreground' },
              { label: isRTL ? 'פעילים' : 'Active', value: stats.active, icon: TrendingUp, color: 'text-primary' },
              { label: isRTL ? 'לידים' : 'Leads', value: stats.leads, icon: Users, color: 'text-amber-500' },
              { label: isRTL ? 'הכנסות' : 'Revenue', value: `₪${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-primary' },
            ].map((stat) => (
              <Card key={stat.label} className="bg-card border-border">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10"><stat.icon className="w-4 h-4 text-primary" /></div>
                  <div>
                    <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={isRTL ? 'חיפוש לקוח...' : 'Search client...'} className="ps-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? 'הכל' : 'All'}</SelectItem>
                <SelectItem value="active">{isRTL ? 'פעילים' : 'Active'}</SelectItem>
                <SelectItem value="lead">{isRTL ? 'לידים' : 'Leads'}</SelectItem>
                <SelectItem value="cold">{isRTL ? 'קרים' : 'Cold'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Smart Table */}
          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 animate-pulse bg-muted rounded-lg" />)}</div>
          ) : filteredClients.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="p-12 text-center">
                <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">{isRTL ? 'אין לקוחות עדיין' : 'No clients yet'}</p>
                <Button variant="outline" onClick={() => setShowCreateDialog(true)} className="gap-2">
                  <Plus className="w-4 h-4" />{isRTL ? 'הוסף לקוח ראשון' : 'Add your first client'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] gap-2 px-4 py-2.5 bg-muted/50 text-xs font-medium text-muted-foreground">
                <span>{isRTL ? 'חברה' : 'Company'}</span>
                <span>{isRTL ? 'סטטוס' : 'Status'}</span>
                <span>{isRTL ? 'פרויקטים' : 'Projects'}</span>
                <span>{isRTL ? 'הכנסה' : 'Revenue'}</span>
                <span>{isRTL ? 'בריאות' : 'Health'}</span>
                <span></span>
              </div>
              {filteredClients.map((client) => {
                const health = getHealthScore(client);
                const activeJobs = jobCounts[client.id] || 0;
                return (
                  <div
                    key={client.id}
                    className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] gap-2 px-4 py-3 border-t border-border hover:bg-muted/30 cursor-pointer transition-colors items-center"
                    onClick={() => onViewClient(client.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        {client.logo_url || client.logo_scraped_url ? (
                          <img src={client.logo_url || client.logo_scraped_url || ''} alt="" className="w-7 h-7 rounded object-contain" />
                        ) : (
                          <Building2 className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{client.name}</p>
                        {client.industry && <p className="text-xs text-muted-foreground truncate">{client.industry}</p>}
                      </div>
                    </div>
                    <div className="flex items-center">{getStatusBadge(client.lead_status)}</div>
                    <div className="flex items-center gap-1.5 text-sm">
                      <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{activeJobs} {isRTL ? 'פעילים' : 'active'}</span>
                    </div>
                    <div className="text-sm font-medium">₪{(client.historical_value || 0).toLocaleString()}</div>
                    <div className="flex items-center gap-2">
                      <Progress value={health} className="h-1.5 flex-1 max-w-[60px]" />
                      <span className={`text-xs font-semibold ${getHealthColor(health)}`}>{health}</span>
                    </div>
                    <div className="flex justify-end">
                      <Button variant="ghost" size="sm" className="text-xs">{isRTL ? 'צפה' : 'View'}</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* B2B Tools Tab */}
        <TabsContent value="b2b-tools" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SLAMonitor />
            <PlacementRevenue />
          </div>
          <VacancyCalculator />
        </TabsContent>
      </Tabs>
    </div>
  );
}
