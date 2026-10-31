# H10 — tercer piloto autorizado

Fecha: **28/10/2026, America/Lima**. [Hito](../h10-buzon-sunat.md) · [Resultado del conector](h10-conector-piloto-3.json) · [Piloto anterior](h10-correccion-conector.md).

## Resultado

La tercera empresa pudo iniciar sesión y abrir su buzón tanto en Chrome habitual como en el conector propio ejecutado en Docker. **El acceso no está bloqueado.** Se reprodujo otra discrepancia de paginación en Mensajes; no se puede certificar su consulta completa.

| Comprobación | Resultado observado |
|---|---|
| Identidad | RUC exacto validado por el conector antes de consultar. |
| Notificaciones, octubre de 2026 | 1 registro del mes; las 5 páginas del origen se recorrieron y aceptaron. |
| Notificaciones, septiembre de 2026 | 0 registros del mes, tras recorrer las 5 páginas. Este vacío es completo únicamente para esta bandeja y mes. |
| Mensajes en SOL, página 1 | Contador 1–25 de 54; 17 filas visibles. |
| Mensajes en SOL, página 2 | Contador 26–50 de 54; 0 filas visibles. |
| Mensajes en SOL, página 3 | Contador 51–54 de 54; 0 filas visibles. |
| Mensajes mediante el conector | Ambos meses quedan parciales con `PAGE_INCONSISTENT`; no se acepta una primera página cuyo rango y filas discrepan. El conteo aceptado de cero no significa ausencia de mensajes. |
| Adjunto | PDF de 87.581 bytes descargado y validado. Hash en el JSON; no se publica su contenido ni se atribuye la comparación manual del PDF del piloto anterior a este archivo. |
| Identificadores y sesión | Huella no vacía de la primera página de Notificaciones estable al repetir y tras renovar sesión. No demuestra los IDs de los registros de Mensajes que SUNAT no entrega. |
| Lectura | No había referencia sin leer en la primera página de Notificaciones dentro de los dos meses autorizados. Resultado `NO_UNREAD_REFERENCE`, sin presentar P08 como aprobado. |

El contraste se realizó entrando a **Mis Trámites y Consultas → Buzón Electrónico → Mensajes** del portal oficial. Se cerró la sesión manual antes del segundo intento del conector. No se guardan asuntos, RUC, usuarios, URLs autenticadas ni documentos en esta evidencia.

## Ejecución y cambios

El primer intento terminó por timeout durante la apertura del buzón, antes de leer mensajes. No se interpretó como credencial incorrecta ni bandeja vacía. Se agregó observación de visibilidad del control, expansión condicional del menú cuando está plegado y etapas separadas de apertura, carga e identidad. En el intento satisfactorio el control ya estaba visible: **no se atribuye el timeout inicial al menú plegado sin evidencia**.

El piloto ahora recibe referencia y dos meses explícitos, conserva el ámbito cifrado de cada empresa y admite los archivos anteriores. La tercera prueba utiliza un directorio y keyring propios; no sobrescribe resultados anteriores. El cierre mensual se calcula en UTC, incluyendo febrero bisiesto, sin depender del huso horario del host.

El recorrido satisfactorio duró **30.502 ms**, con **251 solicitudes**, **429,754 MB** de pico y **14.661,6639 ms** de CPU del contenedor. Incluye consultas repetidas, cuatro combinaciones de mes/bandeja, adjunto y otro login; no representa el costo de una sincronización diaria. Límites: 768 MB, 0,75 CPU, 256 procesos, 256 MB de memoria compartida y 250 segundos. El informe se escribió con resultado parcial; Docker CLI terminó con código 1. No se registra como una ejecución completa o exitosa.

## Validación y límites

- **57 pruebas de seis archivos H10 aprobadas**, incluidas 18 nuevas de entrada del piloto y periodos civiles. No realizan solicitudes reales ni usan Supabase Cloud.
- Tipos, lint y arquitectura del proyecto aprobados; `yarn h10:worker:build` compiló 43 módulos propios. La compilación web no se repite para este cambio exclusivo del ejecutor y adaptador; se conserva el build de presentación.
- Presentación H10 en `http://localhost:4003/login` comprobada con HTTP 200 y contenedor `taxskill-h10-worker` todavía activo. No se reiniciaron ni pausaron. `git diff --check` sin errores de espacios y ambos archivos cifrados/clave del nuevo piloto ignorados por Git.
- Se mantienen las condiciones pendientes de [aceptación del origen](h10-correccion-conector.md#pendientes-de-aceptación-del-origen): integridad de Mensajes, revisión diaria incremental, efecto de lectura del conector y capacidad/operación definitiva.
- No se modifican Cloud, Vercel, la cola del simulador ni automatizaciones productivas. `SUNAT_SOURCE_VALIDATED` y revisión diaria real permanecen desactivados. **H10 continúa abierto.**
