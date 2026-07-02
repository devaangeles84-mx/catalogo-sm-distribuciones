const crypto = require("crypto");

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
  }
];

const PUBLIC_ACTIONS = new Set([
  "getPublicConfig",
  "listarProductosPublicos",
  "crearPedido",
  "loginAdmin"
]);

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return respond(204, {});
  if (event.httpMethod !== "POST") return respond(405, { error: "Metodo no permitido" });

  const action = getAction(event);
  const payload = parseBody(event.body);

  try {
    if (action === "getPublicConfig") {
      return respond(200, { storeWhatsappNumber: process.env.STORE_WHATSAPP_NUMBER || "" });
    }

    if (action === "loginAdmin") {
      return handleLogin(payload);
    }

    if (!PUBLIC_ACTIONS.has(action) && !isValidSession(getBearerToken(event))) {
      return respond(401, { error: "Sesion invalida o expirada" });
    }

    if (process.env.GAS_WEBAPP_URL && process.env.GAS_EXECUTION_TOKEN) {
      const result = await forwardToAppsScript(action, payload);
      return respond(200, result);
    }

    return respond(200, mockResponse(action, payload));
  } catch (error) {
    return respond(500, { error: error.message || "Error interno" });
  }
};

function handleLogin(payload) {
  const configuredUser = process.env.ADMIN_USERNAME;
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (!configuredUser || !configuredPassword) {
    return respond(500, { error: "Configura ADMIN_USERNAME y ADMIN_PASSWORD en Netlify" });
  }

  const ok = safeEqual(payload.username || "", configuredUser) && safeEqual(payload.password || "", configuredPassword);
  if (!ok) return respond(401, { error: "Credenciales invalidas" });
  return respond(200, { token: createSession(configuredUser) });
}

async function forwardToAppsScript(action, payload) {
  const response = await fetch(process.env.GAS_WEBAPP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: process.env.GAS_EXECUTION_TOKEN,
      action,
      payload
    })
  });
  const text = await response.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Apps Script no devolvio JSON valido");
  }
  if (!response.ok || data.error) {
    throw new Error(data.error || "Apps Script respondio con error");
  }
  return data;
}

function mockResponse(action, payload) {
  if (action === "listarProductosPublicos") {
    return { products: SAMPLE_PRODUCTS.filter((product) => ["Activo", "Sin stock"].includes(product.estatus)) };
  }
  if (action === "listarProductosAdmin") {
    return { products: SAMPLE_PRODUCTS };
  }
  if (action === "crearPedido") {
    const now = new Date();
    return {
      order: {
        ...payload,
        folio: `PED-${dateCode(now)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        fechaPedido: now.toISOString(),
        itemsJson: JSON.stringify(payload.items || []),
        estatusPedido: "Nuevo",
        fechaSurtido: "",
        notasAdmin: "",
        fechaActualizacion: now.toISOString()
      }
    };
  }
  if (action === "obtenerDashboard") {
    return {
      dashboard: {
        year: payload.year || new Date().getFullYear(),
        month: payload.month || new Date().getMonth() + 1,
        totalPedidos: 0,
        montoTotal: 0,
        piezasSurtidas: 0,
        pedidosPendientes: 0,
        monthlyBars: [],
        orders: []
      }
    };
  }
  if (action === "listarPedidosAdmin") return { orders: [] };
  if (action === "subirImagenProducto") return { url: payload.dataUrl, fileId: "" };
  if (action === "crearProducto" || action === "actualizarProducto") {
    return { product: { ...payload, idProducto: payload.idProducto || `PROD-${Date.now()}` } };
  }
  if (action === "eliminarProducto") return { ok: true };
  if (action === "obtenerPedidoPorFolio") return { order: null };
  if (action === "actualizarPedido") return { order: payload };
  if (action === "marcarPedidoSurtido") return { order: { folio: payload.folio, estatusPedido: "Surtido" } };
  if (action === "ajustarInventarioManual") {
    return {
      movement: {
        fecha: new Date().toISOString(),
        ...payload,
        inventarioAnterior: 0,
        inventarioNuevo: Number(payload.cantidad) || 0
      }
    };
  }
  return { ok: true };
}

function getAction(event) {
  const raw = event.path.split("/").filter(Boolean).pop();
  return raw === "api" ? parseBody(event.body).action : raw;
}

function parseBody(body) {
  try {
    return body ? JSON.parse(body) : {};
  } catch {
    return {};
  }
}

function createSession(username) {
  const payload = {
    username,
    issuedAt: Date.now()
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

function isValidSession(token) {
  try {
    if (!token || !token.includes(".")) return false;
    const [encoded, signature] = token.split(".");
    if (!safeEqual(signature, sign(encoded))) return false;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    const twelveHours = 12 * 60 * 60 * 1000;
    return Date.now() - Number(payload.issuedAt) < twelveHours;
  } catch {
    return false;
  }
}

function sign(value) {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "local-session-secret";
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function getBearerToken(event) {
  const header = event.headers.authorization || event.headers.Authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function dateCode(date) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
}

function respond(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    },
    body: statusCode === 204 ? "" : JSON.stringify(body)
  };
}
