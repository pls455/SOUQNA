import { json, PagesContext } from '../../_shared';

export const onRequestPost = async (_ctx: PagesContext) => json({
  ok: false,
  error: 'Webhook Karam Pay متوقف حتى تزويد عقد التوقيع الرسمي والتحقق منه.',
}, 501);
