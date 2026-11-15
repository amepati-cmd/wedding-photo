const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_CAP = 30;

// Cloudinaryのcontextは「キー=値|キー=値」の形なので、区切り文字は落とす
const cleanCap = s => String(s || '').replace(/[|=\r\n]/g, '').trim().slice(0, MAX_CAP);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { public_id, guest } = req.body || {};

  if (typeof guest !== 'string' || !/^[A-Za-z0-9]{3,40}$/.test(guest)) {
    res.status(400).json({ error: 'invalid guest id' });
    return;
  }
  if (typeof public_id !== 'string' || public_id.length === 0 || public_id.length > 300) {
    res.status(400).json({ error: 'invalid public_id' });
    return;
  }

  const caption = cleanCap(req.body.caption);

  try {
    const r = await cloudinary.api.resource(public_id, { context: true });

    // 自分が撮った写真だけ書き換えられるようにする
    const tags = r.tags || [];
    if (!tags.includes('guest_' + guest)) {
      res.status(403).json({ error: 'not your photo' });
      return;
    }

    // name は消さずに残す
    const ctx = (r.context && (r.context.custom || r.context)) || {};
    const name = String(ctx.name || '').replace(/[|=\r\n]/g, '');

    if (caption) {
      const pairs = (name ? 'name=' + name + '|' : '') + 'caption=' + caption;
      await cloudinary.uploader.add_context(pairs, [public_id]);
    } else {
      // 空にしたいときは、いったん全部消してから name だけ戻す
      await cloudinary.uploader.remove_all_context([public_id]);
      if (name) await cloudinary.uploader.add_context('name=' + name, [public_id]);
    }

    res.status(200).json({ success: true, caption });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
