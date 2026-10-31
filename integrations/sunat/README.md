# Kit de evaluación del piloto SUNAT — H10

**Operación vigente:** la implementación posterior se entrega en `scripts/sunat-worker` y la feature `sunat-mailbox`, con [puesta en marcha y cierre](../../docs/hitos/evidencias/h10-cierre.md). Este documento describe únicamente el evaluador inicial y su laboratorio sintético; sus límites no describen las capacidades actuales del producto. Vercel Hobby/Supabase sustituyen la propuesta inicial de servidor privado permanente.

**Actualización del 28/10/2026:** la aplicación y el adaptador real desarrollados posteriormente están documentados en la [guía del worker](worker/README.md) y la [corrección del conector](../../docs/hitos/evidencias/h10-correccion-conector.md). Este kit conserva su alcance de preflight y simulador; no activa el servicio real ni convierte un piloto parcial en aprobado.

Este kit prepara y evalúa un expediente de factibilidad y contiene el núcleo del prototipo con simulador Docker. **Todavía no contiene el adaptador que se conecta a SUNAT.** El evaluador no hace solicitudes de red, no lee variables Supabase ni ejecuta trabajos diarios. El laboratorio hace solicitudes únicamente a su fixture de loopback, dentro de un contenedor sin red externa. Una evaluación aprobada significa «revisar las evidencias para comenzar la implementación», no «módulo implementado».

Acuerdos y condición de continuación: [H10](../../docs/hitos/h10-buzon-sunat.md). [Diseño y requisitos del administrador](../../docs/buzon-sunat.md). [Evidencias actuales](../../docs/hitos/evidencias/h10.md).

## Preparar el expediente privado

Desde la raíz del proyecto:

```powershell
yarn h10:preflight --init
```

Crea `.envs/local/sunat/request.json` y `evidence.json` desde los ejemplos de esta carpeta, **solo si no existen**. Usa año/mes de Lima y el mes calendario anterior como valores iniciales. El contenido de estos archivos está ignorado por Git.

`request.json` contiene identidad de la empresa, referencia de autorización, meses y confirmaciones administrativas. No introducir usuario SOL, clave, cookies, tokens ni contenido tributario. Sus contratos estrictos rechazan campos adicionales. `company_id` puede quedar en NULL para la prueba de acceso externa; debe vincularse antes de implementar acceso multiempresa.

Las fechas de autorización son ISO 8601 con zona. `months.current` debe corresponder al mes vigente en Lima y `months.previous` a un mes anterior conocido. Revisar esos valores al retomar el piloto en otro mes. Ninguna casilla de autorización se marca automáticamente al inicializar.

Si cambia la empresa piloto, conservar primero copias privadas del expediente anterior y utilizar una referencia de autorización diferente. No mezclar comprobaciones de distintas empresas para completar artificialmente un único expediente. El segundo caso conserva el PDF y sus referencias de origen en el directorio privado; el informe compartible solo contiene resultados resumidos.

## Registrar observaciones

`evidence.json` exige exactamente ocho comprobaciones distintas. Cada resultado `passed` o `failed` necesita una referencia opaca de evidencia, sin URL, token ni ruta absoluta. La referencia identifica el registro revisable conservado privadamente; el evaluador no certifica su contenido.

| Campo | Valores y significado |
|---|---|
| `provenance` | `not_run`, `synthetic` o `authorized_live`. No etiquetar fixtures como consultas reales. |
| `environment` | `not_run`, `authorized_browser` o `docker_local`. La observación en navegador no demuestra ejecución del worker. |
| `checks` | Los ocho IDs del protocolo; estado `pending`, `passed` o `failed`. |
| `measurements` | Duración ms, memoria MB, CPU ms, solicitudes, páginas y bytes descargados, medidos realmente. Ausente → NULL. |
| `limits` | Presupuestos de duración, memoria, solicitudes y páginas acordados para el worker. Ausente → NULL. |
| `behavior` | Consulta por filtro de origen o paginación acotada, comprobación diaria sin intervención y efecto de lectura. |

No incluir documentos reales ni direcciones autenticadas en los JSON. No resolver CAPTCHA mediante bypass. No producir cambios de lectura sin autorización. Las comprobaciones que no se puedan demostrar permanecen pendientes.

## Evaluar y conservar el resultado

```powershell
yarn h10:preflight
```

Escribe `test-results/local/h10/preflight.json`, con estados, mediciones y bloqueos; excluye identidad de empresa, operador, referencia privada y credenciales. No escribe en `docs` ni publica automáticamente el resultado.

| Código de salida | Interpretación |
|---|---|
| `0` | Expediente completo y elegible para revisión humana. No activa nada. |
| `2` | Falta información/evidencia o existe un bloqueo. Es el resultado esperado de un piloto incompleto. |
| `1` | Archivo/contrato/argumento inválido o fallo al preparar el informe. Se muestra un error genérico para evitar exponer datos de entrada. |

Son los códigos del script. Yarn Classic puede devolver `1` al propagar un código distinto de cero; su salida incluye el código original (`exit code 2` para expediente pendiente). Consultar también `status` en el informe.

Estados posibles: `awaiting_administrator`, `awaiting_live_evidence`, `pilot_failed`, `pilot_incomplete`, `ready_for_implementation_review`. Evidencia sintética, datos incompletos, prueba solo en navegador, autorización diferente, recursos fuera de presupuesto, lectura no autorizada o revisión diaria no demostrada impiden pasar la condición.

La capacidad del servidor privado y el vínculo de empresa siguen como prerrequisitos productivos separados. Este kit no implementa custodia cifrada de claves, esquema de base de datos, endpoints ni interfaz. Se implementarán después de validar la fuente y revisar las evidencias.

## Laboratorio del núcleo de consulta

```powershell
yarn h10:lab
```

Requiere Docker abierto y la imagen `docker.n8n.io/n8nio/n8n:2.0.0` ya disponible. No la descarga automáticamente. La imagen se utiliza únicamente para ejecutar Node con otro entrypoint; no inicia un workflow ni accede a la configuración de n8n.

El laboratorio corre aislado con red `none`, fixture HTTP en loopback, 256 MB y 0,5 CPU. Su transporte rechaza destinos remotos antes de la primera solicitud. No carga entornos, claves SOL, sesiones ni variables de Cloud. Los fixtures se crean y prueban dentro del contenedor.

Resultados en `test-results/local/h10-worker/results/worker-lab.json`; código temporal y checkpoints bajo la misma carpeta ignorada. No sustituye `.env.local`, builds ni servidores 4001/4002. El reporte declara `source: synthetic` y `live_sunat_connector_validated: false`.

El núcleo está en `scripts/sunat-pilot/worker`, con contratos, tipos, reglas puras, repositorios y servicios separados. Valida páginas, ventanas mensuales, continuidad, duplicación, presupuestos, sesión y consentimiento sobre lectura. Solo dispone de transporte para el simulador; sus códigos y rutas no deben utilizarse como una supuesta API de SUNAT.

Consultar [correcciones y límites](../../docs/hitos/evidencias/h10-correcciones.md). No copiar los resultados del laboratorio a los checks reales del expediente como si hubieran consultado SUNAT.

## Verificación del kit

```powershell
yarn test tests/h10-sunat-pilot.test.ts --maxWorkers=1 --no-file-parallelism
```

Son pruebas unitarias con observaciones ficticias en memoria. No contactan SUNAT ni Cloud y no cuentan como demostración de los ocho casos del piloto real.
