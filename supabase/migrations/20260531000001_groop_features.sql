-- =============================================================
-- GROOP-INSPIRED FEATURES: Digital Products, Challenges,
-- Subscriptions, Payment Links, Discover, Landing Pages, Affiliates
-- =============================================================

-- 1. Add category to community_hubs for Discover page
ALTER TABLE community_hubs
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS featured boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS monthly_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS yearly_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'ILS',
  ADD COLUMN IF NOT EXISTS trial_days integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS tagline_en text,
  ADD COLUMN IF NOT EXISTS tagline_he text,
  ADD COLUMN IF NOT EXISTS creator_bio_en text,
  ADD COLUMN IF NOT EXISTS creator_bio_he text;

-- 2. Digital Products
CREATE TABLE IF NOT EXISTS digital_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id uuid REFERENCES community_hubs(id) ON DELETE CASCADE,
  creator_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  title_he text,
  description text,
  description_he text,
  category text DEFAULT 'general',
  price numeric NOT NULL DEFAULT 0,
  currency text DEFAULT 'ILS',
  file_url text NOT NULL,
  preview_url text,
  cover_image_url text,
  is_active boolean DEFAULT true,
  is_free boolean DEFAULT false,
  downloads_count integer DEFAULT 0,
  rating_avg numeric DEFAULT 0,
  rating_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS digital_product_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES digital_products(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL,
  currency text DEFAULT 'ILS',
  status text DEFAULT 'completed',
  provider text DEFAULT 'stripe',
  provider_payment_id text,
  access_granted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id, user_id)
);

CREATE TABLE IF NOT EXISTS digital_product_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES digital_products(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rating integer CHECK (rating BETWEEN 1 AND 5),
  review text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id, user_id)
);

-- 3. Challenges System
CREATE TABLE IF NOT EXISTS challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id uuid REFERENCES community_hubs(id) ON DELETE CASCADE,
  creator_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  title_he text,
  description text,
  description_he text,
  challenge_type text DEFAULT 'weekly' CHECK (challenge_type IN ('daily', 'weekly', 'monthly', 'custom')),
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  cover_image_url text,
  prize_description text,
  prize_description_he text,
  max_participants integer,
  team_size integer DEFAULT 0,
  points_reward integer DEFAULT 100,
  is_active boolean DEFAULT true,
  participant_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS challenge_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid REFERENCES challenges(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  title_he text,
  description text,
  description_he text,
  day_number integer DEFAULT 1,
  points integer DEFAULT 10,
  task_type text DEFAULT 'checkbox' CHECK (task_type IN ('checkbox', 'text', 'photo', 'link')),
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS challenge_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid REFERENCES challenges(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  total_points integer DEFAULT 0,
  member_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS challenge_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid REFERENCES challenges(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  team_id uuid REFERENCES challenge_teams(id) ON DELETE SET NULL,
  total_points integer DEFAULT 0,
  completed_tasks integer DEFAULT 0,
  rank integer,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

CREATE TABLE IF NOT EXISTS challenge_task_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES challenge_tasks(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  proof_url text,
  proof_text text,
  completed_at timestamptz DEFAULT now(),
  UNIQUE(task_id, user_id)
);

-- 4. Subscription Plans
CREATE TABLE IF NOT EXISTS community_subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id uuid REFERENCES community_hubs(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  name_he text,
  description text,
  description_he text,
  price_monthly numeric NOT NULL,
  price_yearly numeric,
  currency text DEFAULT 'ILS',
  trial_days integer DEFAULT 0,
  features jsonb DEFAULT '[]',
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS community_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id uuid REFERENCES community_hubs(id) ON DELETE CASCADE NOT NULL,
  plan_id uuid REFERENCES community_subscription_plans(id) ON DELETE SET NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing', 'expired')),
  billing_cycle text DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  trial_ends_at timestamptz,
  provider text DEFAULT 'stripe',
  provider_subscription_id text,
  amount numeric,
  currency text DEFAULT 'ILS',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(hub_id, user_id)
);

-- 5. Payment Links
CREATE TABLE IF NOT EXISTS payment_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  hub_id uuid REFERENCES community_hubs(id) ON DELETE SET NULL,
  title text NOT NULL,
  title_he text,
  description text,
  description_he text,
  amount numeric NOT NULL,
  currency text DEFAULT 'ILS',
  image_url text,
  slug text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  uses_count integer DEFAULT 0,
  max_uses integer,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_link_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid REFERENCES payment_links(id) ON DELETE CASCADE NOT NULL,
  payer_name text,
  payer_email text,
  payer_phone text,
  amount numeric NOT NULL,
  currency text DEFAULT 'ILS',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  provider text DEFAULT 'stripe',
  provider_payment_id text,
  invoice_url text,
  created_at timestamptz DEFAULT now()
);

-- 6. Community Landing Pages
CREATE TABLE IF NOT EXISTS community_landing_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id uuid REFERENCES community_hubs(id) ON DELETE CASCADE NOT NULL,
  slug text UNIQUE NOT NULL,
  hero_title text,
  hero_title_he text,
  hero_description text,
  hero_description_he text,
  hero_image_url text,
  hero_video_url text,
  primary_color text DEFAULT '#8B5CF6',
  secondary_color text DEFAULT '#EC4899',
  custom_css text,
  sections jsonb DEFAULT '[]',
  testimonials jsonb DEFAULT '[]',
  faq jsonb DEFAULT '[]',
  is_published boolean DEFAULT false,
  view_count integer DEFAULT 0,
  conversion_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 7. Affiliate System
CREATE TABLE IF NOT EXISTS affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id uuid REFERENCES community_hubs(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  affiliate_code text UNIQUE NOT NULL,
  commission_rate numeric DEFAULT 0.20,
  status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'banned')),
  total_clicks integer DEFAULT 0,
  total_conversions integer DEFAULT 0,
  total_earned numeric DEFAULT 0,
  total_paid numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(hub_id, user_id)
);

CREATE TABLE IF NOT EXISTS affiliate_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid REFERENCES affiliates(id) ON DELETE CASCADE NOT NULL,
  referred_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  conversion_type text DEFAULT 'signup',
  amount numeric DEFAULT 0,
  commission_amount numeric DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS affiliate_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid REFERENCES affiliates(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL,
  currency text DEFAULT 'ILS',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
  paid_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 8. Creator AI Templates
CREATE TABLE IF NOT EXISTS creator_ai_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type text NOT NULL CHECK (template_type IN ('post', 'challenge', 'ad', 'course', 'landing_page', 'email')),
  name text NOT NULL,
  name_he text,
  prompt_template text NOT NULL,
  category text DEFAULT 'general',
  is_active boolean DEFAULT true,
  usage_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS creator_ai_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  hub_id uuid REFERENCES community_hubs(id) ON DELETE SET NULL,
  template_id uuid REFERENCES creator_ai_templates(id) ON DELETE SET NULL,
  generation_type text NOT NULL,
  prompt text NOT NULL,
  result text,
  language text DEFAULT 'he',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- =============================================================
-- RLS Policies
-- =============================================================

ALTER TABLE digital_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_product_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_product_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_link_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_ai_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_ai_generations ENABLE ROW LEVEL SECURITY;

-- Digital Products: anyone can view active, creator can manage
CREATE POLICY "digital_products_select" ON digital_products FOR SELECT USING (is_active = true OR creator_id = auth.uid());
CREATE POLICY "digital_products_insert" ON digital_products FOR INSERT WITH CHECK (creator_id = auth.uid());
CREATE POLICY "digital_products_update" ON digital_products FOR UPDATE USING (creator_id = auth.uid());
CREATE POLICY "digital_products_delete" ON digital_products FOR DELETE USING (creator_id = auth.uid());

-- Purchases: user can see own, creator can see for their products
CREATE POLICY "purchases_select" ON digital_product_purchases FOR SELECT USING (
  user_id = auth.uid() OR
  product_id IN (SELECT id FROM digital_products WHERE creator_id = auth.uid())
);
CREATE POLICY "purchases_insert" ON digital_product_purchases FOR INSERT WITH CHECK (user_id = auth.uid());

-- Ratings: anyone can read, user can write own
CREATE POLICY "ratings_select" ON digital_product_ratings FOR SELECT USING (true);
CREATE POLICY "ratings_insert" ON digital_product_ratings FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "ratings_update" ON digital_product_ratings FOR UPDATE USING (user_id = auth.uid());

-- Challenges: anyone can view active, creator manages
CREATE POLICY "challenges_select" ON challenges FOR SELECT USING (is_active = true OR creator_id = auth.uid());
CREATE POLICY "challenges_insert" ON challenges FOR INSERT WITH CHECK (creator_id = auth.uid());
CREATE POLICY "challenges_update" ON challenges FOR UPDATE USING (creator_id = auth.uid());
CREATE POLICY "challenges_delete" ON challenges FOR DELETE USING (creator_id = auth.uid());

-- Challenge tasks: visible if challenge is visible
CREATE POLICY "challenge_tasks_select" ON challenge_tasks FOR SELECT USING (true);
CREATE POLICY "challenge_tasks_insert" ON challenge_tasks FOR INSERT WITH CHECK (
  challenge_id IN (SELECT id FROM challenges WHERE creator_id = auth.uid())
);
CREATE POLICY "challenge_tasks_update" ON challenge_tasks FOR UPDATE USING (
  challenge_id IN (SELECT id FROM challenges WHERE creator_id = auth.uid())
);

-- Challenge teams: visible to all
CREATE POLICY "challenge_teams_select" ON challenge_teams FOR SELECT USING (true);
CREATE POLICY "challenge_teams_insert" ON challenge_teams FOR INSERT TO authenticated WITH CHECK (true); -- hardened 2026-08-08: require an account

-- Challenge participants: user can join, all can see leaderboard
CREATE POLICY "participants_select" ON challenge_participants FOR SELECT USING (true);
CREATE POLICY "participants_insert" ON challenge_participants FOR INSERT WITH CHECK (user_id = auth.uid());

-- Task completions: user can complete own, all can see
CREATE POLICY "completions_select" ON challenge_task_completions FOR SELECT USING (true);
CREATE POLICY "completions_insert" ON challenge_task_completions FOR INSERT WITH CHECK (user_id = auth.uid());

-- Subscription plans: anyone can view active
CREATE POLICY "sub_plans_select" ON community_subscription_plans FOR SELECT USING (is_active = true);
CREATE POLICY "sub_plans_insert" ON community_subscription_plans FOR INSERT WITH CHECK (
  hub_id IN (SELECT hub_id FROM community_members WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "sub_plans_update" ON community_subscription_plans FOR UPDATE USING (
  hub_id IN (SELECT hub_id FROM community_members WHERE user_id = auth.uid() AND role = 'admin')
);

-- Subscriptions: user sees own, admin sees hub
CREATE POLICY "subscriptions_select" ON community_subscriptions FOR SELECT USING (
  user_id = auth.uid() OR
  hub_id IN (SELECT hub_id FROM community_members WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "subscriptions_insert" ON community_subscriptions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "subscriptions_update" ON community_subscriptions FOR UPDATE USING (user_id = auth.uid());

-- Payment links: creator manages, public can view active
CREATE POLICY "payment_links_select" ON payment_links FOR SELECT USING (is_active = true OR creator_id = auth.uid());
CREATE POLICY "payment_links_insert" ON payment_links FOR INSERT WITH CHECK (creator_id = auth.uid());
CREATE POLICY "payment_links_update" ON payment_links FOR UPDATE USING (creator_id = auth.uid());
CREATE POLICY "payment_links_delete" ON payment_links FOR DELETE USING (creator_id = auth.uid());

-- Payment link transactions: link creator can see
CREATE POLICY "link_tx_select" ON payment_link_transactions FOR SELECT USING (
  link_id IN (SELECT id FROM payment_links WHERE creator_id = auth.uid())
);
-- hardened 2026-08-08: public checkout may insert, but only as 'pending';
-- the payment webhook (service role) sets 'completed'. Was WITH CHECK (true) → self-mark paid.
CREATE POLICY "link_tx_insert" ON payment_link_transactions FOR INSERT WITH CHECK (status = 'pending');

-- Landing pages: public if published, creator manages
CREATE POLICY "landing_select" ON community_landing_pages FOR SELECT USING (is_published = true OR
  hub_id IN (SELECT hub_id FROM community_members WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "landing_insert" ON community_landing_pages FOR INSERT WITH CHECK (
  hub_id IN (SELECT hub_id FROM community_members WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "landing_update" ON community_landing_pages FOR UPDATE USING (
  hub_id IN (SELECT hub_id FROM community_members WHERE user_id = auth.uid() AND role = 'admin')
);

-- Affiliates: user sees own, hub admin sees all
CREATE POLICY "affiliates_select" ON affiliates FOR SELECT USING (
  user_id = auth.uid() OR
  hub_id IN (SELECT hub_id FROM community_members WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "affiliates_insert" ON affiliates FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "affiliates_update" ON affiliates FOR UPDATE USING (user_id = auth.uid());

-- Affiliate conversions: affiliate owner can see
CREATE POLICY "conversions_select" ON affiliate_conversions FOR SELECT USING (
  affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
);
-- hardened 2026-08-08: conversions are attributed server-side (service role);
-- no client INSERT policy. Was WITH CHECK (true) → anyone forges conversions (affiliate fraud).

-- Affiliate payouts: affiliate owner can see
CREATE POLICY "payouts_select" ON affiliate_payouts FOR SELECT USING (
  affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
);

-- Creator AI templates: anyone can read
CREATE POLICY "ai_templates_select" ON creator_ai_templates FOR SELECT USING (is_active = true);

-- Creator AI generations: user sees own
CREATE POLICY "ai_gen_select" ON creator_ai_generations FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "ai_gen_insert" ON creator_ai_generations FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "ai_gen_update" ON creator_ai_generations FOR UPDATE USING (user_id = auth.uid());

-- =============================================================
-- Indexes
-- =============================================================

CREATE INDEX IF NOT EXISTS idx_digital_products_hub ON digital_products(hub_id);
CREATE INDEX IF NOT EXISTS idx_digital_products_creator ON digital_products(creator_id);
CREATE INDEX IF NOT EXISTS idx_digital_product_purchases_user ON digital_product_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_challenges_hub ON challenges(hub_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge ON challenge_participants(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_user ON challenge_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_community_subscriptions_hub ON community_subscriptions(hub_id);
CREATE INDEX IF NOT EXISTS idx_community_subscriptions_user ON community_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_slug ON payment_links(slug);
CREATE INDEX IF NOT EXISTS idx_payment_links_creator ON payment_links(creator_id);
CREATE INDEX IF NOT EXISTS idx_landing_pages_slug ON community_landing_pages(slug);
CREATE INDEX IF NOT EXISTS idx_affiliates_code ON affiliates(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_affiliates_hub ON affiliates(hub_id);
CREATE INDEX IF NOT EXISTS idx_creator_ai_generations_user ON creator_ai_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_community_hubs_category ON community_hubs(category);
CREATE INDEX IF NOT EXISTS idx_community_hubs_featured ON community_hubs(featured) WHERE featured = true;

-- =============================================================
-- Seed Creator AI Templates
-- =============================================================

INSERT INTO creator_ai_templates (template_type, name, name_he, prompt_template, category) VALUES
('post', 'Motivational Post', 'פוסט מוטיבציה', 'Write a motivational social media post for a {{niche}} community. Topic: {{topic}}. Language: {{language}}. Keep it authentic, engaging, and under 200 words.', 'engagement'),
('post', 'Tip of the Day', 'טיפ היום', 'Write a practical tip for {{niche}} professionals. Topic: {{topic}}. Language: {{language}}. Format: short hook + actionable advice + CTA.', 'education'),
('post', 'Community Question', 'שאלה לקהילה', 'Write an engaging question to spark discussion in a {{niche}} community. Topic: {{topic}}. Language: {{language}}. Make it thought-provoking.', 'engagement'),
('challenge', 'Weekly Challenge', 'אתגר שבועי', 'Create a 7-day challenge for a {{niche}} community. Topic: {{topic}}. Language: {{language}}. For each day provide: task title, description, points. Make tasks progressively harder.', 'engagement'),
('challenge', 'Monthly Challenge', 'אתגר חודשי', 'Create a 30-day challenge for a {{niche}} community. Topic: {{topic}}. Language: {{language}}. Group into 4 weeks with themes. Each day: task title + description. Include milestones at day 7, 14, 21, 30.', 'engagement'),
('ad', 'Facebook Ad', 'מודעת פייסבוק', 'Write a Facebook ad for a {{niche}} community/course. Product: {{topic}}. Language: {{language}}. Include: headline (max 40 chars), primary text (max 125 chars), description, CTA.', 'marketing'),
('ad', 'Instagram Story Ad', 'מודעת סטורי', 'Write copy for an Instagram story ad promoting a {{niche}} community. Product: {{topic}}. Language: {{language}}. Max 3 short text overlays + CTA.', 'marketing'),
('landing_page', 'Community Landing Page', 'דף נחיתה לקהילה', 'Write landing page copy for a {{niche}} community. Name: {{topic}}. Language: {{language}}. Include: hero headline + subtitle, 3 benefits, about the creator, 3 FAQ items, CTA.', 'marketing'),
('email', 'Welcome Email', 'מייל ברוך הבא', 'Write a welcome email for new members of a {{niche}} community. Community: {{topic}}. Language: {{language}}. Warm, personal, include 3 first steps.', 'onboarding'),
('email', 'Re-engagement Email', 'מייל חזרה', 'Write a re-engagement email for inactive members of a {{niche}} community. Community: {{topic}}. Language: {{language}}. Friendly, show what they are missing.', 'retention')
ON CONFLICT DO NOTHING;
