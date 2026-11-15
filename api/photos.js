const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const PAGE = 500;      // Cloudinaryの1回あたりの上限
const MAX_PAGES = 4;   // 最大2000枚まで取得する

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  // ?guest=xxx が付いていれば、その人が押したハートの合計も返す
  const guest = typeof req.query?.guest === 'string' && /^[A-Za-z0-9]{3,40}$/.test(req.query.guest)
    ? req.query.guest : null;
  const myTag = guest ? 'like_' + guest : null;

  try {
    // 500枚を超える場合があるので、ページをたどって全部集める
    const resources = [];
    let cursor = null, pages = 0;
    do {
      const q = cloudinary.search
        .expression('folder:wedding/*')
        .sort_by('created_at', 'desc')
        .max_results(PAGE)
        .with_field('tags')
        .with_field('context');
      if (cursor) q.next_cursor(cursor);
      const r = await q.execute();
      resources.push(...(r.resources || []));
      cursor = r.next_cursor;
      pages++;
    } while (cursor && pages < MAX_PAGES);

    let myLikes = 0;

    const photos = resources.map(r => {
      const tags = r.tags || [];
      const ctx = (r.context && (r.context.custom || r.context)) || {};
      const guestTag = tags.find(t => t.startsWith('guest_')) || '';
      const likeTags = tags.filter(t => t.startsWith('like_'));
      const likedByMe = myTag ? likeTags.includes(myTag) : false;
      if (likedByMe) myLikes++;

      return {
        url: r.secure_url,
        public_id: r.public_id,
        guest: guestTag.replace('guest_', ''),
        name: ctx.name || '',
        caption: ctx.caption || '',
        likes: likeTags.length,
        likedByMe,
        time: new Date(r.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
        created_at: r.created_at,
      };
    });

    res.status(200).json({ photos, myLikes, total: photos.length, truncated: !!cursor });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
