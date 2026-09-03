/* =========================================================
   InvoicePro - Computer Repair & Sales Invoice Generator
   Main Application Logic
   ========================================================= */

// ============ CONSTANTS ============
const STORAGE_KEYS = {
  COMPANY: 'invoicepro_company',
  INVOICES: 'invoicepro_invoices',
  COUNTER: 'invoicepro_counter',
  DRAFT: 'invoicepro_draft',
  SETTINGS: 'invoicepro_settings',
};

const PRESETS = [
  { name: 'Format & Install Windows 10/11', price: 80, qty: 1 },
  { name: 'SSD Upgrade 512GB (incl. cloning)', price: 250, qty: 1 },
  { name: 'SSD Upgrade 1TB NVMe (incl. cloning)', price: 450, qty: 1 },
  { name: 'RAM Upgrade 8GB DDR4', price: 180, qty: 1 },
  { name: 'Thermal Paste Repaste & Dust Cleaning', price: 60, qty: 1 },
  { name: 'Laptop Screen Replacement (HD/Full HD)', price: 350, qty: 1 },
  { name: 'Keyboard Replacement (Laptop)', price: 150, qty: 1 },
  { name: 'Battery Replacement (Laptop)', price: 200, qty: 1 },
  { name: 'Virus Removal & Antivirus Setup', price: 70, qty: 1 },
  { name: 'Data Recovery (Basic)', price: 150, qty: 1 },
  { name: 'Power Supply (PSU) Replacement', price: 180, qty: 1 },
  { name: 'Motherboard Diagnostic', price: 80, qty: 1 },
  { name: 'WiFi Adapter / Card Upgrade', price: 120, qty: 1 },
  { name: 'Webcam Replacement', price: 90, qty: 1 },
];

// ============ STATE ============
const state = {
  company: {
    logo: '',
    name: '',
    ssm: '',
    phone: '',
    email: '',
    address: '',
    bankName: '',
    bankAccount: '',
    bankHolder: '',
  },
  invoices: [],
  counter: { date: '', seq: 0 },
  items: [],
};

// ============ STORAGE HELPERS ============
const storage = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (e) { console.error('Storage error:', e); showToast('⚠️ Storan penuh!'); }
  }
};

// ============ INIT ============
function init() {
  loadState();
  renderPresets();
  bindEvents();
  newInvoice();
  loadDraft();
  registerSW();
  handleInstallPrompt();
  recalc();
}

function loadState() {
  state.company = storage.get(STORAGE_KEYS.COMPANY, state.company);
  state.invoices = storage.get(STORAGE_KEYS.INVOICES, []);
  state.counter = storage.get(STORAGE_KEYS.COUNTER, { date: '', seq: 0 });
}

// ============ INVOICE NUMBER GENERATOR ============
function generateInvoiceNo() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const dateStr = `${y}${m}${d}`;

  if (state.counter.date !== dateStr) {
    state.counter = { date: dateStr, seq: 1 };
  } else {
    state.counter.seq += 1;
  }
  storage.set(STORAGE_KEYS.COUNTER, state.counter);
  return `INV-${dateStr}-${String(state.counter.seq).padStart(3, '0')}`;
}

function newInvoice() {
  document.getElementById('invoiceNo').value = generateInvoiceNo();
  document.getElementById('invoiceDate').value = formatDate(new Date());
  const due = new Date();
  due.setDate(due.getDate() + 7);
  document.getElementById('dueDate').value = formatDate(due);
  document.getElementById('status').value = 'Unpaid';
  state.items = [];
  renderItems();
  recalc();
}

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatCurrency(n) {
  return 'RM ' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ============ PRESETS ============
function renderPresets() {
  const container = document.getElementById('presetList');
  container.innerHTML = PRESETS.map((p, i) => `
    <button data-preset-idx="${i}" class="px-3 py-1.5 bg-slate-100 hover:bg-brand-100 hover:text-brand-700 text-slate-700 text-xs font-medium rounded-full border border-slate-200 transition-all">
      + ${p.name}
    </button>
  `).join('');

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-preset-idx]');
    if (!btn) return;
    const idx = parseInt(btn.dataset.presetIdx);
    const preset = PRESETS[idx];
    state.items.push({
      id: Date.now() + Math.random(),
      name: preset.name,
      qty: preset.qty,
      price: preset.price,
    });
    renderItems();
    recalc();
    saveDraft();
    showToast(`✅ "${preset.name}" ditambah`);
  });
}

// ============ LINE ITEMS ============
function renderItems() {
  const container = document.getElementById('itemsContainer');
  if (state.items.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-slate-400">
        <div class="text-4xl mb-2">📦</div>
        <p class="text-sm">Tiada item. Tekan "Tambah" atau pilih preset di atas.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = state.items.map((item, idx) => `
    <div class="bg-slate-50 rounded-xl p-3 border border-slate-200 animate-slide-up" data-item-id="${item.id}">
      <div class="flex items-start justify-between gap-2 mb-2">
        <span class="text-[10px] font-bold text-slate-400 uppercase">#${idx + 1}</span>
        <button data-remove-item="${item.id}" class="p-1 text-red-500 hover:bg-red-50 rounded-lg">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"/></svg>
        </button>
      </div>
      <input data-item-field="name" data-item-id="${item.id}" type="text" value="${escapeHtml(item.name)}" placeholder="Keterangan item / perkhidmatan" class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm mb-2" />
      <div class="grid grid-cols-3 gap-2">
        <div>
          <label class="text-[10px] text-slate-500 font-medium">Kuantiti</label>
          <input data-item-field="qty" data-item-id="${item.id}" type="number" inputmode="decimal" min="0" step="1" value="${item.qty}" class="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono text-right" />
        </div>
        <div>
          <label class="text-[10px] text-slate-500 font-medium">Harga (RM)</label>
          <input data-item-field="price" data-item-id="${item.id}" type="number" inputmode="decimal" min="0" step="0.01" value="${item.price}" class="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono text-right" />
        </div>
        <div>
          <label class="text-[10px] text-slate-500 font-medium">Jumlah</label>
          <div class="w-full px-2 py-2 bg-brand-50 border border-brand-200 rounded-lg text-sm font-mono text-right font-bold text-brand-700">
            ${formatCurrency(item.qty * item.price)}
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// ============ CALCULATIONS ============
function recalc() {
  const subtotal = state.items.reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);
  const discountVal = Number(document.getElementById('discountValue').value) || 0;
  const discountType = document.getElementById('discountType').value;
  const discount = discountType === 'percent' ? subtotal * (discountVal / 100) : discountVal;
  const afterDiscount = Math.max(0, subtotal - discount);
  const taxEnabled = document.getElementById('taxEnabled').checked;
  const tax = taxEnabled ? afterDiscount * 0.06 : 0;
  const grandTotal = afterDiscount + tax;

  document.getElementById('subtotalDisplay').textContent = formatCurrency(subtotal);
  document.getElementById('discountDisplay').textContent = '- ' + formatCurrency(discount);
  document.getElementById('taxDisplay').textContent = formatCurrency(tax);
  document.getElementById('grandTotalDisplay').textContent = formatCurrency(grandTotal);

  return { subtotal, discount, tax, grandTotal };
}

// ============ EVENT BINDING ============
function bindEvents() {
  document.getElementById('addItemBtn').addEventListener('click', () => {
    state.items.push({ id: Date.now() + Math.random(), name: '', qty: 1, price: 0 });
    renderItems();
    recalc();
    saveDraft();
  });

  document.getElementById('itemsContainer').addEventListener('input', (e) => {
    const field = e.target.dataset.itemField;
    const id = e.target.dataset.itemId;
    if (!field || !id) return;
    const item = state.items.find(i => String(i.id) === String(id));
    if (!item) return;
    if (field === 'name') item.name = e.target.value;
    else item[field] = Number(e.target.value) || 0;
    const row = e.target.closest('[data-item-id]');
    if (row) {
      const totalEl = row.querySelector('.grid > div:last-child > div');
      if (totalEl) totalEl.textContent = formatCurrency(item.qty * item.price);
    }
    recalc();
    saveDraft();
  });

  document.getElementById('itemsContainer').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove-item]');
    if (!btn) return;
    const id = btn.dataset.removeItem;
    state.items = state.items.filter(i => String(i.id) !== String(id));
    renderItems();
    recalc();
    saveDraft();
  });

  document.getElementById('discountValue').addEventListener('input', () => { recalc(); saveDraft(); });
  document.getElementById('discountType').addEventListener('change', () => { recalc(); saveDraft(); });
  document.getElementById('taxEnabled').addEventListener('change', () => { recalc(); saveDraft(); });

  ['invoiceDate', 'dueDate', 'status', 'customerName', 'customerPhone', 'customerAddress',
   'deviceModel', 'deviceSerial', 'deviceRma', 'deviceIssue'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', saveDraft);
  });

  document.getElementById('resetBtn').addEventListener('click', handleReset);
  document.getElementById('saveBtn').addEventListener('click', handleSave);
  document.getElementById('pdfBtn').addEventListener('click', handlePDF);
  document.getElementById('settingsBtn').addEventListener('click', () => openSettingsModal());
  document.getElementById('historyBtn').addEventListener('click', () => openHistoryModal());
  document.getElementById('saveSettingsBtn').addEventListener('click', handleSaveSettings);
  document.getElementById('removeLogoBtn').addEventListener('click', () => {
    state.company.logo = '';
    storage.set(STORAGE_KEYS.COMPANY, state.company);
    updateLogoPreview();
    showToast('🗑️ Logo dipadam');
  });
  document.getElementById('logoInput').addEventListener('change', handleLogoUpload);

  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById(btn.dataset.closeModal).classList.add('hidden');
    });
  });

  [document.getElementById('settingsModal'), document.getElementById('historyModal')].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });
  });
}

// ============ DRAFT ============
function saveDraft() {
  const draft = collectFormData();
  draft.items = state.items;
  storage.set(STORAGE_KEYS.DRAFT, draft);
}

function loadDraft() {
  const draft = storage.get(STORAGE_KEYS.DRAFT, null);
  if (!draft) return;
  ['invoiceDate', 'dueDate', 'status', 'customerName', 'customerPhone', 'customerAddress',
   'deviceModel', 'deviceSerial', 'deviceRma', 'deviceIssue', 'discountValue', 'discountType'].forEach(id => {
    const el = document.getElementById(id);
    if (el && draft[id] !== undefined) {
      if (el.type === 'checkbox') el.checked = draft[id];
      else el.value = draft[id];
    }
  });
  if (draft.taxEnabled !== undefined) document.getElementById('taxEnabled').checked = draft.taxEnabled;
  if (Array.isArray(draft.items)) {
    state.items = draft.items;
    renderItems();
  }
}

function collectFormData() {
  return {
    invoiceNo: document.getElementById('invoiceNo').value,
    invoiceDate: document.getElementById('invoiceDate').value,
    dueDate: document.getElementById('dueDate').value,
    status: document.getElementById('status').value,
    customerName: document.getElementById('customerName').value,
    customerPhone: document.getElementById('customerPhone').value,
    customerAddress: document.getElementById('customerAddress').value,
    deviceModel: document.getElementById('deviceModel').value,
    deviceSerial: document.getElementById('deviceSerial').value,
    deviceRma: document.getElementById('deviceRma').value,
    deviceIssue: document.getElementById('deviceIssue').value,
    discountValue: document.getElementById('discountValue').value,
    discountType: document.getElementById('discountType').value,
    taxEnabled: document.getElementById('taxEnabled').checked,
  };
}

// ============ ACTIONS ============
function handleReset() {
  if (!confirm('Reset borang ini? Data semasa akan hilang (kecuali tetapan syarikat).')) return;
  localStorage.removeItem(STORAGE_KEYS.DRAFT);
  ['customerName', 'customerPhone', 'customerAddress', 'deviceModel', 'deviceSerial', 'deviceRma', 'deviceIssue'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('discountValue').value = 0;
  document.getElementById('discountType').value = 'amount';
  document.getElementById('taxEnabled').checked = false;
  newInvoice();
  showToast('🔄 Borang direset');
}

function handleSave() {
  const data = collectFormData();
  if (!data.customerName.trim()) {
    showToast('⚠️ Sila isi nama pelanggan');
    return;
  }
  if (state.items.length === 0) {
    showToast('⚠️ Sila tambah sekurang-kurangnya 1 item');
    return;
  }
  const calc = recalc();
  const invoice = {
    ...data,
    items: state.items.map(i => ({ ...i })),
    subtotal: calc.subtotal,
    discount: calc.discount,
    tax: calc.tax,
    grandTotal: calc.grandTotal,
    savedAt: new Date().toISOString(),
  };
  const idx = state.invoices.findIndex(i => i.invoiceNo === invoice.invoiceNo);
  if (idx >= 0) state.invoices[idx] = invoice;
  else state.invoices.unshift(invoice);
  storage.set(STORAGE_KEYS.INVOICES, state.invoices);
  localStorage.removeItem(STORAGE_KEYS.DRAFT);
  showToast(`💾 Invoice ${invoice.invoiceNo} disimpan!`);
}

function handlePDF() {
  const data = collectFormData();
  if (!data.customerName.trim()) {
    showToast('⚠️ Sila isi nama pelanggan');
    return;
  }
  if (state.items.length === 0) {
    showToast('⚠️ Sila tambah sekurang-kurangnya 1 item');
    return;
  }
  const calc = recalc();
  buildPDFContent({ ...data, items: state.items, ...calc });
  generatePDF(data.invoiceNo);
}

// ============ PDF BUILDING ============
function buildPDFContent(data) {
  const c = state.company;
  const logoHtml = c.logo
    ? `<img src="${c.logo}" style="max-height:60px;max-width:150px;object-fit:contain;" />`
    : `<div style="font-size:32px;">💻</div>`;

  const itemsHtml = data.items.map((it, i) => `
    <tr>
      <td class="text-center">${i + 1}</td>
      <td>${escapeHtml(it.name || '-')}</td>
      <td class="text-center">${it.qty}</td>
      <td class="text-right">${formatCurrency(it.price)}</td>
      <td class="text-right"><strong>${formatCurrency(it.qty * it.price)}</strong></td>
    </tr>
  `).join('');

  const deviceInfo = [
    data.deviceModel && `<div><strong>Model:</strong> ${escapeHtml(data.deviceModel)}</div>`,
    data.deviceSerial && `<div><strong>No. Serial:</strong> ${escapeHtml(data.deviceSerial)}</div>`,
    data.deviceRma && `<div><strong>RMA Ref:</strong> ${escapeHtml(data.deviceRma)}</div>`,
    data.deviceIssue && `<div><strong>Aduan:</strong> ${escapeHtml(data.deviceIssue)}</div>`,
  ].filter(Boolean).join('');

  const bankHtml = (c.bankName || c.bankAccount || c.bankHolder) ? `
    <div style="background:#f6f6f6;border:1px solid #d1d5db;border-left:4px solid #666;padding:12px 16px;margin:16px 0;border-radius:4px;">
      <div style="font-size:10px;text-transform:uppercase;color:#4b5563;font-weight:700;letter-spacing:0.5px;margin-bottom:6px;">Maklumat Pembayaran</div>
      <div style="font-size:12px;line-height:1.6;color:#1f2937;">
        ${c.bankName ? `<div><strong>Bank:</strong> ${escapeHtml(c.bankName)}</div>` : ''}
        ${c.bankAccount ? `<div><strong>No. Akaun:</strong> ${escapeHtml(c.bankAccount)}</div>` : ''}
        ${c.bankHolder ? `<div><strong>Nama Pemegang:</strong> ${escapeHtml(c.bankHolder)}</div>` : ''}
      </div>
    </div>
  ` : '';

  const statusColor = data.status === 'Paid' ? '#16a34a' : data.status === 'Pending' ? '#ca8a04' : '#dc2626';
  const statusText = data.status === 'Paid' ? 'SUDAH BAYAR' : data.status === 'Pending' ? 'MENUNGGU' : 'BELUM BAYAR';

  const html = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:16px;border-bottom:3px solid #0f172a;">
      <div style="flex:1;min-width:0;padding-right:16px;">
        ${logoHtml}
        <div style="margin-top:10px;">
          <div style="font-size:18px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;">${escapeHtml(c.name || 'TechFix Enterprise')}</div>
          ${c.ssm ? `<div style="font-size:10px;color:#64748b;margin-top:2px;">SSM: ${escapeHtml(c.ssm)}</div>` : ''}
          ${c.address ? `<div style="font-size:10px;color:#475569;margin-top:4px;line-height:1.4;max-width:300px;overflow-wrap:anywhere;">${escapeHtml(c.address)}</div>` : ''}
          <div style="font-size:10px;color:#475569;margin-top:2px;overflow-wrap:anywhere;">
            ${c.phone ? `📞 ${escapeHtml(c.phone)}` : ''}
            ${c.email ? ` &nbsp;|&nbsp; ✉️ ${escapeHtml(c.email)}` : ''}
          </div>
        </div>
      </div>
      <div style="text-align:right;flex:0 0 180px;max-width:180px;">
        <div style="font-size:28px;font-weight:800;color:#0f172a;letter-spacing:-1px;line-height:1;">INVOICE</div>
        <div style="font-size:11px;font-weight:600;color:#0ea5e9;margin-top:4px;font-family:monospace;overflow-wrap:anywhere;">${escapeHtml(data.invoiceNo)}</div>
        <div style="display:inline-block;margin-top:8px;padding:3px 10px;background:${statusColor};color:white;font-size:9px;font-weight:700;border-radius:3px;letter-spacing:0.5px;">${statusText}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:20px;margin-bottom:16px;">
      <div style="min-width:0;">
        <div style="font-size:10px;text-transform:uppercase;color:#64748b;font-weight:700;letter-spacing:0.5px;margin-bottom:6px;">Dibilkan Kepada</div>
        <div style="font-size:13px;font-weight:700;color:#0f172a;overflow-wrap:anywhere;">${escapeHtml(data.customerName || '-')}</div>
        ${data.customerPhone ? `<div style="font-size:11px;color:#475569;margin-top:2px;overflow-wrap:anywhere;">📞 ${escapeHtml(data.customerPhone)}</div>` : ''}
        ${data.customerAddress ? `<div style="font-size:11px;color:#475569;margin-top:2px;line-height:1.4;overflow-wrap:anywhere;">${escapeHtml(data.customerAddress)}</div>` : ''}
      </div>
      <div style="text-align:right;min-width:0;">
        <div style="font-size:10px;text-transform:uppercase;color:#64748b;font-weight:700;letter-spacing:0.5px;margin-bottom:6px;">Tarikh</div>
        <div style="font-size:11px;color:#0f172a;"><strong>Tarikh Invoice:</strong> ${formatDisplayDate(data.invoiceDate)}</div>
        <div style="font-size:11px;color:#0f172a;"><strong>Tarikh Due:</strong> ${formatDisplayDate(data.dueDate)}</div>
      </div>
    </div>

    ${deviceInfo ? `
    <div style="background:#eff6ff;border:1px solid #bfdbfe;padding:10px 14px;margin-bottom:16px;border-radius:6px;overflow-wrap:anywhere;">
      <div style="font-size:10px;text-transform:uppercase;color:#1e40af;font-weight:700;letter-spacing:0.5px;margin-bottom:6px;">🖥️ Maklumat Peranti</div>
      <div style="font-size:11px;color:#1e3a8a;line-height:1.6;">${deviceInfo}</div>
    </div>
    ` : ''}

    <table style="margin-bottom:8px;table-layout:fixed;width:100%;">
      <thead>
        <tr>
          <th style="width:6%;">Bil</th>
          <th style="width:44%;">Keterangan Item / Perkhidmatan</th>
          <th style="width:10%;" class="text-center">Kty</th>
          <th style="width:19%;" class="text-right">Harga (RM)</th>
          <th style="width:21%;" class="text-right">Jumlah (RM)</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>

    <div style="display:flex;justify-content:flex-end;margin-bottom:16px;">
      <div style="width:250px;max-width:48%;">
        <div style="display:flex;justify-content:space-between;gap:12px;padding:6px 0;font-size:11px;color:#475569;">
          <span>Subtotal</span><span style="font-family:monospace;white-space:nowrap;">${formatCurrency(data.subtotal)}</span>
        </div>
        ${data.discount > 0 ? `<div style="display:flex;justify-content:space-between;gap:12px;padding:6px 0;font-size:11px;color:#444;"><span>Diskaun</span><span style="font-family:monospace;white-space:nowrap;">- ${formatCurrency(data.discount)}</span></div>` : ''}
        ${data.tax > 0 ? `<div style="display:flex;justify-content:space-between;gap:12px;padding:6px 0;font-size:11px;color:#475569;"><span>SST (6%)</span><span style="font-family:monospace;white-space:nowrap;">${formatCurrency(data.tax)}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;gap:12px;padding:10px 12px;margin-top:6px;background:#626262;color:#fff;border:1px solid #4b4b4b;border-radius:4px;">
          <span style="font-weight:700;font-size:12px;color:#fff;">JUMLAH BESAR</span>
          <span style="font-family:monospace;font-weight:800;font-size:14px;color:#fff;white-space:nowrap;">${formatCurrency(data.grandTotal)}</span>
        </div>
      </div>
    </div>

    ${bankHtml}

    <div style="margin-top:20px;padding:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;">
      <div style="font-size:10px;text-transform:uppercase;color:#475569;font-weight:700;letter-spacing:0.5px;margin-bottom:8px;">Syarat & Terma</div>
      <ol style="font-size:10px;color:#334155;line-height:1.7;padding-left:16px;margin:0;">
        <li>Waranti komponen baru 1-3 tahun mengikut pengeluar.</li>
        <li>Waranti perkhidmatan membaiki adalah 30 hari dari tarikh penyerahan.</li>
        <li>Barangan yang tidak dituntut melebihi 60 hari berhak dilupuskan.</li>
        <li>Data pelanggan akan dipadam dari peranti selepas 14 hari melainkan diminta untuk disimpan.</li>
        <li>Bayaran hendaklah dibuat dalam tempoh 7 hari dari tarikh invoice.</li>
      </ol>
    </div>

    <div style="margin-top:42px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:36px;">
      <div style="min-width:0;">
        <div style="border-top:1.5px solid #0f172a;padding-top:7px;font-size:10px;color:#475569;">
          <div>Tandatangan Pelanggan</div>
          <div style="font-size:9px;margin-top:6px;overflow-wrap:anywhere;color:#1f2937;">Nama: ${escapeHtml(data.customerName || '________________')}</div>
          <div style="font-size:9px;margin-top:15px;color:#1f2937;">Tarikh: <span style="display:inline-block;width:145px;border-bottom:1px solid #6b7280;vertical-align:middle;margin-left:5px;">&nbsp;</span></div>
        </div>
      </div>
      <div style="min-width:0;">
        <div style="border-top:1.5px solid #0f172a;padding-top:7px;font-size:10px;color:#475569;text-align:right;">
          <div>Tandatangan &amp; Cop Syarikat</div>
          <div style="font-size:9px;margin-top:6px;overflow-wrap:anywhere;color:#1f2937;">${escapeHtml(c.name || 'TechFix Enterprise')}</div>
          <div style="font-size:9px;margin-top:15px;color:#1f2937;">Tarikh: <span style="display:inline-block;width:145px;border-bottom:1px solid #6b7280;vertical-align:middle;margin-left:5px;">&nbsp;</span></div>
        </div>
      </div>
    </div>

    <div style="margin-top:30px;text-align:center;padding-top:14px;">
      <div style="font-size:11px;color:#374151;font-weight:700;">Terima kasih atas sokongan anda! 🙏</div>
      <div style="font-size:9px;color:#9ca3af;margin-top:4px;">Invoice ini dijana secara elektronik oleh MyInvois</div>
    </div>
  `;

  document.getElementById('pdfContent').innerHTML = html;
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// ============ PDF GENERATION ============
function generatePDF(invoiceNo) {
  const element = document.getElementById('pdfContent');
  const previous = {
    width: element.style.width,
    maxWidth: element.style.maxWidth,
    padding: element.style.padding,
    margin: element.style.margin,
    boxSizing: element.style.boxSizing,
    overflow: element.style.overflow,
  };

  element.style.width = '185mm';
  element.style.maxWidth = '185mm';
  element.style.padding = '0';
  element.style.margin = '0';
  element.style.boxSizing = 'border-box';
  element.style.overflow = 'visible';

  const renderWidth = Math.ceil(element.getBoundingClientRect().width);
  const opt = {
    margin: [10, 10, 10, 10],
    filename: `${invoiceNo}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      windowWidth: renderWidth,
      width: renderWidth,
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  };

  showToast('📄 Sedang menjana PDF...');

  html2pdf().set(opt).from(element).save().then(() => {
    showToast('✅ PDF berjaya dimuat turun!');
  }).catch(err => {
    console.error(err);
    showToast('❌ Gagal menjana PDF');
  }).finally(() => {
    element.style.width = previous.width;
    element.style.maxWidth = previous.maxWidth;
    element.style.padding = previous.padding;
    element.style.margin = previous.margin;
    element.style.boxSizing = previous.boxSizing;
    element.style.overflow = previous.overflow;
  });
}

// ============ SETTINGS MODAL ============
function openSettingsModal() {
  const c = state.company;
  document.getElementById('companyName').value = c.name || '';
  document.getElementById('companySSM').value = c.ssm || '';
  document.getElementById('companyPhone').value = c.phone || '';
  document.getElementById('companyEmail').value = c.email || '';
  document.getElementById('companyAddress').value = c.address || '';
  document.getElementById('bankName').value = c.bankName || '';
  document.getElementById('bankAccount').value = c.bankAccount || '';
  document.getElementById('bankHolder').value = c.bankHolder || '';
  updateLogoPreview();
  document.getElementById('settingsModal').classList.remove('hidden');
}

function updateLogoPreview() {
  const preview = document.getElementById('logoPreview');
  if (state.company.logo) {
    preview.innerHTML = `<img src="${state.company.logo}" style="width:100%;height:100%;object-fit:contain;" />`;
  } else {
    preview.innerHTML = '<span class="text-slate-400 text-xs">Tiada</span>';
  }
}

function handleLogoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    showToast('⚠️ Logo terlalu besar (max 2MB)');
    return;
  }
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX = 400;
      let { width, height } = img;
      if (width > height) {
        if (width > MAX) { height = height * MAX / width; width = MAX; }
      } else {
        if (height > MAX) { width = width * MAX / height; height = MAX; }
      }
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      state.company.logo = canvas.toDataURL('image/jpeg', 0.85);
      storage.set(STORAGE_KEYS.COMPANY, state.company);
      updateLogoPreview();
      showToast('✅ Logo dimuat naik');
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function handleSaveSettings() {
  state.company.name = document.getElementById('companyName').value;
  state.company.ssm = document.getElementById('companySSM').value;
  state.company.phone = document.getElementById('companyPhone').value;
  state.company.email = document.getElementById('companyEmail').value;
  state.company.address = document.getElementById('companyAddress').value;
  state.company.bankName = document.getElementById('bankName').value;
  state.company.bankAccount = document.getElementById('bankAccount').value;
  state.company.bankHolder = document.getElementById('bankHolder').value;
  storage.set(STORAGE_KEYS.COMPANY, state.company);
  document.getElementById('settingsModal').classList.add('hidden');
  showToast('💾 Tetapan syarikat disimpan!');
}

// ============ HISTORY MODAL ============
function openHistoryModal() {
  const list = document.getElementById('historyList');
  if (state.invoices.length === 0) {
    list.innerHTML = `
      <div class="text-center py-12 text-slate-400">
        <div class="text-5xl mb-3">📭</div>
        <p class="text-sm">Tiada invoice disimpan lagi.</p>
      </div>
    `;
  } else {
    list.innerHTML = state.invoices.map(inv => {
      const statusColor = inv.status === 'Paid' ? 'bg-green-100 text-green-700' : inv.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';
      const statusText = inv.status === 'Paid' ? 'Paid' : inv.status === 'Pending' ? 'Pending' : 'Unpaid';
      return `
        <div class="bg-slate-50 rounded-xl p-3 border border-slate-200 hover:border-brand-300 transition-all">
          <div class="flex items-start justify-between gap-2 mb-2">
            <div class="min-w-0">
              <div class="font-mono font-bold text-sm text-slate-900 truncate">${escapeHtml(inv.invoiceNo)}</div>
              <div class="text-xs text-slate-500 truncate">${escapeHtml(inv.customerName)} • ${formatDisplayDate(inv.invoiceDate)}</div>
            </div>
            <div class="text-right flex-shrink-0">
              <div class="font-bold text-brand-600 font-mono text-sm">${formatCurrency(inv.grandTotal)}</div>
              <span class="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor}">${statusText}</span>
            </div>
          </div>
          <div class="flex gap-2">
            <button data-load-invoice="${inv.invoiceNo}" class="flex-1 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg hover:bg-brand-50 hover:border-brand-300">📂 Buka</button>
            <button data-pdf-invoice="${inv.invoiceNo}" class="flex-1 py-1.5 text-xs font-semibold bg-brand-500 text-white rounded-lg hover:bg-brand-600">📄 PDF</button>
            <button data-delete-invoice="${inv.invoiceNo}" class="py-1.5 px-3 text-xs font-semibold bg-red-50 text-red-600 rounded-lg hover:bg-red-100">🗑️</button>
          </div>
        </div>
      `;
    }).join('');
  }
  document.getElementById('historyModal').classList.remove('hidden');
}

document.addEventListener('click', (e) => {
  const loadBtn = e.target.closest('[data-load-invoice]');
  if (loadBtn) {
    const no = loadBtn.dataset.loadInvoice;
    const inv = state.invoices.find(i => i.invoiceNo === no);
    if (!inv) return;
    document.getElementById('invoiceNo').value = inv.invoiceNo;
    document.getElementById('invoiceDate').value = inv.invoiceDate;
    document.getElementById('dueDate').value = inv.dueDate;
    document.getElementById('status').value = inv.status;
    document.getElementById('customerName').value = inv.customerName || '';
    document.getElementById('customerPhone').value = inv.customerPhone || '';
    document.getElementById('customerAddress').value = inv.customerAddress || '';
    document.getElementById('deviceModel').value = inv.deviceModel || '';
    document.getElementById('deviceSerial').value = inv.deviceSerial || '';
    document.getElementById('deviceRma').value = inv.deviceRma || '';
    document.getElementById('deviceIssue').value = inv.deviceIssue || '';
    document.getElementById('discountValue').value = inv.discountValue || 0;
    document.getElementById('discountType').value = inv.discountType || 'amount';
    document.getElementById('taxEnabled').checked = !!inv.taxEnabled;
    state.items = inv.items.map(i => ({ ...i }));
    renderItems();
    recalc();
    saveDraft();
    document.getElementById('historyModal').classList.add('hidden');
    showToast(`📂 Invoice ${no} dimuatkan`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const pdfBtn = e.target.closest('[data-pdf-invoice]');
  if (pdfBtn) {
    const no = pdfBtn.dataset.pdfInvoice;
    const inv = state.invoices.find(i => i.invoiceNo === no);
    if (!inv) return;
    buildPDFContent(inv);
    generatePDF(inv.invoiceNo);
  }

  const delBtn = e.target.closest('[data-delete-invoice]');
  if (delBtn) {
    const no = delBtn.dataset.deleteInvoice;
    if (!confirm(`Padam invoice ${no}?`)) return;
    state.invoices = state.invoices.filter(i => i.invoiceNo !== no);
    storage.set(STORAGE_KEYS.INVOICES, state.invoices);
    openHistoryModal();
    showToast(`🗑️ Invoice ${no} dipadam`);
  }
});

// ============ TOAST ============
function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

// ============ PWA ============
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW failed:', err));
  }
}

let deferredPrompt = null;
function handleInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('installBtn').classList.remove('hidden');
  });

  document.getElementById('installBtn').addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') showToast('🎉 App dipasang!');
    deferredPrompt = null;
    document.getElementById('installBtn').classList.add('hidden');
  });

  window.addEventListener('appinstalled', () => {
    document.getElementById('installBtn').classList.add('hidden');
  });
}

// ============ START ============
document.addEventListener('DOMContentLoaded', init);