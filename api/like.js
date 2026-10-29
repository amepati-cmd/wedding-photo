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

  const { public_id, guest, liked } = req.body || {};

  // guest は英数字のみ（タグ名に使うため厳密に検証する）
  if (typeof guest !== 'string' || !/^[A-Za-z0-9]{3,40}$/.test(guest)) {
    res.status(400).json({ error: 'invalid guest id' });
    return;
  }
  if (typeof public_id !== 'string' || public_id.length === 0 || public_id.length > 300) {
    res.status(400).json({ error: 'invalid public_id' });
    return;
  }

  const tag = 'like_' + guest;

  try {
    // タグの付け外しは加算的な操作なので、
    // 複数人が同時にいいねしても上書きで消えることがない
    if (liked) {
      await cloudinary.uploader.add_tag(tag, [public_id]);
    } else {
      await cloudinary.uploader.remove_tag(tag, [public_id]);
    }
    res.status(200).json({ success: true, liked: !!liked });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
