import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Plus, Download, ShoppingCart, Star, Search, Loader2, Package, Image, FileUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DigitalProductsTabProps {
  hubId: string;
  isAdmin: boolean;
}

const CATEGORIES = ['ebook', 'guide', 'template', 'toolkit', 'other'] as const;
type ProductCategory = typeof CATEGORIES[number];

const CATEGORY_LABELS: Record<ProductCategory, { en: string; he: string }> = {
  ebook: { en: 'eBook', he: 'ספר דיגיטלי' },
  guide: { en: 'Guide', he: 'מדריך' },
  template: { en: 'Template', he: 'תבנית' },
  toolkit: { en: 'Toolkit', he: 'ערכת כלים' },
  other: { en: 'Other', he: 'אחר' },
};

export function DigitalProductsTab({ hubId, isAdmin }: DigitalProductsTabProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHe = language === 'he';
  const queryClient = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Form state
  const [title, setTitle] = useState('');
  const [titleHe, setTitleHe] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<ProductCategory>('ebook');
  const [isFree, setIsFree] = useState(false);
  const [productFile, setProductFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);

  // Fetch products
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['digital-products', hubId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('digital_products')
        .select('*')
        .eq('hub_id', hubId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch user's purchases
  const { data: myPurchases = [] } = useQuery({
    queryKey: ['my-product-purchases', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await (supabase as any)
        .from('digital_product_purchases')
        .select('product_id')
        .eq('user_id', user.id);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const purchasedProductIds = new Set(myPurchases.map((p: any) => p.product_id));

  // Filter products
  const filtered = products.filter((p: any) => {
    const matchesSearch = !searchQuery ||
      (p.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.title_he || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Purchase mutation
  const purchaseMutation = useMutation({
    mutationFn: async (productId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await (supabase as any)
        .from('digital_product_purchases')
        .insert({ product_id: productId, user_id: user.id });
      if (error) throw error;
      // Increment downloads count
      const product = products.find((p: any) => p.id === productId);
      if (product) {
        await (supabase as any)
          .from('digital_products')
          .update({ downloads_count: (product.downloads_count || 0) + 1 })
          .eq('id', productId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-product-purchases'] });
      queryClient.invalidateQueries({ queryKey: ['digital-products', hubId] });
      toast.success(isHe ? 'הרכישה הושלמה!' : 'Purchase complete!');
    },
    onError: () => toast.error(isHe ? 'שגיאה ברכישה' : 'Purchase failed'),
  });

  // Download handler
  const handleDownload = async (product: any) => {
    if (!product.file_path) return;
    const { data, error } = await supabase.storage
      .from('digital-products')
      .createSignedUrl(product.file_path, 3600);
    if (error || !data?.signedUrl) {
      toast.error(isHe ? 'שגיאה בהורדה' : 'Download failed');
      return;
    }
    window.open(data.signedUrl, '_blank');
  };

  // Create product
  const handleCreate = async () => {
    if (!title || !user?.id) return;
    setCreating(true);
    try {
      // Generate a temp ID for file paths
      const tempId = crypto.randomUUID();
      let filePath = '';
      let coverPath = '';

      // Upload product file
      if (productFile) {
        const safeName = productFile.name.replace(/[^\x00-\x7F]/g, '').replace(/\s+/g, '_');
        filePath = `${hubId}/${tempId}/${safeName}`;
        const { error: uploadErr } = await supabase.storage
          .from('digital-products')
          .upload(filePath, productFile);
        if (uploadErr) throw uploadErr;
      }

      // Upload cover image
      if (coverFile) {
        const safeCover = coverFile.name.replace(/[^\x00-\x7F]/g, '').replace(/\s+/g, '_');
        coverPath = `${hubId}/${tempId}/cover_${safeCover}`;
        const { error: coverErr } = await supabase.storage
          .from('digital-products')
          .upload(coverPath, coverFile);
        if (coverErr) throw coverErr;
      }

      // Get cover public URL if uploaded
      let coverUrl = '';
      if (coverPath) {
        const { data: coverData } = await supabase.storage
          .from('digital-products')
          .createSignedUrl(coverPath, 60 * 60 * 24 * 365); // 1 year
        coverUrl = coverData?.signedUrl || '';
      }

      const { error } = await (supabase as any).from('digital_products').insert({
        hub_id: hubId,
        title,
        title_he: titleHe || null,
        description,
        price: isFree ? 0 : parseFloat(price) || 0,
        is_free: isFree,
        category,
        file_path: filePath,
        cover_url: coverUrl,
        cover_path: coverPath,
        created_by: user.id,
        downloads_count: 0,
        rating: 0,
        rating_count: 0,
      });
      if (error) throw error;

      toast.success(isHe ? 'המוצר נוצר בהצלחה!' : 'Product created!');
      queryClient.invalidateQueries({ queryKey: ['digital-products', hubId] });
      setShowCreate(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || (isHe ? 'שגיאה ביצירת מוצר' : 'Failed to create product'));
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setTitleHe('');
    setDescription('');
    setPrice('');
    setCategory('ebook');
    setIsFree(false);
    setProductFile(null);
    setCoverFile(null);
  };

  const renderStars = (rating: number) => {
    const full = Math.round(rating);
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn('w-3.5 h-3.5', i < full ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30')}
          />
        ))}
        {rating > 0 && <span className="text-xs text-muted-foreground ms-1">({rating.toFixed(1)})</span>}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-72 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold">
          {isHe ? 'מוצרים דיגיטליים' : 'Digital Products'}
        </h2>
        {isAdmin && (
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" />
                {isHe ? 'הוסף מוצר' : 'Add Product'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{isHe ? 'מוצר חדש' : 'New Product'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label>{isHe ? 'כותרת (אנגלית)' : 'Title (English)'}</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Product title" />
                </div>
                <div>
                  <Label>{isHe ? 'כותרת (עברית)' : 'Title (Hebrew)'}</Label>
                  <Input value={titleHe} onChange={e => setTitleHe(e.target.value)} placeholder="כותרת המוצר" dir="rtl" />
                </div>
                <div>
                  <Label>{isHe ? 'תיאור' : 'Description'}</Label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
                </div>
                <div>
                  <Label>{isHe ? 'קטגוריה' : 'Category'}</Label>
                  <Select value={category} onValueChange={(v) => setCategory(v as ProductCategory)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {isHe ? CATEGORY_LABELS[cat].he : CATEGORY_LABELS[cat].en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={isFree} onCheckedChange={setIsFree} />
                  <Label>{isHe ? 'מוצר חינמי' : 'Free product'}</Label>
                </div>
                {!isFree && (
                  <div>
                    <Label>{isHe ? 'מחיר (ILS)' : 'Price (ILS)'}</Label>
                    <Input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" />
                  </div>
                )}
                <div>
                  <Label>{isHe ? 'קובץ מוצר' : 'Product File'}</Label>
                  <div className="mt-1">
                    <label className="flex items-center gap-2 cursor-pointer border border-dashed rounded-lg p-3 hover:bg-muted/50 transition-colors">
                      <FileUp className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {productFile ? productFile.name : (isHe ? 'בחר קובץ...' : 'Choose file...')}
                      </span>
                      <input type="file" className="hidden" onChange={e => setProductFile(e.target.files?.[0] || null)} />
                    </label>
                  </div>
                </div>
                <div>
                  <Label>{isHe ? 'תמונת שער' : 'Cover Image'}</Label>
                  <div className="mt-1">
                    <label className="flex items-center gap-2 cursor-pointer border border-dashed rounded-lg p-3 hover:bg-muted/50 transition-colors">
                      <Image className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {coverFile ? coverFile.name : (isHe ? 'בחר תמונה...' : 'Choose image...')}
                      </span>
                      <input type="file" accept="image/*" className="hidden" onChange={e => setCoverFile(e.target.files?.[0] || null)} />
                    </label>
                  </div>
                </div>
                <Button onClick={handleCreate} disabled={creating || !title} className="w-full gap-2">
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isHe ? 'צור מוצר' : 'Create Product'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={isHe ? 'חיפוש מוצרים...' : 'Search products...'}
            className="ps-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder={isHe ? 'כל הקטגוריות' : 'All Categories'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isHe ? 'הכל' : 'All'}</SelectItem>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat} value={cat}>
                {isHe ? CATEGORY_LABELS[cat].he : CATEGORY_LABELS[cat].en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Products Grid */}
      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-medium">
              {isHe ? 'אין מוצרים עדיין' : 'No products yet'}
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {isHe ? 'מוצרים דיגיטליים יופיעו כאן' : 'Digital products will appear here'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((product: any) => {
            const owned = purchasedProductIds.has(product.id) || product.is_free;
            const displayTitle = isHe && product.title_he ? product.title_he : product.title;
            const catLabel = product.category && CATEGORY_LABELS[product.category as ProductCategory]
              ? (isHe ? CATEGORY_LABELS[product.category as ProductCategory].he : CATEGORY_LABELS[product.category as ProductCategory].en)
              : '';

            return (
              <Card key={product.id} className="overflow-hidden hover:shadow-md transition-shadow group">
                {/* Cover Image */}
                <div className="aspect-[4/3] bg-muted/30 relative overflow-hidden">
                  {product.cover_url ? (
                    <img
                      src={product.cover_url}
                      alt={displayTitle}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-12 h-12 text-muted-foreground/20" />
                    </div>
                  )}
                  {catLabel && (
                    <Badge variant="secondary" className="absolute top-2 end-2 text-xs">
                      {catLabel}
                    </Badge>
                  )}
                </div>

                <CardContent className="p-4 space-y-2">
                  <h3 className="font-semibold text-sm line-clamp-2 leading-snug">{displayTitle}</h3>

                  {product.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
                  )}

                  {renderStars(product.rating || 0)}

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Download className="w-3.5 h-3.5" />
                      <span>{product.downloads_count || 0}</span>
                    </div>
                    <span className="font-bold text-sm">
                      {product.is_free
                        ? (isHe ? 'חינם' : 'Free')
                        : `${product.price || 0} ILS`}
                    </span>
                  </div>

                  {/* Action Button */}
                  {owned ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-1.5 mt-1"
                      onClick={() => handleDownload(product)}
                    >
                      <Download className="w-4 h-4" />
                      {isHe ? 'הורדה' : 'Download'}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full gap-1.5 mt-1"
                      disabled={purchaseMutation.isPending}
                      onClick={() => purchaseMutation.mutate(product.id)}
                    >
                      {purchaseMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ShoppingCart className="w-4 h-4" />
                      )}
                      {isHe ? 'קנה עכשיו' : 'Buy Now'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
