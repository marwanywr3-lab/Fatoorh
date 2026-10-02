// --- إدارة البيانات وحالة التطبيق ---
const STORAGE_KEY_PRODUCTS = 'warm_invoice_products';
const STORAGE_KEY_SETTINGS = 'warm_invoice_settings';

// بيانات أولية في حال كانت الذاكرة فارغة
const defaultProducts = [
  { id: 1, name: 'قهوة مختصة (بن)', price: 45, image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=150&auto=format&fit=crop&q=60' },
  { id: 2, name: 'كوب سيراميك يدوي', price: 65, image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=150&auto=format&fit=crop&q=60' },
  { id: 3, name: 'دفتر ملاحظات جلدي', price: 38, image: '' }
];

let products = JSON.parse(localStorage.getItem(STORAGE_KEY_PRODUCTS)) || defaultProducts;
let invoiceItems = [];

// عناصر واجهة المستخدم
const companyNameInput = document.getElementById('companyName');
const clientNameInput = document.getElementById('clientName');
const invoiceNumberInput = document.getElementById('invoiceNumber');
const invoiceDateInput = document.getElementById('invoiceDate');

const viewCompany = document.getElementById('viewCompany');
const viewClient = document.getElementById('viewClient');
const viewInvoiceNumber = document.getElementById('viewInvoiceNumber');
const viewDate = document.getElementById('viewDate');

const catalogList = document.getElementById('catalogList');
const newProductForm = document.getElementById('newProductForm');
const invoiceItemsTable = document.getElementById('invoiceItems');

const subtotalEl = document.getElementById('subtotal');
const taxEl = document.getElementById('tax');
const grandTotalEl = document.getElementById('grandTotal');

const downloadPdfBtn = document.getElementById('downloadPdfBtn');
const downloadImgBtn = document.getElementById('downloadImgBtn');

// --- تهيئة التطبيق ---
function init() {
  // ضبط التاريخ الافتراضي لليوم
  const today = new Date().toISOString().split('T')[0];
  invoiceDateInput.value = today;
  viewDate.textContent = today;

  // استرجاع اسم الشركة المحفوظ إن وجد
  const savedSettings = JSON.parse(localStorage.getItem(STORAGE_KEY_SETTINGS));
  if (savedSettings && savedSettings.companyName) {
    companyNameInput.value = savedSettings.companyName;
    viewCompany.textContent = savedSettings.companyName;
  }

  renderCatalog();
  setupEventListeners();
}

// --- أحداث التفاعل (Event Listeners) ---
function setupEventListeners() {
  // تحديث النصوص الفورية في الفاتورة
  companyNameInput.addEventListener('input', (e) => {
    const val = e.target.value.trim() || 'اسم الشركة أو المتجر';
    viewCompany.textContent = val;
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify({ companyName: e.target.value.trim() }));
  });

  clientNameInput.addEventListener('input', (e) => {
    viewClient.textContent = e.target.value.trim() || 'عميل افتراضي';
  });

  invoiceNumberInput.addEventListener('input', (e) => {
    viewInvoiceNumber.textContent = e.target.value.trim() || 'INV-001';
  });

  invoiceDateInput.addEventListener('change', (e) => {
    viewDate.textContent = e.target.value || '-';
  });

  // إضافة منتج جديد للكتالوج
  newProductForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('prodName').value.trim();
    const price = parseFloat(document.getElementById('prodPrice').value);
    const image = document.getElementById('prodImage').value.trim();

    if (!name || isNaN(price)) return;

    const newProd = {
      id: Date.now(),
      name,
      price,
      image
    };

    products.push(newProd);
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
    renderCatalog();
    newProductForm.reset();
  });

  // تنزيل كـ PDF
  downloadPdfBtn.addEventListener('click', () => {
    const element = document.getElementById('invoiceSheet');
    const opt = {
      margin:       10,
      filename:     `${viewInvoiceNumber.textContent || 'invoice'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  });

  // تنزيل كصورة
  downloadImgBtn.addEventListener('click', () => {
    const element = document.getElementById('invoiceSheet');
    html2canvas(element, { scale: 2, useCORS: true }).then((canvas) => {
      const link = document.createElement('a');
      link.download = `${viewInvoiceNumber.textContent || 'invoice'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  });
}

// --- رسم الكتالوج ---
function renderCatalog() {
  catalogList.innerHTML = '';
  products.forEach((prod) => {
    const itemCard = document.createElement('div');
    itemCard.className = 'catalog-item';
    
    // صورة افتراضية في حال عدم وجود رابط
    const imgSrc = prod.image || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="60" viewBox="0 0 100 60"><rect width="100%" height="100%" fill="%23e7dfd5"/><text x="50%" y="55%" font-size="12" fill="%238a6d58" text-anchor="middle" font-family="sans-serif">بدون صورة</text></svg>';

    itemCard.innerHTML = `
      <img src="${imgSrc}" alt="${prod.name}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'100\\' height=\\'60\\'><rect width=\\'100%\\' height=\\'100%\\' fill=\\'%23e7dfd5\\'/></svg>'">
      <span class="item-title">${prod.name}</span>
      <span class="item-price">${prod.price.toFixed(2)} ر.س</span>
    `;

    itemCard.addEventListener('click', () => {
      addToInvoice(prod);
    });

    catalogList.appendChild(itemCard);
  });
}

// --- إضافة وتعديل عناصر الفاتورة ---
function addToInvoice(product) {
  const existing = invoiceItems.find((item) => item.id === product.id);
  if (existing) {
    existing.qty += 1;
  } else {
    invoiceItems.push({
      id: product.id,
      name: product.name,
      price: product.price,
      qty: 1
    });
  }
  renderInvoiceTable();
}

function updateQuantity(id, newQty) {
  const item = invoiceItems.find((item) => item.id === id);
  if (item) {
    const qty = parseInt(newQty, 10);
    if (qty <= 0 || isNaN(qty)) {
      removeFromInvoice(id);
    } else {
      item.qty = qty;
      renderInvoiceTable();
    }
  }
}

function removeFromInvoice(id) {
  invoiceItems = invoiceItems.filter((item) => item.id !== id);
  renderInvoiceTable();
}

// --- رسم جدول الفاتورة وحساب الإجماليات ---
function renderInvoiceTable() {
  invoiceItemsTable.innerHTML = '';

  let subtotal = 0;

  invoiceItems.forEach((item) => {
    const itemTotal = item.price * item.qty;
    subtotal += itemTotal;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.name}</td>
      <td>${item.price.toFixed(2)} ر.س</td>
      <td>
        <input type="number" min="1" class="qty-input" value="${item.qty}" data-id="${item.id}">
      </td>
      <td>${itemTotal.toFixed(2)} ر.س</td>
      <td class="no-print">
        <button class="btn-remove" data-id="${item.id}">حذف</button>
      </td>
    `;

    // تعديل الكمية
    tr.querySelector('.qty-input').addEventListener('change', (e) => {
      updateQuantity(item.id, e.target.value);
    });

    // حذف عنصر
    tr.querySelector('.btn-remove').addEventListener('click', () => {
      removeFromInvoice(item.id);
    });

    invoiceItemsTable.appendChild(tr);
  });

  // الحسابات (الضريبة 15%)
  const tax = subtotal * 0.15;
  const grandTotal = subtotal + tax;

  subtotalEl.textContent = `${subtotal.toFixed(2)} ر.س`;
  taxEl.textContent = `${tax.toFixed(2)} ر.س`;
  grandTotalEl.textContent = `${grandTotal.toFixed(2)} ر.س`;
}

// تشغيل التطبيق عند اكتمال تحميل الصفحة
document.addEventListener('DOMContentLoaded', init);
