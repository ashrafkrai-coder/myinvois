// Temporary compatibility loader for InvoicePro.
// Loads the existing application logic from sw.js while testing on this branch.
(async () => {
  try {
    const response = await fetch('./sw.js', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    let source = await response.text();

    // The old file registers init only on DOMContentLoaded. Because this loader
    // fetches asynchronously, that event may already have fired. Remove the
    // original one-shot registration and initialize safely after injection.
    source = source.replace(
      /document\.addEventListener\(['"]DOMContentLoaded['"],\s*init\);?\s*$/m,
      ''
    );

    const script = document.createElement('script');
    script.textContent = `${source}\n//# sourceURL=invoicepro-app.js`;
    document.body.appendChild(script);

    if (typeof init !== 'function') {
      throw new Error('init() not found after loading application code');
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
      init();
    }
  } catch (error) {
    console.error('InvoicePro application failed to load:', error);
    const message = document.createElement('div');
    message.className = 'toast';
    message.textContent = '⚠️ Aplikasi gagal dimuatkan. Sila refresh.';
    document.body.appendChild(message);
  }
})();
