const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  // public_id（1枚）と public_ids（複数枚）の両方を受け付ける
  const body = req.body || {};
  let ids = [];
  if (Array.isArray(body.public_ids)) ids = body.public_ids;
  else if (body.public_id) ids = [body.public_id];

  ids = ids.filter(id => typeof id === 'string' && id.length > 0);

  if (ids.length === 0) {
    res.status(400).json({ error: 'public_id or public_ids is required' });
    return;
  }
  if (ids.length > 200) {
    res.status(400).json({ error: '一度に削除できるのは200枚までです' });
    return;
  }

  try {
    const deleted = [];
    const failed = [];

    // Cloudinaryのdelete_resourcesは1回100件までなので分割して実行
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100);
      const result = await cloudinary.api.delete_resources(chunk);
      const map = result.deleted || {};
      chunk.forEach(id => {
        if (map[id] === 'deleted') deleted.push(id);
        else failed.push({ id, reason: map[id] || 'unknown' });
      });
    }

    res.status(200).json({
      success: failed.length === 0,
      deleted_count: deleted.length,
      deleted,
      failed,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
