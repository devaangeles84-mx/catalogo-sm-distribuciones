# Catalogo SM Distribuciones

Aplicacion web sencilla para publicar un catalogo de productos, levantar pedidos por WhatsApp y administrar productos, inventario y pedidos desde un panel privado.

La version implementada usa una arquitectura ligera:

- Frontend estatico compatible con Netlify.
- Netlify Functions como capa segura para login y proxy.
- Google Apps Script como API hacia Google Sheets y Google Drive.
- Google Sheets como base inicial para productos, pedidos y movimientos.

## Estructura

- `index.html`, `styles.css`, `app.js`: catalogo publico, carrito, galeria y panel admin.
- `netlify/functions/api.js`: login admin, sesion simple y proxy hacia Apps Script.
- `apps-script/Code.gs`: endpoints para Sheets/Drive.
- `sample-productos.csv` y `sample-pedidos.csv`: datos de prueba.
- `.env.example`: variables necesarias.

## Simplificacion elegida

Para mantener estabilidad y operacion sencilla, el frontend no se conecta directo a Google. Todo pasa por Netlify Functions, y Netlify reenvia a Apps Script usando `GAS_EXECUTION_TOKEN`. Asi no quedan claves sensibles dentro del navegador.

## Crear Google Sheet

1. Crea una hoja de Google Sheets.
2. Agrega estas pestañas, o deja que Apps Script las cree automaticamente:
   - `Productos`
   - `Pedidos`
   - `MovimientosInventario`
3. Si quieres cargar datos de prueba, importa `sample-productos.csv` en `Productos` y `sample-pedidos.csv` en `Pedidos`.

Encabezados de `Productos`:

```text
idProducto, producto, descripcion, categoria, precio, inventario, estatus, imagen1Url, imagen2Url, imagen3Url, driveFileId1, driveFileId2, driveFileId3, fechaAlta, fechaActualizacion
```

Encabezados de `Pedidos`:

```text
folio, fechaPedido, clienteNombre, clienteTelefono, clienteCorreo, itemsJson, piezasTotales, montoTotal, estatusPedido, fechaSurtido, notasAdmin, fechaActualizacion
```

Encabezados de `MovimientosInventario`:

```text
fecha, idProducto, producto, tipoMovimiento, cantidad, inventarioAnterior, inventarioNuevo, motivo, folioRelacionado
```

## Crear carpeta de Google Drive

1. Crea una carpeta en Drive para fotos de productos.
2. Copia el ID de la carpeta desde la URL.
3. Usalo como `GOOGLE_DRIVE_FOLDER_ID` en propiedades de Apps Script.

## Configurar Apps Script

1. En Google Sheets abre `Extensiones > Apps Script`.
2. Pega el contenido de `apps-script/Code.gs`.
3. En `Configuracion del proyecto > Propiedades de secuencia de comandos`, agrega:
   - `GAS_EXECUTION_TOKEN`: un texto largo secreto.
   - `GOOGLE_DRIVE_FOLDER_ID`: ID de la carpeta de fotos.
   - `SPREADSHEET_ID`: opcional si el script no esta ligado al Sheet.
4. Guarda.
5. Ejecuta una vez `ensureSetup` desde Apps Script para autorizar permisos.

## Publicar Apps Script como Web App

1. En Apps Script entra a `Implementar > Nueva implementacion`.
2. Tipo: `Aplicacion web`.
3. Ejecutar como: `Yo`.
4. Quien tiene acceso: `Cualquier usuario`.
5. Copia la URL `/exec`; sera `GAS_WEBAPP_URL`.

El token evita que la Web App acepte acciones si no vienen desde tu funcion de Netlify.

Si abres la URL `/exec` directamente en el navegador, debe responder que la API esta activa. Las acciones reales del catalogo se envian por POST desde Netlify Functions.

## Configurar Netlify

En Netlify, en `Site configuration > Environment variables`, agrega:

```text
GAS_WEBAPP_URL=https://script.google.com/macros/s/.../exec
GAS_EXECUTION_TOKEN=el-mismo-token-de-apps-script
ADMIN_USERNAME=admin
ADMIN_PASSWORD=tu-contrasena
ADMIN_SESSION_SECRET=otro-secreto-largo
STORE_WHATSAPP_NUMBER=523333530262
```

`STORE_WHATSAPP_NUMBER` debe ir con codigo de pais y solo numeros.

## Ejecutar localmente

Para ver el frontend sin funciones:

```bash
python -m http.server 5173
```

Abre:

```text
http://localhost:5173
```

Para probar el panel administrador en modo local sin Netlify Functions:

```text
http://localhost:5173/#admin
```

Credenciales demo locales:

```text
Usuario: admin
Contraseña: admin123
```

Estas credenciales solo funcionan en `localhost`, `127.0.0.1` o al abrir el archivo localmente. En produccion usa `ADMIN_USERNAME` y `ADMIN_PASSWORD` en Netlify.

Para probar funciones y variables de entorno localmente, instala Netlify CLI y ejecuta:

```bash
netlify dev
```

## Desplegar

1. Sube esta carpeta a un repositorio.
2. Crea un sitio nuevo en Netlify.
3. Configura el directorio de publicacion como la raiz de esta carpeta.
4. Verifica que `netlify.toml` quede incluido.
5. Agrega las variables de entorno.
6. Publica el sitio.

## Flujo de pedido

1. El cliente ve solo productos `Activo` y productos `Sin stock` marcados como no disponibles.
2. Agrega productos al carrito.
3. Captura nombre, telefono y correo.
4. Se genera un folio tipo `PED-20260701-0001`.
5. El pedido se guarda en Sheets.
6. Se abre WhatsApp con el resumen.

El pedido no descuenta inventario automaticamente. El inventario baja solo cuando el administrador marca el pedido como `Surtido`.

## Panel administrador

Ruta:

```text
/#admin
```

Funciones incluidas:

- Login con usuario y contraseña desde variables de entorno.
- Alta y edicion de productos.
- Subida de hasta 3 fotos por producto a Drive.
- Eliminacion logica con estatus `Eliminado`.
- Busqueda y edicion basica de pedidos.
- Marcado de pedido como `Surtido` con descuento de inventario.
- Ajustes manuales de inventario.
- Dashboard mensual con indicadores y barras simples.

## Nota de produccion

Esta solucion es adecuada para una operacion ligera. Si el catalogo crece mucho o hay varios administradores simultaneos, el siguiente paso natural seria migrar Sheets a una base de datos dedicada.
