# Progreso y marcas personales

Se agregan **dos páginas HTML**, servidas por la propia API:

| Página | Dirección local con la configuración de ejemplo |
| --- | --- |
| Mi progreso | `http://localhost:5000/progress.html` |
| Mis marcas personales | `http://localhost:5000/personal-records.html` |

La raíz `/` redirige a progreso. Los archivos están en `public/`; JavaScript y CSS compartidos evitan repetir la lógica de acceso y los estilos. No necesitan Live Server ni un framework adicional. Se abren después de `npm start`, mediante HTTP.

## Diseño y referencia

El enlace de Figma proporcionado es `JeV0ijBsh49UI6l3EPrBoD`, nodo `0:1`. La integración rechazó el acceso al archivo, por lo que no se pudieron verificar sus pantallas ni descargar sus recursos. Esta entrega es una **propuesta visual propia pendiente de comparar con Figma**, no una reproducción certificada del prototipo.

Se utiliza verde oscuro, acentos lima y fondos claros para separar navegación, indicadores y datos. La fuente Manrope se sirve localmente con su licencia OFL; no depende de un servicio de fuentes externo. La navegación identifica la página activa y se adapta al ancho de pantalla. Hay foco visible, etiquetas de formularios, mensajes anunciados con `aria-live`, descripción textual de los gráficos y reducción de movimiento. La compatibilidad con un dispositivo móvil físico sigue pendiente de revisión.

## Datos y operaciones reales

| Vista o acción | Endpoint utilizado |
| --- | --- |
| Registro desde el diálogo de acceso | `POST /users` |
| Inicio de sesión | `POST /sessions` |
| Comprobación del perfil | `GET /users/{id}` |
| Racha, clases asistidas y categorías | `GET /users/{userId}/progress` |
| Historial y próximas clases | `GET /users/{userId}/reservations`, con filtro de estado |
| Lista de marcas | `GET /users/{userId}/personal-records` |
| Nueva marca | `POST /users/{userId}/personal-records` |
| Editar marca | `PATCH /personal-records/{id}` |
| Eliminar marca | `DELETE /personal-records/{id}` |

Las listas se consultan por páginas hasta completar los resultados; no se presupone que los primeros 100 sean todos. No se incorporaron resultados, marcas o asistencias ficticias en el HTML ni en los módulos del navegador. Los registros sintéticos de la revisión se cargaron exclusivamente en una base de pruebas.

La racha y los totales vienen del servidor. El gráfico semanal distribuye las asistencias por semana y el gráfico de marcas reúne solo el mismo ejercicio, tipo y unidad. No compara kg con lb ni distancia con tiempo. La lista de clases conserva la asistencia confirmada por el administrador; la interfaz del cliente no puede confirmarla por sí misma.

## Usar las páginas

1. Configura `.env` y ejecuta `db:setup`, la migración si tienes cuentas existentes, `db:seed` y `db:demo`.
2. Inicia la API con `npm start` y abre una de las direcciones anteriores.
3. Pulsa **Iniciar sesión**. Usa el correo y contraseña de `DEMO_CLIENT_EMAIL` y `DEMO_CLIENT_PASSWORD`, o crea una cuenta desde la pestaña **Crear cuenta**.
4. En marcas, pulsa **Nueva marca** y completa ejercicio, tipo, resultado, unidad y fecha. Puedes buscar, filtrar, ordenar, editar y eliminar con confirmación.
5. En progreso, consulta tus asistencias, cambia el periodo del gráfico y pulsa **Actualizar** después de que el administrador confirme una asistencia.

Una cuenta nueva puede mostrar cero asistencias y ninguna marca: es el estado vacío correcto. `db:demo` prepara una reserva terminada, pero no confirma su asistencia. Para mostrar esa clase como asistida, entra como administrador en Swagger, busca la reserva del cliente y ejecuta `PATCH /reservations/{id}/attendance` con `{"status":"attended"}`. Después actualiza la página del cliente. Las dos interfaces conservan sus tokens por separado: autorizar Swagger no inicia sesión automáticamente en el HTML.

## Estados de interacción

- Carga: aviso visible y botón de envío desactivado mientras se espera al servidor.
- Error: se muestra el rechazo de la API y se conserva el formulario para corregirlo; los fallos de carga permiten reintentar.
- Confirmación: una operación correcta actualiza la lista desde la API y muestra el resultado.
- Vacío: hay un mensaje propio si no existen asistencias, reservas, marcas o resultados de búsqueda.
- Sesión terminada: se retiran los datos y se ofrece iniciar sesión nuevamente.

El administrador puede consultar su información, pero los botones de escritura de marcas requieren una cuenta de cliente. El servidor sigue comprobando propiedad y rol en cada operación: ocultar un botón no sustituye esa comprobación.

## Integración con el equipo

Este cambio cubre las dos páginas de Laura y un diálogo de registro/login para utilizarlas. No implementa el catálogo, compras, reservas ni el panel completo como pantallas web. Sus endpoints continúan disponibles. El informe consolidado, la comparación visual pendiente con Figma y el video funcional se integran con el resto de la entrega del equipo. Los bloques del segundo corte en `docs/informe/` se conservan como documento histórico; los fragmentos de esta evolución están en esta carpeta.
