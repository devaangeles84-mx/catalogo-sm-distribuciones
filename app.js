const API_BASE = "/api";
const STORAGE_KEYS = {
  cart: "sm_cart",
  token: "sm_admin_token",
  demoOrders: "sm_demo_orders"
};

const LOCAL_DEMO_ADMIN = {
  username: "admin",
  password: "admin123",
  token: "local-demo-admin"
};

const currency = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN"
});

const SAMPLE_PRODUCTS = [
  {
    idProducto: "PROD-001",
    producto: "Soporte metalico manubrio Pro",
    descripcion: "Soporte firme para celular con ajuste al manubrio.",
    categoria: "Soportes",
    precio: 95,
    inventario: 18,
    estatus: "Activo",
    imagen1Url: "./assets/products/soporte-manubrio-pro-1.png",
    imagen2Url: "./assets/products/soporte-manubrio-pro-2.png",
    imagen3Url: "./assets/products/soporte-cargador-manubrio.png",
    fechaAlta: "2026-07-01",
    fechaActualizacion: "2026-07-01"
  },
  {
    idProducto: "PROD-002",
    producto: "Soporte metalico manubrio Pro compacto",
    descripcion: "Modelo compacto para manubrio con giro ajustable.",
    categoria: "Soportes",
    precio: 89,
    inventario: 24,
    estatus: "Activo",
    imagen1Url: "./assets/products/soporte-manubrio-pro-2.png",
    imagen2Url: "",
    imagen3Url: "",
    fechaAlta: "2026-07-01",
    fechaActualizacion: "2026-07-01"
  },
  {
    idProducto: "PROD-003",
    producto: "Soporte metalico para manubrio con cargador",
    descripcion: "Incluye conexion para carga y base reforzada.",
    categoria: "Soportes con carga",
    precio: 99,
    inventario: 11,
    estatus: "Activo",
    imagen1Url: "./assets/products/soporte-cargador-manubrio.png",
    imagen2Url: "",
    imagen3Url: "",
    fechaAlta: "2026-07-01",
    fechaActualizacion: "2026-07-01"
  },
  {
    idProducto: "PROD-004",
    producto: "Soporte metalico para retrovisor con cargador",
    descripcion: "Base para retrovisor con cargador integrado.",
    categoria: "Soportes con carga",
    precio: 99,
    inventario: 9,
    estatus: "Activo",
    imagen1Url: "./assets/products/soporte-retrovisor-cargador.png",
    imagen2Url: "",
    imagen3Url: "",
    fechaAlta: "2026-07-01",
    fechaActualizacion: "2026-07-01"
  },
  {
    idProducto: "PROD-005",
    producto: "Soporte para celular con sombrilla ajuste retrovisor",
    descripcion: "Protege la pantalla del sol y se ajusta al retrovisor.",
    categoria: "Accesorios",
    precio: 89,
    inventario: 14,
    estatus: "Activo",
    imagen1Url: "./assets/products/soporte-sombrilla-retrovisor.png",
    imagen2Url: "./assets/products/soporte-sombrilla-manubrio.png",
    imagen3Url: "",
    fechaAlta: "2026-07-01",
    fechaActualizacion: "2026-07-01"
  },
  {
    idProducto: "PROD-006",
    producto: "Soporte para celular con sombrilla manubrio",
    descripcion: "Soporte con cubierta tipo sombrilla para manubrio.",
    categoria: "Accesorios",
    precio: 90,
    inventario: 0,
    estatus: "Sin stock",
    imagen1Url: "./assets/products/soporte-sombrilla-manubrio.png",
    imagen2Url: "",
    imagen3Url: "",
    fechaAlta: "2026-07-01",
    fechaActualizacion: "2026-07-01"
  },
  {
    idProducto: "PROD-007",
    producto: "Soporte para celular con casco ajuste retrovisor",
    descripcion: "Base con proteccion para uso en moto o bicicleta.",
    categoria: "Accesorios",
    precio: 89,
    inventario: 7,
    estatus: "Activo",
    imagen1Url: "./assets/products/soporte-casco-retrovisor.png",
    imagen2Url: "",
    imagen3Url: "",
    fechaAlta: "2026-07-01",
    fechaActualizacion: "2026-07-01"
  }
];

const SAMPLE_ORDERS = [
  {
    folio: "PED-20260701-0001",
    fechaPedido: "2026-07-01T10:20:00",
    clienteNombre: "Distribuidora Demo",
    clienteTelefono: "3330000000",
    clienteCorreo: "compras@example.com",
    itemsJson: JSON.stringify([
      { idProducto: "PROD-001", producto: "Soporte metalico manubrio Pro", cantidad: 3, precio: 95, subtotal: 285 },
      { idProducto: "PROD-003", producto: "Soporte metalico para manubrio con cargador", cantidad: 2, precio: 99, subtotal: 198 }
    ]),
    piezasTotales: 5,
    montoTotal: 483,
    estatusPedido: "Nuevo",
    fechaSurtido: "",
    notasAdmin: "",
    fechaActualizacion: "2026-07-01T10:20:00"
  }
];

let state = {
  products: [],
  filteredProducts: [],
  cart: loadJson(STORAGE_KEYS.cart, {}),
  gallery: { open: false, images: [], index: 0, zoomed: false, title: "" },
  drawerOpen: false,
  publicConfig: { storeWhatsappNumber: "" },
  admin: {
    token: sessionStorage.getItem(STORAGE_KEYS.token) || "",
    tab: "dashboard",
    products: [],
    orders: [],
    movements: [],
    selectedProduct: null,
    selectedOrder: null,
    dashboard: null
  }
};

const app = document.querySelector("#app");
const toastNode = document.querySelector("#toast");

window.addEventListener("hashchange", render);

init();

async function init() {
  await loadPublicConfig();
  await loadPublicProducts();
  render();
}

async function loadPublicConfig() {
  const result = await callApi("getPublicConfig", {}, { quiet: true });
  state.publicConfig = {
    storeWhatsappNumber: result?.storeWhatsappNumber || ""
  };
}

async function loadPublicProducts() {
  const result = await callApi("listarProductosPublicos", {}, { quiet: true });
  state.products = Array.isArray(result?.products) ? result.products : SAMPLE_PRODUCTS;
  applyPublicFilters();
}

function applyPublicFilters() {
  const search = document.querySelector("#search")?.value?.trim().toLowerCase() || "";
  const category = document.querySelector("#category")?.value || "Todas";
  state.filteredProducts = state.products
    .filter((product) => ["Activo", "Sin stock"].includes(product.estatus))
    .filter((product) => category === "Todas" || product.categoria === category)
    .filter((product) => !search || product.producto.toLowerCase().includes(search));
}

function render() {
  if (location.hash === "#admin") {
    renderAdmin();
    return;
  }
  renderPublic();
}

function renderPublic() {
  const categories = ["Todas", ...new Set(state.products
    .filter((product) => ["Activo", "Sin stock"].includes(product.estatus))
    .map((product) => product.categoria)
    .filter(Boolean))];
  const cartCount = cartItems().reduce((sum, item) => sum + item.cantidad, 0);

  app.innerHTML = `
    <div class="shell">
      <header class="topbar">
        <div class="topbar-inner">
          <a class="brand" href="#" aria-label="Catalogo SM Distribuciones">
            <img src="./assets/logo-sm-distribuciones.png" alt="SM Distribuciones" />
            <span class="brand-subtitle">GDL. JAL</span>
          </a>
          <div class="nav-actions">
            <a class="admin-link hide-mobile" href="#admin">Admin</a>
            <button class="cart-button" type="button" data-action="toggle-cart" aria-label="Abrir carrito">
              <span class="cart-button-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M5 6h2l1.4 8.4a2 2 0 0 0 2 1.6h6.8a2 2 0 0 0 1.9-1.4L21 9H8"/><path d="M10 20a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8ZM18 20a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8Z"/></svg>
              </span>
              <span>Carrito</span>
              <span class="cart-count">${cartCount}</span>
            </button>
          </div>
        </div>
      </header>

      <section class="hero">
        <div class="hero-inner">
          <div class="hero-title-row">
            <div>
              <span class="hero-kicker">Atencion a distribuidores</span>
              <h1 class="catalog-title">Catalogo SM Distribuciones</h1>
              <div class="catalog-meta">
                <span>Catalogo general de productos</span>
                <strong>Pedidos sujetos a existencia y confirmacion de tienda.</strong>
              </div>
            </div>
            <div class="policy-card">
              <span class="policy-card-title">Politicas de compra</span>
              <p>
                <span class="note-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><path d="M7 3h10v18l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2V3Z"/><path d="M9 8h6M9 12h6"/></svg>
                </span>
                <span>Si requiere factura, los precios son mas IVA.</span>
              </p>
              <p>
                <span class="note-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7z"/><path d="M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM18 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/></svg>
                </span>
                <span>En envios foraneos, la compra de $10,000 o mas incluye envio gratis.</span>
              </p>
              <p>
                <span class="note-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 4.4 2.8 8.4 7 10 4.2-1.6 7-5.6 7-10V6l-7-3Z"/><path d="m9.5 12 1.8 1.8 3.5-4"/></svg>
                </span>
                <span>El seguro de envio es opcional. SM Distribuciones no se hace responsable por paquetes perdidos en paqueteria.</span>
              </p>
            </div>
          </div>
          <div class="notice">
            <span class="notice-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M3 6h18v12H3z"/><path d="M3 10h18"/><path d="M7 15h4"/></svg>
            </span>
            <span>Se aceptan pagos con tarjeta y link de pago en productos del catalogo.</span>
          </div>
        </div>
      </section>

      <main class="workspace">
        <section class="toolbar" aria-label="Filtros del catalogo">
          <div class="toolbar-row">
            <label class="field">
              <span>Buscar producto</span>
              <input id="search" type="search" placeholder="Nombre del producto" />
            </label>
            <label class="field">
              <span>Categoria</span>
              <select id="category">
                ${categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("")}
              </select>
            </label>
            <div class="field">
              <span>Productos visibles</span>
              <button class="secondary-button" type="button" data-action="reload-products">Actualizar catalogo</button>
            </div>
          </div>
        </section>

        <section id="catalog" class="catalog-grid">
          ${state.filteredProducts.map(renderProductCard).join("") || `<div class="empty-state">No hay productos con esos filtros.</div>`}
        </section>
      </main>

      ${renderCartDrawer()}
      ${renderGalleryModal()}
    </div>
  `;

  bindPublicEvents();
}

function renderProductCard(product) {
  const images = getProductImages(product);
  const outOfStock = product.estatus === "Sin stock" || Number(product.inventario) <= 0;
  return `
    <article class="product-card">
      <div class="product-media">
        ${outOfStock ? `<span class="badge stock-badge">Sin stock</span>` : ""}
        <img src="${escapeAttr(images[0] || "./assets/products/soporte-manubrio-pro-1.png")}" alt="${escapeAttr(product.producto)}" />
      </div>
      <div class="product-body">
        <span class="badge">${escapeHtml(product.categoria || "General")}</span>
        <h2 class="product-name">${escapeHtml(product.producto)}</h2>
        <p class="product-description">${escapeHtml(product.descripcion || "Producto disponible en catalogo.")}</p>
        <div class="price-row">
          <span class="price">${currency.format(Number(product.precio) || 0)}</span>
        </div>
        <div class="card-actions">
          <button class="secondary-button" type="button" data-action="open-gallery" data-id="${escapeAttr(product.idProducto)}">Ver fotos</button>
          <button class="primary-button" type="button" data-action="add-cart" data-id="${escapeAttr(product.idProducto)}" ${outOfStock ? "disabled" : ""}>Agregar</button>
        </div>
      </div>
    </article>
  `;
}

function renderCartDrawer() {
  const items = cartItems();
  const totals = cartTotals(items);
  return `
    <aside class="drawer ${state.drawerOpen ? "open" : ""}" aria-label="Carrito">
      <div class="drawer-header">
        <h2>Pedido</h2>
        <button class="icon-button" type="button" data-action="toggle-cart" aria-label="Cerrar carrito">×</button>
      </div>
      <div class="drawer-content">
        ${items.length ? items.map(renderCartItem).join("") : `<div class="empty-state">Agrega productos para iniciar un pedido.</div>`}
        <div class="summary-box">
          <div class="summary-row"><span>Total de piezas</span><strong>${totals.piezas}</strong></div>
          <div class="summary-row"><span>Monto total</span><strong>${currency.format(totals.total)}</strong></div>
        </div>
        <form id="order-form" class="form-grid">
          <label class="field">
            <span>Nombre o razon social</span>
            <input name="clienteNombre" required autocomplete="name" />
          </label>
          <label class="field">
            <span>Telefono</span>
            <input name="clienteTelefono" required inputmode="tel" autocomplete="tel" />
          </label>
          <label class="field">
            <span>Correo electronico</span>
            <input name="clienteCorreo" required type="email" autocomplete="email" />
          </label>
          <button class="primary-button" type="submit" ${items.length ? "" : "disabled"}>Confirmar y enviar por WhatsApp</button>
        </form>
      </div>
    </aside>
  `;
}

function renderCartItem(item) {
  return `
    <div class="cart-item">
      <div class="cart-item-title">${escapeHtml(item.producto)}</div>
      <div class="qty-row">
        <span>${currency.format(item.precio)} c/u</span>
        <div class="qty-control">
          <button type="button" data-action="cart-dec" data-id="${escapeAttr(item.idProducto)}">-</button>
          <input value="${item.cantidad}" readonly aria-label="Cantidad" />
          <button type="button" data-action="cart-inc" data-id="${escapeAttr(item.idProducto)}">+</button>
        </div>
      </div>
      <div class="summary-row">
        <span>Subtotal</span>
        <strong>${currency.format(item.subtotal)}</strong>
      </div>
      <button class="danger-button" type="button" data-action="cart-remove" data-id="${escapeAttr(item.idProducto)}">Quitar</button>
    </div>
  `;
}

function renderGalleryModal() {
  const gallery = state.gallery;
  const image = gallery.images[gallery.index] || "";
  return `
    <div class="modal-backdrop ${gallery.open ? "open" : ""}" role="dialog" aria-modal="true">
      <div class="modal">
        <div class="modal-header">
          <h2>${escapeHtml(gallery.title || "Fotos")}</h2>
          <button class="icon-button" type="button" data-action="close-gallery" aria-label="Cerrar galeria">×</button>
        </div>
        <div class="gallery-stage">
          ${image ? `<img class="${gallery.zoomed ? "zoomed" : ""}" src="${escapeAttr(image)}" alt="${escapeAttr(gallery.title)}" />` : ""}
        </div>
        <div class="gallery-controls">
          <button class="secondary-button" type="button" data-action="prev-gallery">Anterior</button>
          <button class="secondary-button" type="button" data-action="toggle-zoom">${gallery.zoomed ? "Quitar zoom" : "Ampliar"}</button>
          <button class="secondary-button" type="button" data-action="next-gallery">Siguiente</button>
        </div>
      </div>
    </div>
  `;
}

function bindPublicEvents() {
  document.querySelector("#search")?.addEventListener("input", () => {
    applyPublicFilters();
    document.querySelector("#catalog").innerHTML = state.filteredProducts.map(renderProductCard).join("") || `<div class="empty-state">No hay productos con esos filtros.</div>`;
  });
  document.querySelector("#category")?.addEventListener("change", () => {
    applyPublicFilters();
    document.querySelector("#catalog").innerHTML = state.filteredProducts.map(renderProductCard).join("") || `<div class="empty-state">No hay productos con esos filtros.</div>`;
  });
  document.querySelector("#order-form")?.addEventListener("submit", handleOrderSubmit);
  document.body.addEventListener("click", handleGlobalClick, { once: true });
}

function handleGlobalClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) {
    document.body.addEventListener("click", handleGlobalClick, { once: true });
    return;
  }
  const action = button.dataset.action;
  const id = button.dataset.id;

  if (action === "toggle-cart") state.drawerOpen = !state.drawerOpen;
  if (action === "reload-products") loadPublicProducts().then(() => showToast("Catalogo actualizado"));
  if (action === "add-cart") addToCart(id);
  if (action === "cart-inc") updateCartQty(id, 1);
  if (action === "cart-dec") updateCartQty(id, -1);
  if (action === "cart-remove") removeFromCart(id);
  if (action === "open-gallery") openGallery(id);
  if (action === "close-gallery") state.gallery.open = false;
  if (action === "prev-gallery") moveGallery(-1);
  if (action === "next-gallery") moveGallery(1);
  if (action === "toggle-zoom") state.gallery.zoomed = !state.gallery.zoomed;

  render();
}

function getProductImages(product) {
  return [product.imagen1Url, product.imagen2Url, product.imagen3Url].filter(Boolean);
}

function addToCart(id) {
  const product = state.products.find((item) => item.idProducto === id);
  if (!product) return;
  if (product.estatus === "Sin stock" || Number(product.inventario) <= 0) {
    showToast("Producto sin stock");
    return;
  }
  const current = state.cart[id]?.cantidad || 0;
  state.cart[id] = {
    idProducto: product.idProducto,
    producto: product.producto,
    precio: Number(product.precio) || 0,
    cantidad: current + 1
  };
  saveCart();
  state.drawerOpen = true;
  showToast("Producto agregado");
}

function updateCartQty(id, delta) {
  if (!state.cart[id]) return;
  state.cart[id].cantidad += delta;
  if (state.cart[id].cantidad <= 0) delete state.cart[id];
  saveCart();
}

function removeFromCart(id) {
  delete state.cart[id];
  saveCart();
}

function cartItems() {
  return Object.values(state.cart).map((item) => ({
    ...item,
    subtotal: item.cantidad * item.precio
  }));
}

function cartTotals(items = cartItems()) {
  return items.reduce((totals, item) => ({
    piezas: totals.piezas + item.cantidad,
    total: totals.total + item.subtotal
  }), { piezas: 0, total: 0 });
}

function saveCart() {
  localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(state.cart));
}

function openGallery(id) {
  const product = state.products.find((item) => item.idProducto === id);
  if (!product) return;
  state.gallery = {
    open: true,
    images: getProductImages(product),
    index: 0,
    zoomed: false,
    title: product.producto
  };
}

function moveGallery(delta) {
  const count = state.gallery.images.length;
  if (!count) return;
  state.gallery.index = (state.gallery.index + delta + count) % count;
  state.gallery.zoomed = false;
}

async function handleOrderSubmit(event) {
  event.preventDefault();
  const items = cartItems();
  if (!items.length) {
    showToast("No se puede enviar un pedido vacio");
    return;
  }
  const form = new FormData(event.currentTarget);
  const totals = cartTotals(items);
  const payload = {
    clienteNombre: form.get("clienteNombre").trim(),
    clienteTelefono: form.get("clienteTelefono").trim(),
    clienteCorreo: form.get("clienteCorreo").trim(),
    items,
    piezasTotales: totals.piezas,
    montoTotal: totals.total
  };
  const response = await callApi("crearPedido", payload);
  const order = response?.order || createLocalOrder(payload);
  if (!response?.order) storeDemoOrder(order);
  state.cart = {};
  saveCart();
  state.drawerOpen = false;
  openWhatsapp(order);
  showToast(`Pedido ${order.folio} generado`);
  render();
}

function createLocalOrder(payload) {
  const now = new Date();
  const folio = `PED-${formatDateCode(now)}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
  return {
    folio,
    fechaPedido: now.toISOString(),
    ...payload,
    itemsJson: JSON.stringify(payload.items),
    estatusPedido: "Nuevo",
    fechaSurtido: "",
    notasAdmin: "",
    fechaActualizacion: now.toISOString()
  };
}

function storeDemoOrder(order) {
  const existing = loadJson(STORAGE_KEYS.demoOrders, []);
  existing.unshift(order);
  localStorage.setItem(STORAGE_KEYS.demoOrders, JSON.stringify(existing.slice(0, 30)));
}

function openWhatsapp(order) {
  const number = state.publicConfig.storeWhatsappNumber;
  const items = Array.isArray(order.items) ? order.items : parseItems(order.itemsJson);
  const totals = cartTotals(items);
  const lines = [
    `Pedido ${order.folio}`,
    `Fecha: ${formatDateTime(order.fechaPedido)}`,
    `Cliente: ${order.clienteNombre}`,
    `Telefono: ${order.clienteTelefono}`,
    `Correo: ${order.clienteCorreo}`,
    "",
    "Productos:",
    ...items.map((item) => `- ${item.cantidad} x ${item.producto} | ${currency.format(item.precio)} | ${currency.format(item.subtotal)}`),
    "",
    `Total de piezas: ${order.piezasTotales || totals.piezas}`,
    `Monto total: ${currency.format(order.montoTotal || totals.total)}`,
    "Nota: Pedido sujeto a confirmacion de existencia por tienda"
  ];
  if (!number) {
    showToast("Configura STORE_WHATSAPP_NUMBER para abrir WhatsApp");
    return;
  }
  window.open(`https://wa.me/${encodeURIComponent(number)}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener");
}

function renderAdmin() {
  if (!state.admin.token) {
    app.innerHTML = renderAdminLogin();
    document.querySelector("#login-form")?.addEventListener("submit", handleAdminLogin);
    return;
  }

  app.innerHTML = `
    <div class="admin">
      <div class="admin-layout">
        <header class="admin-header">
          <div class="admin-title">
            <h1>Panel administrador</h1>
            <div class="nav-actions">
              <a class="secondary-button" href="#">Catalogo</a>
              <button class="danger-button" type="button" data-admin-action="logout">Salir</button>
            </div>
          </div>
          <div class="tabs">
            ${["dashboard", "productos", "pedidos", "inventario"].map((tab) => `
              <button class="tab ${state.admin.tab === tab ? "active" : ""}" type="button" data-admin-action="tab" data-tab="${tab}">
                ${labelTab(tab)}
              </button>
            `).join("")}
          </div>
        </header>
        ${renderAdminTab()}
      </div>
    </div>
  `;
  bindAdminEvents();
  ensureAdminData();
}

function renderAdminLogin() {
  return `
    <div class="admin">
      <form id="login-form" class="login-card">
        <h1>Acceso administrador</h1>
        <label class="field">
          <span>Usuario</span>
          <input name="username" autocomplete="username" required />
        </label>
        <label class="field">
          <span>Contraseña</span>
          <input name="password" type="password" autocomplete="current-password" required />
        </label>
        <button class="primary-button" type="submit">Iniciar sesion</button>
        <p class="product-description">La contraseña se valida en Netlify Functions con variables de entorno.</p>
      </form>
    </div>
  `;
}

function renderAdminTab() {
  if (state.admin.tab === "productos") return renderProductsAdmin();
  if (state.admin.tab === "pedidos") return renderOrdersAdmin();
  if (state.admin.tab === "inventario") return renderInventoryAdmin();
  return renderDashboardAdmin();
}

function renderDashboardAdmin() {
  const now = new Date();
  const dashboard = state.admin.dashboard || buildLocalDashboard(now.getFullYear(), now.getMonth() + 1);
  const rows = dashboard.orders || [];
  const bars = dashboard.monthlyBars || [];
  const maxBar = Math.max(1, ...bars.map((bar) => Number(bar.monto) || 0));
  return `
    <section class="panel">
      <h2>Dashboard mensual</h2>
      <form class="toolbar-row" id="dashboard-filter">
        <label class="field"><span>Año</span><input name="year" type="number" value="${dashboard.year || now.getFullYear()}" /></label>
        <label class="field"><span>Mes</span><input name="month" type="number" min="1" max="12" value="${dashboard.month || now.getMonth() + 1}" /></label>
        <div class="field"><span>Accion</span><button class="secondary-button" type="submit">Actualizar</button></div>
      </form>
      <div class="metric-grid">
        <div class="metric"><span>Pedidos</span><strong>${dashboard.totalPedidos || 0}</strong></div>
        <div class="metric"><span>Monto</span><strong>${currency.format(dashboard.montoTotal || 0)}</strong></div>
        <div class="metric"><span>Piezas surtidas</span><strong>${dashboard.piezasSurtidas || 0}</strong></div>
        <div class="metric"><span>Pendientes</span><strong>${dashboard.pedidosPendientes || 0}</strong></div>
      </div>
      <div class="bars">
        ${bars.map((bar) => `
          <div class="bar-row">
            <span>${escapeHtml(bar.label)}</span>
            <div class="bar-track"><div class="bar" style="width:${Math.round((bar.monto / maxBar) * 100)}%"></div></div>
            <strong>${currency.format(bar.monto)}</strong>
          </div>
        `).join("")}
      </div>
      ${renderOrdersTable(rows)}
    </section>
  `;
}

function renderProductsAdmin() {
  const product = state.admin.selectedProduct || {};
  const products = state.admin.products.length ? state.admin.products : SAMPLE_PRODUCTS;
  return `
    <section class="panel">
      <h2>${product.idProducto ? "Editar producto" : "Alta de producto"}</h2>
      <form id="product-form" class="form-grid">
        <input type="hidden" name="idProducto" value="${escapeAttr(product.idProducto || "")}" />
        <label class="field"><span>Producto</span><input name="producto" required value="${escapeAttr(product.producto || "")}" /></label>
        <label class="field"><span>Categoria</span><input name="categoria" required value="${escapeAttr(product.categoria || "")}" /></label>
        <label class="field"><span>Precio</span><input name="precio" required type="number" min="0" step="0.01" value="${escapeAttr(product.precio || "")}" /></label>
        <label class="field"><span>Inventario</span><input name="inventario" required type="number" min="0" step="1" value="${escapeAttr(product.inventario ?? "")}" /></label>
        <label class="field"><span>Estatus</span>${renderStatusSelect(product.estatus || "Activo", "estatus")}</label>
        <label class="field"><span>Descripcion</span><textarea name="descripcion" rows="2">${escapeHtml(product.descripcion || "")}</textarea></label>
        <label class="field"><span>Foto 1</span><input name="imagen1" type="file" accept="image/*" capture="environment" /></label>
        <label class="field"><span>Foto 2</span><input name="imagen2" type="file" accept="image/*" /></label>
        <label class="field"><span>Foto 3</span><input name="imagen3" type="file" accept="image/*" /></label>
        <button class="primary-button" type="submit">Guardar producto</button>
        ${product.idProducto ? `<button class="secondary-button" type="button" data-admin-action="new-product">Nuevo producto</button>` : ""}
      </form>
    </section>
    <section class="panel">
      <h2>Productos</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Producto</th><th>Categoria</th><th>Precio</th><th>Inventario</th><th>Estatus</th><th>Acciones</th></tr></thead>
          <tbody>
            ${products.map((item) => `
              <tr>
                <td>${escapeHtml(item.producto)}</td>
                <td>${escapeHtml(item.categoria)}</td>
                <td>${currency.format(Number(item.precio) || 0)}</td>
                <td>${Number(item.inventario) || 0}</td>
                <td>${escapeHtml(item.estatus)}</td>
                <td>
                  <button class="secondary-button" type="button" data-admin-action="edit-product" data-id="${escapeAttr(item.idProducto)}">Editar</button>
                  <button class="danger-button" type="button" data-admin-action="delete-product" data-id="${escapeAttr(item.idProducto)}">Eliminar</button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderOrdersAdmin() {
  const order = state.admin.selectedOrder;
  return `
    <section class="panel">
      <h2>Buscar pedido</h2>
      <form id="order-search-form" class="toolbar-row">
        <label class="field"><span>Folio</span><input name="folio" placeholder="PED-20260701-0001" required /></label>
        <div class="field"><span>Accion</span><button class="secondary-button" type="submit">Buscar</button></div>
      </form>
    </section>
    ${order ? renderOrderEditor(order) : ""}
    <section class="panel">
      <h2>Pedidos recientes</h2>
      ${renderOrdersTable(state.admin.orders.length ? state.admin.orders : SAMPLE_ORDERS)}
    </section>
  `;
}

function renderOrderEditor(order) {
  const items = parseItems(order.itemsJson);
  return `
    <section class="panel">
      <h2>${escapeHtml(order.folio)}</h2>
      <div class="metric-grid">
        <div class="metric"><span>Cliente</span><strong>${escapeHtml(order.clienteNombre)}</strong></div>
        <div class="metric"><span>Piezas</span><strong>${Number(order.piezasTotales) || 0}</strong></div>
        <div class="metric"><span>Monto</span><strong>${currency.format(Number(order.montoTotal) || 0)}</strong></div>
        <div class="metric"><span>Estatus</span><strong>${escapeHtml(order.estatusPedido)}</strong></div>
      </div>
      <form id="order-edit-form" class="form-grid">
        <input type="hidden" name="folio" value="${escapeAttr(order.folio)}" />
        <label class="field"><span>Estatus</span>${renderOrderStatusSelect(order.estatusPedido, "estatusPedido")}</label>
        <label class="field"><span>Notas admin</span><textarea name="notasAdmin" rows="3">${escapeHtml(order.notasAdmin || "")}</textarea></label>
        <div class="field"><span>Acciones</span><button class="primary-button" type="submit">Guardar cambios</button></div>
      </form>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Subtotal</th></tr></thead>
          <tbody>
            ${items.map((item) => `<tr><td>${escapeHtml(item.producto)}</td><td>${item.cantidad}</td><td>${currency.format(item.precio)}</td><td>${currency.format(item.subtotal)}</td></tr>`).join("")}
          </tbody>
        </table>
      </div>
      <button class="primary-button" type="button" data-admin-action="mark-served" data-folio="${escapeAttr(order.folio)}">Marcar como surtido</button>
    </section>
  `;
}

function renderInventoryAdmin() {
  const products = state.admin.products.length ? state.admin.products : SAMPLE_PRODUCTS;
  return `
    <section class="panel">
      <h2>Ajuste de inventario</h2>
      <form id="inventory-form" class="form-grid">
        <label class="field">
          <span>Producto</span>
          <select name="idProducto" required>
            ${products.map((product) => `<option value="${escapeAttr(product.idProducto)}">${escapeHtml(product.producto)} (${Number(product.inventario) || 0})</option>`).join("")}
          </select>
        </label>
        <label class="field"><span>Tipo</span>
          <select name="tipoMovimiento">
            <option>Ajuste manual</option>
            <option>Descuento manual</option>
            <option>Correccion</option>
          </select>
        </label>
        <label class="field"><span>Cantidad</span><input name="cantidad" type="number" step="1" required /></label>
        <label class="field"><span>Motivo</span><input name="motivo" required /></label>
        <button class="primary-button" type="submit">Registrar movimiento</button>
      </form>
    </section>
    <section class="panel">
      <h2>Movimientos recientes</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Anterior</th><th>Nuevo</th><th>Motivo</th></tr></thead>
          <tbody>
            ${(state.admin.movements || []).map((move) => `
              <tr>
                <td>${escapeHtml(formatDateTime(move.fecha))}</td>
                <td>${escapeHtml(move.producto)}</td>
                <td>${escapeHtml(move.tipoMovimiento)}</td>
                <td>${move.cantidad}</td>
                <td>${move.inventarioAnterior}</td>
                <td>${move.inventarioNuevo}</td>
                <td>${escapeHtml(move.motivo || "")}</td>
              </tr>
            `).join("") || `<tr><td colspan="7">Sin movimientos registrados.</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderOrdersTable(rows) {
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Fecha</th><th>Folio</th><th>Cliente</th><th>Monto</th><th>Piezas</th><th>Estatus</th></tr></thead>
        <tbody>
          ${rows.map((order) => `
            <tr>
              <td>${escapeHtml(formatDateTime(order.fechaPedido))}</td>
              <td>${escapeHtml(order.folio)}</td>
              <td>${escapeHtml(order.clienteNombre)}</td>
              <td>${currency.format(Number(order.montoTotal) || 0)}</td>
              <td>${Number(order.piezasTotales) || 0}</td>
              <td>${escapeHtml(order.estatusPedido)}</td>
            </tr>
          `).join("") || `<tr><td colspan="6">Sin pedidos en este periodo.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function bindAdminEvents() {
  document.querySelector("#dashboard-filter")?.addEventListener("submit", handleDashboardFilter);
  document.querySelector("#product-form")?.addEventListener("submit", handleProductSave);
  document.querySelector("#order-search-form")?.addEventListener("submit", handleOrderSearch);
  document.querySelector("#order-edit-form")?.addEventListener("submit", handleOrderEdit);
  document.querySelector("#inventory-form")?.addEventListener("submit", handleInventoryAdjust);
  document.querySelectorAll("[data-admin-action]").forEach((node) => {
    node.addEventListener("click", handleAdminAction);
  });
}

async function ensureAdminData() {
  if (state.admin.products.length) return;
  const [products, dashboard, orders] = await Promise.all([
    callApi("listarProductosAdmin", {}, { token: state.admin.token, quiet: true }),
    callApi("obtenerDashboard", {}, { token: state.admin.token, quiet: true }),
    callApi("listarPedidosAdmin", {}, { token: state.admin.token, quiet: true })
  ]);
  state.admin.products = products?.products || SAMPLE_PRODUCTS;
  state.admin.dashboard = dashboard?.dashboard || buildLocalDashboard(new Date().getFullYear(), new Date().getMonth() + 1);
  state.admin.orders = orders?.orders || [...loadJson(STORAGE_KEYS.demoOrders, []), ...SAMPLE_ORDERS];
  renderAdmin();
}

async function handleAdminLogin(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const username = form.get("username");
  const password = form.get("password");
  const response = await callApi("loginAdmin", {
    username,
    password
  });
  if (!response?.token && isLocalDemoAdmin(username, password)) {
    state.admin.token = LOCAL_DEMO_ADMIN.token;
    sessionStorage.setItem(STORAGE_KEYS.token, LOCAL_DEMO_ADMIN.token);
    showToast("Sesion local de demostracion");
    renderAdmin();
    return;
  }
  if (!response?.token) {
    showToast(response?.error || "No fue posible iniciar sesion");
    return;
  }
  state.admin.token = response.token;
  sessionStorage.setItem(STORAGE_KEYS.token, response.token);
  showToast("Sesion iniciada");
  renderAdmin();
}

function isLocalDemoAdmin(username, password) {
  return ["localhost", "127.0.0.1", ""].includes(location.hostname)
    && username === LOCAL_DEMO_ADMIN.username
    && password === LOCAL_DEMO_ADMIN.password;
}

async function handleDashboardFilter(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const year = Number(form.get("year"));
  const month = Number(form.get("month"));
  const response = await callApi("obtenerDashboard", { year, month }, { token: state.admin.token });
  state.admin.dashboard = response?.dashboard || buildLocalDashboard(year, month);
  renderAdmin();
}

async function handleProductSave(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const idProducto = form.get("idProducto");
  const payload = {
    idProducto,
    producto: form.get("producto").trim(),
    descripcion: form.get("descripcion").trim(),
    categoria: form.get("categoria").trim(),
    precio: Number(form.get("precio")),
    inventario: Number(form.get("inventario")),
    estatus: form.get("estatus")
  };

  for (const field of ["imagen1", "imagen2", "imagen3"]) {
    const file = form.get(field);
    if (file && file.size) {
      const uploaded = await uploadProductImage(file, payload.producto);
      payload[`${field}Url`] = uploaded.url;
      payload[`driveFileId${field.replace("imagen", "")}`] = uploaded.fileId;
    }
  }

  const action = idProducto ? "actualizarProducto" : "crearProducto";
  const response = await callApi(action, payload, { token: state.admin.token });
  if (response?.product) {
    showToast("Producto guardado");
    state.admin.selectedProduct = null;
    state.admin.products = [];
    await loadPublicProducts();
    renderAdmin();
  }
}

async function uploadProductImage(file, productName) {
  const dataUrl = await fileToDataUrl(file);
  const response = await callApi("subirImagenProducto", {
    fileName: `${productName}-${Date.now()}-${file.name}`,
    mimeType: file.type,
    dataUrl
  }, { token: state.admin.token });
  return {
    url: response?.url || dataUrl,
    fileId: response?.fileId || ""
  };
}

async function handleOrderSearch(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const folio = form.get("folio").trim();
  const response = await callApi("obtenerPedidoPorFolio", { folio }, { token: state.admin.token });
  state.admin.selectedOrder = response?.order || [...loadJson(STORAGE_KEYS.demoOrders, []), ...SAMPLE_ORDERS].find((order) => order.folio === folio) || null;
  if (!state.admin.selectedOrder) showToast("Pedido no encontrado");
  renderAdmin();
}

async function handleOrderEdit(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const payload = {
    folio: form.get("folio"),
    estatusPedido: form.get("estatusPedido"),
    notasAdmin: form.get("notasAdmin")
  };
  const response = await callApi("actualizarPedido", payload, { token: state.admin.token });
  if (response?.order) {
    state.admin.selectedOrder = response.order;
    showToast("Pedido actualizado");
    renderAdmin();
  }
}

async function handleInventoryAdjust(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const response = await callApi("ajustarInventarioManual", {
    idProducto: form.get("idProducto"),
    tipoMovimiento: form.get("tipoMovimiento"),
    cantidad: Number(form.get("cantidad")),
    motivo: form.get("motivo")
  }, { token: state.admin.token });
  if (response?.movement) {
    showToast("Movimiento registrado");
    state.admin.products = [];
    state.admin.movements = response.movements || [response.movement, ...state.admin.movements];
    await loadPublicProducts();
    renderAdmin();
  }
}

async function handleAdminAction(event) {
  const node = event.currentTarget;
  const action = node.dataset.adminAction;
  if (action === "logout") {
    state.admin.token = "";
    sessionStorage.removeItem(STORAGE_KEYS.token);
    renderAdmin();
  }
  if (action === "tab") {
    state.admin.tab = node.dataset.tab;
    renderAdmin();
  }
  if (action === "new-product") {
    state.admin.selectedProduct = null;
    renderAdmin();
  }
  if (action === "edit-product") {
    state.admin.selectedProduct = state.admin.products.find((product) => product.idProducto === node.dataset.id) || null;
    renderAdmin();
  }
  if (action === "delete-product") {
    const response = await callApi("eliminarProducto", { idProducto: node.dataset.id }, { token: state.admin.token });
    if (response?.ok) {
      showToast("Producto eliminado logicamente");
      state.admin.products = [];
      await loadPublicProducts();
      renderAdmin();
    }
  }
  if (action === "mark-served") {
    const response = await callApi("marcarPedidoSurtido", { folio: node.dataset.folio }, { token: state.admin.token });
    if (response?.order) {
      state.admin.selectedOrder = response.order;
      state.admin.products = [];
      showToast("Pedido surtido e inventario descontado");
      renderAdmin();
    } else if (response?.error) {
      showToast(response.error);
    }
  }
}

async function callApi(action, payload = {}, options = {}) {
  try {
    const response = await fetch(`${API_BASE}/${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok && !options.quiet) showToast(data.error || "La API no respondio correctamente");
    return data;
  } catch (error) {
    if (!options.quiet) showToast("Usando modo local de demostracion");
    return null;
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function buildLocalDashboard(year, month) {
  const orders = [...loadJson(STORAGE_KEYS.demoOrders, []), ...SAMPLE_ORDERS];
  const selected = orders.filter((order) => {
    const date = new Date(order.fechaPedido);
    return date.getFullYear() === Number(year) && date.getMonth() + 1 === Number(month);
  });
  const totalPedidos = selected.length;
  const montoTotal = selected.reduce((sum, order) => sum + Number(order.montoTotal || 0), 0);
  const piezasSurtidas = selected
    .filter((order) => order.estatusPedido === "Surtido")
    .reduce((sum, order) => sum + Number(order.piezasTotales || 0), 0);
  const pedidosPendientes = selected.filter((order) => ["Nuevo", "En revision", "Confirmado"].includes(order.estatusPedido)).length;
  const monthlyBars = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(year, month - 1 - (5 - index), 1);
    const label = date.toLocaleDateString("es-MX", { month: "short" });
    const monto = orders
      .filter((order) => {
        const orderDate = new Date(order.fechaPedido);
        return orderDate.getFullYear() === date.getFullYear() && orderDate.getMonth() === date.getMonth();
      })
      .reduce((sum, order) => sum + Number(order.montoTotal || 0), 0);
    return { label, monto };
  });
  return { year, month, totalPedidos, montoTotal, piezasSurtidas, pedidosPendientes, monthlyBars, orders: selected };
}

function labelTab(tab) {
  return {
    dashboard: "Dashboard",
    productos: "Productos",
    pedidos: "Pedidos",
    inventario: "Inventario"
  }[tab] || tab;
}

function renderStatusSelect(value, name) {
  return `<select name="${name}">${["Activo", "En pausa", "Sin stock", "Eliminado"].map((status) => `<option ${status === value ? "selected" : ""}>${status}</option>`).join("")}</select>`;
}

function renderOrderStatusSelect(value, name) {
  return `<select name="${name}">${["Nuevo", "En revision", "Confirmado", "Surtido", "Cancelado"].map((status) => `<option ${status === value ? "selected" : ""}>${status}</option>`).join("")}</select>`;
}

function parseItems(itemsJson) {
  if (Array.isArray(itemsJson)) return itemsJson;
  try {
    return JSON.parse(itemsJson || "[]");
  } catch {
    return [];
  }
}

function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function formatDateCode(date) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
}

function showToast(message) {
  toastNode.textContent = message;
  toastNode.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toastNode.classList.remove("show"), 2600);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value = "") {
  return escapeHtml(value);
}
