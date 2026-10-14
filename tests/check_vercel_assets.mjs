async function checkUrls() {
  const urls = [
    'https://anand-builders-rental-zeta.vercel.app',
    'https://anand-builders-rental.vercel.app',
    'https://anand-builders-rental.zeta.vercel.app',
  ];
  for (const u of urls) {
    try {
      const res = await fetch(u);
      console.log(`URL: ${u} -> Status: ${res.status}`);
      const text = await res.text();
      const scripts = [...text.matchAll(/src="\/assets\/([^"]+)"/g)].map(m => m[1]);
      console.log(`  Assets:`, scripts);
    } catch (e) {
      console.log(`URL: ${u} -> Error:`, e.message);
    }
  }
}
checkUrls();
