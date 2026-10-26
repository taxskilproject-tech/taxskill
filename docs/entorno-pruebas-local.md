# Entorno de pruebas local

**Actualización posterior del 25/10/2026:** [rediseño documental por periodos](vista-documental-periodos.md). Para probarlo seleccionar **Demostración · Documentos por periodo**, octubre de 2026 y Ana Demostración en Laboral por trabajador. Docker ahora incorpora 74 migraciones; el registro de habilitación original que sigue abajo refleja las 72 que existían al prepararlo. Accesos locales conservados, sin cambios Cloud.

Estado comprobado el 25/10/2026, America/Lima. Se habilitó a solicitud del usuario para probar funcionalidad con datos ficticios exclusivamente en Docker. Esta operación no modificó Supabase Cloud, Vercel ni n8n productivo.

## Acceso

- Aplicación: <http://127.0.0.1:4001/login>.
- Perfiles comprobados mediante login y contexto autorizado: administrador, contador, supervisor y cliente.
- Usuarios y contraseñas existentes: [archivo privado de accesos](../.envs/local/accesos-pruebas.md). Está ignorado por Git; no se versionan contraseñas en esta documentación.
- Para empezar, seleccionar **H05 · Empresa de pruebas local** y abrir Tributario, Laboral por trabajador o Laboral general. También hay empresas H02 y actividades H06.

Los cuatro perfiles conservan sus permisos diferentes. No se restablecieron contraseñas ni se eliminaron datos para habilitar las pruebas.

## Servicios habilitados

| Servicio | Destino y comprobación |
|---|---|
| Next.js | `127.0.0.1:4001`, compilación ya validada servida con `yarn start`; Inicio administrativo comprobado en navegador. |
| Supabase | Docker TaxSkill, API `127.0.0.1:54331`; 72 migraciones existentes. |
| Archivos | Edge `document-operations`, con autenticación propia y entorno local. |
| Generación | Programadores locales H04/H05 activos; sus continuaciones registraron ejecuciones correctas. |
| Notificaciones | `h06-notifications-dispatch` activo; función local respondió HTTP 200 y la aplicación recibió callbacks del simulador. |
| n8n | Contenedor existente `tax-skill-h06-n8n`, loopback `127.0.0.1:5679`; workflow local guardado y publicado. |
| WhatsApp simulado | Proveedor local en 5680, modo `delivered`, sin fallos inyectados. No llama a Evolution ni envía a números reales. |

La cadena de pruebas usa únicamente Supabase Docker, proveedor local y callback de la aplicación en 4001. Se conservaron secretos existentes. El servidor de desarrollo agotó memoria durante las actualizaciones del simulador; se sustituyó por el servidor de la compilación validada, sin cambios de código o dependencias.

Los servicios requieren mantener Docker y los procesos locales en marcha; no se instaló un servicio de Windows ni se configuró arranque permanente.

## Advertencias operativas que se conservan

Esto habilita pruebas funcionales; no declara preparados los controles productivos de H08.

El intento `yarn backup:local` se detuvo con **«Falta un objeto confirmado en el respaldo»**. El estudio sintético de capacidad H07 contiene **1.000 versiones solo de metadatos**, identificadas por `storage_path` con prefijo `h07-fixtures/` y hash de prueba repetido. El fixture está documentado como ensayo de consulta/exportación sin objetos Storage. El respaldo completo debe rechazar esos registros: no se inventaron archivos, hashes ni confirmaciones de respaldo.

Por esa condición y la ausencia de recuperación confirmada en la base local principal, no se habilitó el programador unificado H08 que exige respaldo y restauración verificadas. La generación funcional local conserva los programadores H04/H05; el panel en «Operación productiva esperada» puede seguir señalando la ausencia de `h08-generation`, cleanup y respaldo. No se ocultaron esas incidencias ni se relajaron las comprobaciones.

Resolver el aislamiento del fixture de capacidad y repetir copia/restauración completa es un trabajo separado; no requiere modificar ni limpiar Cloud. La [guía de operación](operacion-produccion.md), las [reglas de entornos](desarrollo.md) y el [laboratorio n8n](../integrations/n8n/README.md) describen los contratos existentes.

## Comprobaciones de esta habilitación

- Los cuatro logins y contextos de empresa resultaron válidos.
- Se confirmó que `.env.local` apunta al Supabase Docker de TaxSkill.
- Se comprobó que todas las URLs HTTP del workflow local corresponden al laboratorio.
- Se reactivaron H04/H05 y se confirmó H06 con el secreto local existente.
- La función de notificaciones respondió HTTP 200 y el servidor recibió receipts HTTP 200.
- El respaldo incompleto quedó registrado como fallido, sin marcarlo exitoso.
- La evidencia operativa sin contraseñas se conserva en `test-results/local/habilitar-pruebas-evidencia.json`, ignorado por Git.

No se modificó código de la aplicación ni se volvió a ejecutar la batería completa. Se reutilizó el build validado de la entrega UX/UI. El aviso de seguridad del framework documentado en la [auditoría](auditoria-ux-ui.md) continúa pendiente.
