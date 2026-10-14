async function check() {
  const r = await fetch('https://anand-builders-rental.vercel.app/admin/payments');
  const text = await r.text();
  console.log('HTML contents:\n', text);
}
check();
