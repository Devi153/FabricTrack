-- Schedule this with a privileged server-side job, for example hourly.
-- This only touches the additive Business Portal schema.
begin;
delete from business_portal.sessions where expires_at<now();
delete from business_portal.otp_challenges where expires_at<now()-interval '1 day';
delete from business_portal.delivery_limits where window_start<now()-interval '1 day';
commit;
