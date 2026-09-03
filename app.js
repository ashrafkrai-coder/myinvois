// Temporary compatibility loader for InvoicePro.
// The original application logic was mistakenly uploaded as sw.js.
// This loader executes that existing application code in the page context
// while keeping the production/main branch untouched during testing.
(async () => {
  try {
    const response = await fetch('./sw.js', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const source = await response.text();
    const script = document.createElement('script');
    script.textContent = source + '\n//# sourceURL=invoicepro-app.js';
    document.body.appendChild(script);
  } catch (error) {
    console.error('InvoicePro application failed to load:', error);
    const message = document.createElement('div');
    message.className = 'toast';
    message.textContent = '⚠️ Aplikasi gagal dimuatkan. Sila refresh.';
    document.body.appendChild(message);
  }
})();
