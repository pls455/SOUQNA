import { json, PagesContext } from '../_shared';

export const onRequestGet = async (ctx: PagesContext) => json({
  ok: true,
  platform: 'SOUQNA',
  integrations: {
    supabaseConfigured: Boolean(ctx.env.SUPABASE_URL && ctx.env.SUPABASE_ANON_KEY),
    cloudflareR2Configured: Boolean(ctx.env.MEDIA_BUCKET && ctx.env.R2_PUBLIC_URL),
    karamPayConfigured: ctx.env.KARAM_PAY_ENABLED?.trim().toLowerCase() === 'true',
  },
});
