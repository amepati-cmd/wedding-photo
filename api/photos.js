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
      .execute();

    const photos = result.resources.map(r => ({
      url: r.secure_url,
      public_id: r.public_id,
      table: (r.tags.find(t => t.startsWith('table')) || '').replace('table', ''),
      seat: (r.tags.find(t => t.startsWith('seat')) || '').replace('seat', ''),
      time: new Date(r.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
    }));

    res.status(200).json({ photos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
