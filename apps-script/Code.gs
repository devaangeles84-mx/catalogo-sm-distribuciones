const SHEETS = {
  productos: {
    name: "Productos",
    headers: [
      "idProducto", "producto", "descripcion", "categoria", "precio", "inventario", "estatus",
      "imagen1Url", "imagen2Url", "imagen3Url", "driveFileId1", "driveFileId2", "driveFileId3",
      "fechaAlta", "fechaActualizacion"
    ]
  },
  pedidos: {
    name: "Pedidos",
    headers: [
      "folio", "fechaPedido", "clienteNombre", "clienteTelefono", "clienteCorreo", "itemsJson",
      "piezasTotales", "montoTotal", "estatusPedido", "fechaSurtido", "notasAdmin", "fechaActualizacion"
    ]
  },
  movimientos: {
    name: "MovimientosInventario",
    headers: [
      "fecha", "idProducto", "producto", "tipoMovimiento", "cantidad", "inventarioAnterior",
      "inventarioNuevo", "motivo", "folioRelacionado"
    ]
  }
};

function doGet() {
  ensureSetup();
  return json({
    ok: true,
    service: "Catalogo SM Distribuciones API",
    message: "API activa. Las acciones del catalogo se envian por POST desde Netlify Functions."
  });
}

function doPost(e) {
  try {
    const request = JSON.parse(e.postData.contents || "{}");
    const expectedToken = PropertiesService.getScriptProperties().getProperty("GAS_EXECUTION_TOKEN");
    if (expectedToken && request.token !== expectedToken) {
      return json({ error: "Token invalido" });
    }

    ensureSetup();
    const payload = request.payload || {};
    const action = request.action;
    const handlers = {
      listarProductosPublicos,
      listarProductosAdmin,
      crearProducto,
      actualizarProducto,
      eliminarProducto,
      subirImagenProducto,
      crearPedido,
      listarPedidosAdmin,
      obtenerPedidoPorFolio,
      actualizarPedido,
      marcarPedidoSurtido,
      ajustarInventarioManual,
      obtenerDashboard
    };

    if (!handlers[action]) return json({ error: "Accion no soportada" });
    return json(handlers[action](payload));
  } catch (error) {
    return json({ error: error.message || String(error) });
  }
}

function ensureSetup() {
  Object.keys(SHEETS).forEach((key) => getSheet(SHEETS[key]));
}

function listarProductosPublicos() {
  const products = readObjects(SHEETS.productos)
    .map(normalizeProduct)
    .filter((product) => isPublicProduct(product));
  return { products };
}

function listarProductosAdmin() {
  return { products: readObjects(SHEETS.productos).map(normalizeProduct) };
}

function crearProducto(payload) {
  const now = new Date().toISOString();
  const product = normalizeProduct({
    ...payload,
    idProducto: payload.idProducto || createProductId(),
    producto: required(payload.producto, "producto"),
    fechaAlta: now,
    fechaActualizacion: now
  });
  appendObject(SHEETS.productos, product);
  appendInventoryMovement({
    fecha: now,
    idProducto: product.idProducto,
    producto: product.producto,
    tipoMovimiento: "Alta inicial",
    cantidad: Number(product.inventario) || 0,
    inventarioAnterior: 0,
    inventarioNuevo: Number(product.inventario) || 0,
    motivo: "Alta de producto",
    folioRelacionado: ""
  });
  return { product };
}

function actualizarProducto(payload) {
  const products = readObjects(SHEETS.productos);
  const current = products.find((product) => normalizeId(product.idProducto) === normalizeId(payload.idProducto));
  if (!current) throw new Error("Producto no encontrado");
  const updated = normalizeProduct({
    ...current,
    ...payload,
    fechaAlta: current.fechaAlta,
    fechaActualizacion: new Date().toISOString()
  });
  updateObject(SHEETS.productos, current._rowNumber, updated);
  return { product: updated };
}

function eliminarProducto(payload) {
  const result = actualizarProducto({ idProducto: payload.idProducto, estatus: "Eliminado" });
  return { ok: true, product: result.product };
}

function subirImagenProducto(payload) {
  const folderId = PropertiesService.getScriptProperties().getProperty("GOOGLE_DRIVE_FOLDER_ID");
  if (!folderId) throw new Error("Configura GOOGLE_DRIVE_FOLDER_ID en propiedades de Apps Script");
  const folder = DriveApp.getFolderById(folderId);
  const base64 = String(payload.dataUrl || "").split(",").pop();
  const bytes = Utilities.base64Decode(base64);
  const blob = Utilities.newBlob(bytes, payload.mimeType || "image/jpeg", payload.fileName || "producto.jpg");
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return {
    fileId: file.getId(),
    url: "https://drive.google.com/uc?export=view&id=" + file.getId()
  };
}

function crearPedido(payload) {
  const items = validateItems(payload.items || []);
  const totals = calculateTotals(items);
  const now = new Date();
  const order = {
    folio: createOrderFolio(now),
    fechaPedido: now.toISOString(),
    clienteNombre: required(payload.clienteNombre, "clienteNombre"),
    clienteTelefono: required(payload.clienteTelefono, "clienteTelefono"),
    clienteCorreo: required(payload.clienteCorreo, "clienteCorreo"),
    itemsJson: JSON.stringify(items),
    piezasTotales: totals.piezas,
    montoTotal: totals.total,
    estatusPedido: "Nuevo",
    fechaSurtido: "",
    notasAdmin: "",
    fechaActualizacion: now.toISOString()
  };
  appendObject(SHEETS.pedidos, order);
  return { order: { ...order, items } };
}

function listarPedidosAdmin() {
  const orders = readObjects(SHEETS.pedidos)
    .sort((a, b) => String(b.fechaPedido).localeCompare(String(a.fechaPedido)))
    .slice(0, 100);
  return { orders };
}

function obtenerPedidoPorFolio(payload) {
  const order = readObjects(SHEETS.pedidos).find((item) => normalizeId(item.folio) === normalizeId(payload.folio));
  return { order: order || null };
}

function actualizarPedido(payload) {
  const orders = readObjects(SHEETS.pedidos);
  const current = orders.find((order) => normalizeId(order.folio) === normalizeId(payload.folio));
  if (!current) throw new Error("Pedido no encontrado");
  if (current.estatusPedido === "Surtido" && payload.estatusPedido !== "Surtido") {
    throw new Error("No se puede regresar un pedido ya surtido");
  }

  let items = parseJson(current.itemsJson, []);
  if (payload.items && payload.items.length) items = validateItems(payload.items);
  const totals = calculateTotals(items);
  const updated = {
    ...current,
    itemsJson: JSON.stringify(items),
    piezasTotales: totals.piezas,
    montoTotal: totals.total,
    estatusPedido: payload.estatusPedido || current.estatusPedido,
    notasAdmin: payload.notasAdmin || current.notasAdmin,
    fechaActualizacion: new Date().toISOString()
  };
  updateObject(SHEETS.pedidos, current._rowNumber, updated);
  return { order: updated };
}

function marcarPedidoSurtido(payload) {
  const orders = readObjects(SHEETS.pedidos);
  const order = orders.find((item) => normalizeId(item.folio) === normalizeId(payload.folio));
  if (!order) throw new Error("Pedido no encontrado");
  if (order.estatusPedido === "Surtido") throw new Error("Este pedido ya fue surtido");

  const items = parseJson(order.itemsJson, []);
  const products = readObjects(SHEETS.productos);
  items.forEach((item) => {
    const product = products.find((candidate) => normalizeId(candidate.idProducto) === normalizeId(item.idProducto));
    if (!product) throw new Error("Producto no encontrado: " + item.producto);
    if (Number(product.inventario) < Number(item.cantidad)) {
      throw new Error("Inventario insuficiente para " + product.producto);
    }
  });

  const now = new Date().toISOString();
  items.forEach((item) => {
    const product = products.find((candidate) => normalizeId(candidate.idProducto) === normalizeId(item.idProducto));
    const before = Number(product.inventario) || 0;
    const after = before - Number(item.cantidad);
    product.inventario = after;
    product.fechaActualizacion = now;
    updateObject(SHEETS.productos, product._rowNumber, product);
    appendInventoryMovement({
      fecha: now,
      idProducto: product.idProducto,
      producto: product.producto,
      tipoMovimiento: "Surtido por pedido",
      cantidad: Number(item.cantidad),
      inventarioAnterior: before,
      inventarioNuevo: after,
      motivo: "Pedido surtido",
      folioRelacionado: order.folio
    });
  });

  const updatedOrder = {
    ...order,
    estatusPedido: "Surtido",
    fechaSurtido: now,
    fechaActualizacion: now
  };
  updateObject(SHEETS.pedidos, order._rowNumber, updatedOrder);
  return { order: updatedOrder };
}

function ajustarInventarioManual(payload) {
  const products = readObjects(SHEETS.productos);
  const product = products.find((item) => normalizeId(item.idProducto) === normalizeId(payload.idProducto));
  if (!product) throw new Error("Producto no encontrado");

  const before = Number(product.inventario) || 0;
  const quantity = Number(payload.cantidad);
  if (!Number.isFinite(quantity) || quantity === 0) throw new Error("Cantidad invalida");
  const type = payload.tipoMovimiento || "Ajuste manual";
  const after = type === "Descuento manual" ? before - Math.abs(quantity) : before + quantity;
  if (after < 0) throw new Error("El inventario no puede quedar negativo");

  const now = new Date().toISOString();
  product.inventario = after;
  product.fechaActualizacion = now;
  updateObject(SHEETS.productos, product._rowNumber, product);

  const movement = {
    fecha: now,
    idProducto: product.idProducto,
    producto: product.producto,
    tipoMovimiento: type,
    cantidad: quantity,
    inventarioAnterior: before,
    inventarioNuevo: after,
    motivo: payload.motivo || "",
    folioRelacionado: payload.folioRelacionado || ""
  };
  appendInventoryMovement(movement);
  return { movement };
}

function obtenerDashboard(payload) {
  const now = new Date();
  const year = Number(payload.year) || now.getFullYear();
  const month = Number(payload.month) || now.getMonth() + 1;
  const orders = readObjects(SHEETS.pedidos);
  const selected = orders.filter((order) => {
    const date = new Date(order.fechaPedido);
    return date.getFullYear() === year && date.getMonth() + 1 === month;
  });
  const totalPedidos = selected.length;
  const montoTotal = selected.reduce((sum, order) => sum + Number(order.montoTotal || 0), 0);
  const piezasSurtidas = selected
    .filter((order) => order.estatusPedido === "Surtido")
    .reduce((sum, order) => sum + Number(order.piezasTotales || 0), 0);
  const pedidosPendientes = selected
    .filter((order) => ["Nuevo", "En revision", "Confirmado"].indexOf(order.estatusPedido) >= 0)
    .length;
  const monthlyBars = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date(year, month - 1 - i, 1);
    const label = Utilities.formatDate(date, Session.getScriptTimeZone(), "MMM");
    const monto = orders
      .filter((order) => {
        const orderDate = new Date(order.fechaPedido);
        return orderDate.getFullYear() === date.getFullYear() && orderDate.getMonth() === date.getMonth();
      })
      .reduce((sum, order) => sum + Number(order.montoTotal || 0), 0);
    monthlyBars.push({ label, monto });
  }
  return {
    dashboard: {
      year,
      month,
      totalPedidos,
      montoTotal,
      piezasSurtidas,
      pedidosPendientes,
      monthlyBars,
      orders: selected
    }
  };
}

function getSheet(config) {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  const spreadsheet = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(config.name);
  if (!sheet) sheet = spreadsheet.insertSheet(config.name);
  const firstRow = sheet.getRange(1, 1, 1, config.headers.length).getValues()[0];
  const isEmpty = firstRow.every((cell) => !cell);
  if (isEmpty) sheet.getRange(1, 1, 1, config.headers.length).setValues([config.headers]);
  return sheet;
}

function readObjects(config) {
  const sheet = getSheet(config);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const lastColumn = Math.max(sheet.getLastColumn(), config.headers.length);
  const headerRow = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const headerMap = buildHeaderMap(headerRow);
  const values = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
  return values.map((row, index) => {
    const object = { _rowNumber: index + 2 };
    config.headers.forEach((header, column) => {
      const mappedColumn = headerMap[normalizeHeader(header)];
      object[header] = mappedColumn === undefined ? row[column] : row[mappedColumn];
    });
    return object;
  });
}

function appendObject(config, object) {
  const sheet = getSheet(config);
  sheet.appendRow(config.headers.map((header) => object[header] === undefined ? "" : object[header]));
}

function updateObject(config, rowNumber, object) {
  const sheet = getSheet(config);
  sheet.getRange(rowNumber, 1, 1, config.headers.length)
    .setValues([config.headers.map((header) => object[header] === undefined ? "" : object[header])]);
}

function appendInventoryMovement(movement) {
  appendObject(SHEETS.movimientos, movement);
}

function buildHeaderMap(headerRow) {
  const map = {};
  headerRow.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    if (normalized) map[normalized] = index;
  });
  return map;
}

function normalizeHeader(value) {
  const normalized = normalizeSearch(value).replace(/[^a-z0-9]/g, "");
  const aliases = {
    idproducto: "idproducto",
    id: "idproducto",
    producto: "producto",
    nombre: "producto",
    descripcion: "descripcion",
    categoria: "categoria",
    precio: "precio",
    inventario: "inventario",
    stock: "inventario",
    estatus: "estatus",
    status: "estatus",
    estado: "estatus",
    imagen1url: "imagen1url",
    imagen2url: "imagen2url",
    imagen3url: "imagen3url",
    drivefileid1: "drivefileid1",
    drivefileid2: "drivefileid2",
    drivefileid3: "drivefileid3",
    fechaalta: "fechaalta",
    fechaactualizacion: "fechaactualizacion"
  };
  return aliases[normalized] || normalized;
}

function normalizeSearch(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function normalizeId(value) {
  return String(value || "").trim();
}

function normalizeStatus(value) {
  return normalizeSearch(value);
}

function normalizeDisplayStatus(value) {
  const normalized = normalizeStatus(value);
  if (normalized === "activo") return "Activo";
  if (normalized === "sin stock" || normalized === "sinstock" || normalized === "sin existencia") return "Sin stock";
  if (normalized === "en pausa" || normalized === "pausado") return "En pausa";
  if (normalized === "eliminado") return "Eliminado";
  return String(value || "Activo").trim() || "Activo";
}

function isPublicProduct(product) {
  const status = normalizeStatus(product.estatus);
  return (status === "activo" || status === "sin stock") && Boolean(product.producto || product.idProducto);
}

function normalizeProduct(payload) {
  return {
    idProducto: normalizeId(payload.idProducto || payload.id || payload.ID),
    producto: String(payload.producto || payload.Producto || "").trim(),
    descripcion: payload.descripcion || "",
    categoria: payload.categoria || "General",
    precio: Number(payload.precio) || 0,
    inventario: Number(payload.inventario) || 0,
    estatus: normalizeDisplayStatus(payload.estatus || payload.status || payload.estado || "Activo"),
    imagen1Url: payload.imagen1Url || "",
    imagen2Url: payload.imagen2Url || "",
    imagen3Url: payload.imagen3Url || "",
    driveFileId1: payload.driveFileId1 || "",
    driveFileId2: payload.driveFileId2 || "",
    driveFileId3: payload.driveFileId3 || "",
    fechaAlta: payload.fechaAlta || new Date().toISOString(),
    fechaActualizacion: payload.fechaActualizacion || new Date().toISOString()
  };
}

function validateItems(items) {
  if (!items.length) throw new Error("No se permiten pedidos vacios");
  return items.map((item) => {
    const quantity = Number(item.cantidad);
    const price = Number(item.precio);
    if (!Number.isInteger(quantity) || quantity <= 0) throw new Error("Cantidad invalida");
    if (!Number.isFinite(price) || price < 0) throw new Error("Precio invalido");
    return {
      idProducto: required(item.idProducto, "idProducto"),
      producto: required(item.producto, "producto"),
      cantidad: quantity,
      precio: price,
      subtotal: quantity * price
    };
  });
}

function calculateTotals(items) {
  return items.reduce((totals, item) => ({
    piezas: totals.piezas + Number(item.cantidad),
    total: totals.total + Number(item.subtotal)
  }), { piezas: 0, total: 0 });
}

function createProductId() {
  return "PROD-" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss");
}

function createOrderFolio(date) {
  const prefix = "PED-" + Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyyMMdd") + "-";
  const count = readObjects(SHEETS.pedidos).filter((order) => String(order.folio).indexOf(prefix) === 0).length + 1;
  return prefix + String(count).padStart(4, "0");
}

function required(value, name) {
  if (value === undefined || value === null || String(value).trim() === "") {
    throw new Error("Campo requerido: " + name);
  }
  return String(value).trim();
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value || "[]");
  } catch (error) {
    return fallback;
  }
}

function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
