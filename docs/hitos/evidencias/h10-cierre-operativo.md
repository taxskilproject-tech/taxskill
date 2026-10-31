# H10 — registro del cierre operativo

Actualizado el **30/10/2026, America/Lima**. [Cierre y aceptación final](h10-cierre.md) · [Hito](../h10-buzon-sunat.md) · [Corrección de acceso](h10-correccion-autenticacion.md).

## Alcance solicitado

El usuario pidió terminar H10, incluyendo su operación real. Después de los pilotos, se completaron integración, publicación, diario, recuperación y comprobaciones finales registradas abajo. Las páginas inconsistentes de SUNAT conservan cobertura parcial explícita; no se atribuye al producto una integridad que el origen no entrega.

El usuario autorizó utilizar la última empresa piloto en Cloud y confirmó que el nombre facilitado corresponde a la empresa real. Sus identificadores y accesos permanecen en archivos privados ignorados, no en este registro. Para su alta documental confirmó **MYPE, IGV renta, PLAME, EsSalud y AFP**; ambas consultas tributarias serán **mensuales**. Los plazos internos iniciales serán **cierre del periodo y día del evento**. El alta conservará entregables pendientes de responsable, según H09.

## Implementación añadida

- Ejecución desde `/api/sunat/run`, con sesión y autorización del trabajo/empresa repetidas en PostgreSQL. Las consultas habituales siguen directamente a Supabase.
- Despacho autenticado `/api/sunat/dispatch` para el programador. No concede acceso a datos ni devuelve credenciales.
- Lease global que evita crear otra VM hasta confirmar cierre o expirar el límite. Cada ejecución usa una VM sin persistencia, sin puertos públicos, con un vCPU y límite temporal.
- Entrada `run-one.ts`: procesa un trabajo reclamado, valida de nuevo su lease antes de acceder a SOL y elimina sus archivos privados de entrada. El modo simulador rechaza destinos remotos.
- Recuperación por nombre cuando se pierde la respuesta de creación; un cierre incierto conserva el bloqueo. Los fallos de cuota tienen un mensaje explícito.
- Barrido diario de hasta tres páginas nuevas por bandeja, más comprobación del ancla al continuar. Reutiliza cursores de barridos limitados; si cambia el ancla, reinicia dentro del presupuesto restante. No presume orden cronológico ni un filtro temporal nativo inexistente en el mecanismo observado.
- Los resultados parciales no adelantan la última consulta correcta. La línea base de avisos se mantiene separada de la cobertura completa para permitir detectar nuevos IDs recuperados sin duplicar avisos.
- Programador SQL definido, inicialmente sin activar. La clave de firma permanece en Vault y Vercel. La cola HTTP administrada contiene únicamente una prueba HMAC de una acción fija, con nonce consumible una vez y caducidad de 90 segundos; no contiene claves reutilizables ni identificadores tributarios.

## Migraciones nuevas de esta etapa

| Versión | Propósito | Estado al registrar |
|---|---|---|
| `20261030060053` | Ejecutor, lease global y autorización de trabajos. | Docker y Cloud. |
| `20261030061255` | Continuación diaria, línea base y cola secuencial. | Docker y Cloud. |
| `20261030061258` | Programador autenticado y diagnóstico. | Docker y Cloud; sin activar al publicar. |
| `20261031010608` | Finalización y auditoría aun después de revocación. | Docker y Cloud. |
| `20261031012538` | Firma HMAC y nonce de un solo uso. | Docker y Cloud. |

Los timestamps los asigna Supabase CLI en UTC; algunos comienzan el 31 aunque la fecha civil de Lima aún sea el 30. Estas versiones se suman a las diez H10 anteriores. [Publicación verificada](h10-cloud-migrations.json): **98 migraciones y 13 huellas históricas conservadas**, sin seeds ni activación H10. Dos experimentos locales no publicados de ACL sobre `pg_net` se archivaron: sus tablas son administradas por Supabase y el rol de aplicación no puede cambiar esos permisos. Se conciliaron únicamente sus entradas de historial Docker; no se borraron tablas ni datos ni se reparó historia Cloud.

## Evidencias y trabajo restante

- [x] SDK `@vercel/sandbox@3.9.1` incorporado con Yarn y lockfile único.
- [x] Once comprobaciones nuevas de ejecutor y continuación aprobadas, con SDK simulado y transporte sin red real.
- [x] Contratos actualizados y compilación del worker a 70 módulos propios.
- [x] Docker recuperado conservando volúmenes. Presentación anterior reabierta en 4003; no se reconstruye su build mientras se utiliza.
- [x] [34 comprobaciones SQL](h10-dispatch-sql.json): firma, uso único, línea base, revocación, lease y deduplicación; transacción revertida en Docker.
- [x] [Prueba Docker de `run-one`](h10-one-job.json) contra el servicio local: trabajo completo, entradas privadas eliminadas, contenedor cerrado y lease liberado. No es una prueba real SUNAT.
- [x] Regresión completa: 75 archivos y 501 pruebas; lint, arquitectura, tipos, `yarn build` aislado y bundle. Después del último ajuste de respaldo, tres archivos y cuatro pruebas específicas aprobados. [Validación final](h10-validacion-final.json).
- [x] Imagen inmutable y entorno Vercel integrados. La ejecución usa `pwuser` de la imagen, con validación UID en el worker; el cambio mediante `sudo` provocaba esperas y se eliminó. Se conservan los intentos fallidos.
- [x] Publicación SQL conservando historia y datos ajenos.
- [x] [Plantilla MYPE y alta real](h10-company-preparation.json) mediante H09: 28 entregables pendientes de responsable; siete plantillas restantes sin publicar. Conexión guardada cifrada y verificada desde la aplicación publicada.
- [x] [Recorrido productivo](h10-production.json): conexión, dos meses, mensaje y PDF, caché reutilizada, callback firmado HTTP 200 y un trabajo diario para la fecha de Lima. Los resultados incompletos no adelantan la fecha de consulta correcta.
- [x] [Respaldo y recuperación](h10-recovery.json): DB, adjunto y keyring cifrados; restauración Docker, FK y descifrado en memoria, con jobs restaurados desactivados.
- [x] [Diez comprobaciones de acceso actuales](h10-continuous-access.json) con cuatro perfiles, conservando el simulador activo. La regresión de cola de veinte casos anterior permanece separada: requiere laboratorio sin consumidor concurrente.
- [x] [Revisión de interfaz](h10-ui-final.json): login, loading, foco, Escape, escritorio y móvil, con capturas ficticias exclusivamente locales y cero errores de navegador.
- [x] Auditoría final por requisito; ajuste de reintento en cola publicado. Deployment `dpl_5WfDQHb6VFvP9KuTByCYzq73GSXd` Production Ready y promovido al dominio canónico. [Smoke final](h10-release-smoke.json): sesión/conexión correctas, 16 chunks sin secretos configurados y petición de despacho sin firma rechazada con 401, sin crear consultas SUNAT.

La lectura previa encontró 83 migraciones, ninguna empresa y un miembro interno activo. Después de publicar se verificaron 98 migraciones, esquema H10 y conservación de las trece huellas; después se creó únicamente la empresa real confirmada. El respaldo previo se cifró en memoria y se verificó antes de publicar. La imagen integrada `h10-integrated-20261031` está lista en el registro privado, fijada por digest. Se configuraron siete variables H10 en Production, dos de ellas Secret; `.env.vercel` conserva el export consolidado y las exclusiones del despliegue protegen archivos privados.

Las cuotas Hobby se verificaron en la [documentación oficial de Sandbox](https://vercel.com/docs/sandbox/pricing): el consumo se limita por plan y la creación se pausa al agotarse la cuota; no se cambiará de plan automáticamente. Las mediciones anteriores no sustituyen las del recorrido integrado.
