-- Drop and recreate the audit_log_user_view to mask IP addresses
-- This addresses the concern about IP tracking and sensitive data exposure

DROP VIEW IF EXISTS public.audit_log_user_view;

CREATE VIEW public.audit_log_user_view
WITH (security_invoker = on) AS
SELECT 
  id,
  user_id,
  action,
  entity_type,
  entity_id,
  -- Mask IP addresses - users should not see their own IP history for privacy
  NULL::text as ip_address,
  -- Include old_values and new_values for user reference
  old_values,
  new_values,
  created_at
FROM public.audit_log
WHERE user_id = auth.uid();

-- Add a comment to document the security rationale
COMMENT ON VIEW public.audit_log_user_view IS 'Secure view of audit_log that masks IP addresses. Use this view for user-facing audit log access instead of direct table queries.';