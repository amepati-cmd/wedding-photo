const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    const result = await cloudinary.search
      .expression('folder:wedding/*')
      .sort_by('created_at', 'desc')
      .max_results(500)
      .with_field('tags')
      .with_field('context')
      .execute();

    const photos = (result.resources || []).map(r => {
      const tags = r.tags || [];
      const ctx = (r.context && (r.context.custom || r.context)) || {};
      const guestTag = tags.find(t => t.startsWith('guest_')) || '';
      // いいねは like_<guestId> というタグで1件ずつ積まれている
      const likers = tags.filter(t => t.startsWith('like_')).map(t => t.slice(5));

      return {
        url: r.secure_url,
        public_id: r.public_id,
        // 撮影者（端末ごとの内部ID）と表示名
        guest: guestTag.replace('guest_', ''),
        name: ctx.name || '',
        likes: likers.length,
        likers,
        // テーブル・席は任意（QRにパラメータを付けた場合のみ入る）
        table: (tags.find(t => t.startsWith('table')) || '').replace('table', ''),
        seat: (tags.find(t => t.startsWith('seat')) || '').replace('seat', ''),
        time: new Date(r.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
        created_at: r.created_at,
      };
    });

    res.status(200).json({ photos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
