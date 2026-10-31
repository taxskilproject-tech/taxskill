# Worker propio SUNAT: Docker y Vercel Sandbox

## Operación vigente — cierre H10

El [recorrido productivo y la revisión diaria](../../../docs/hitos/evidencias/h10-production.json) están demostrados en Vercel Hobby/Supabase. La [aceptación](../../../docs/hitos/evidencias/h10-cierre.md) conserva la cobertura parcial de Mensajes del origen y la distingue del acceso, Notificaciones y PDF correctos.

`scripts/sunat-worker/run-one.ts` procesa un claim autorizado por VM. La aplicación crea el Sandbox, escribe entradas privadas de modo 0600, ejecuta directamente con el usuario de la imagen `pwuser` y valida UID 1001. No usar `asUser`/`sudo` para cargar o ejecutar: se comprobó una espera del `chown` de ese mecanismo. Un AbortSignal acota comando y espera; el cierre se confirma antes de liberar el lease global. VM: 1 vCPU, 2 GB, cuatro minutos, sin persistencia ni puertos públicos; imagen fijada por digest en `SUNAT_SANDBOX_IMAGE`.

Los secretos se configuran solamente en Production: keyring cifrador y firma HMAC como Secret; modo, banderas, imagen e ID de clave como Config. El diario está habilitado a las 08:00 de Lima. El callback del cron lleva una prueba de acción fija y consumo único, no claves SOL ni un bearer reutilizable. [Manual y recuperación](../../../docs/buzon-sunat-implementacion.md).

El simulador Docker se mantiene con origen real y diario desactivados. El ejecutor continuo descrito al final es una alternativa local, no un servicio permanente necesario en n8n. Las notas de pilotos que siguen son históricas y no sustituyen el estado operativo anterior.

**Corrección del 30/10/2026 verificada:** [preparación del formulario, menú y recuperación de sesión](../../../docs/hitos/evidencias/h10-correccion-autenticacion.md). Dos intentos totales, espera de dos segundos y límite de conexión de 70 segundos o el plazo menor del trabajo. Solo se reintenta `SOURCE_UNAVAILABLE`; contraseña rechazada, CAPTCHA o cambio inesperado terminan explícitamente. Se espera el evento de clic del enlace oficial antes de abrir el buzón. Docker y dos instancias Vercel con la misma imagen `h10-auth-menu-ready-20261030` completaron identidad, Notificaciones, PDF y renovación con IDs estables. Mensajes permanece parcial. Ocho instancias detenidas y cero snapshots. Esta validación no activa el worker real ni la programación diaria.

El adaptador utiliza **Chromium estándar con modo gráfico**, en un display virtual Xvfb. El piloto del 28/10/2026 completó el login, verificó el RUC, consultó Notificaciones de dos meses y descargó el PDF de referencia. Mensajes permanece incompleto por la discrepancia reproducida en SOL. [Resultados](../../../docs/hitos/evidencias/h10-correccion-conector.md).

## Preparación

- Usar la imagen oficial `mcr.microsoft.com/playwright:v1.64.1-noble`, correspondiente al `playwright-core` del lockfile.
- Compilar desde la raíz mediante `yarn h10:worker:build`. No ejecutar código de TypeScript con un segundo gestor ni generar otro lockfile.
- Conservar sandbox, usuario `pwuser`, TLS validado, `--init`, límites y sistema de archivos de solo lectura. No añadir flags de ocultamiento o modificación de identidad.
- En Linux, el modo real requiere `DISPLAY`. `xvfb-run -a` lo prepara sin abrir un servicio público. `--init` es necesario para manejar correctamente los procesos y señales del display; sin él se observó un inicio detenido antes de ejecutar Node.

### Imagen del conector

El [Dockerfile](Dockerfile) compila con Yarn y el lockfile raíz en la imagen oficial de Playwright. La etapa final **conserva la misma base oficial completa**, con sus dependencias de sistema y navegadores. El código propio incorpora solo cuatro bibliotecas Node: Supabase JS, PDF-lib, Playwright Core y Zod; no copia las dependencias de Next.js.

La variante reducida del 29/10/2026 arrancaba Chromium sin red, pero **falló en el login real también en Docker**. Una prueba cruzada con exactamente su mismo JavaScript y la base oficial sí pudo entrar. Por eso esa variante deja de recomendarse, aunque su smoke fuera correcto. La imagen corregida mide **2.571.722.232 bytes** y completó localmente acceso, Notificaciones, PDF y renovación de sesión. Mensajes permanece parcial. La tercera prueba autorizada en Vercel usó esta corrección, pero tampoco completó el login remoto; la causa sigue sin determinarse. [Comparación y límites](../../../docs/hitos/evidencias/h10-runtime-y-validacion.md).

`.dockerignore` excluye `.envs`, `.env*`, `.git`, builds y resultados privados. El Dockerfile solo copia código/dependencias; los accesos cifrados se proporcionan al ejecutar un piloto autorizado. Mantener el mismo criterio al publicar nuevas imágenes.

El registro y la prueba temporal de Vercel tienen su [evidencia separada](../../../docs/hitos/evidencias/h10-vercel-configuracion.md). El arranque Docker continúa disponible; no se reemplaza automáticamente el simulador ni se habilita la cola real por construir una imagen.

## Piloto autorizado, separado de la cola de TaxSkill

Requiere los archivos privados **ya preparados para la empresa autorizada**: `pilot.env` con keyring y referencia del RUC, y `pilot.json` con autorización y credenciales cifradas vinculadas al estudio/empresa/conexión/versión. Cada empresa adicional tiene un directorio y keyring propios; no sustituir los archivos de otro piloto. Nunca introducir sus valores en código, documentación o argumentos de consola. Este ejecutor no crea empresas, escribe en Supabase ni activa consultas diarias.

El JSON admite `pilot_reference` (por ejemplo, `pilot-3`) y `months` con exactamente dos meses distintos `YYYY-MM`. El ámbito y el RUC cifrados deben corresponder a esa empresa autorizada. Los archivos anteriores sin estos dos campos conservan `pilot-2` y octubre/septiembre de 2026 como valores de compatibilidad; no son autorización para consultar otros accesos. No incluir campos de contraseña en texto plano.

Desde `C:\Proyectos\tax-skill`, en PowerShell:

```powershell
yarn h10:worker:build
docker run --rm --init --name taxskill-h10-authorized-pilot `
  --user pwuser --memory 768m --cpus 0.75 --pids-limit 256 --shm-size 256m `
  --cap-drop ALL --read-only --tmpfs /tmp:rw,size=256m `
  --env-file .envs/local/sunat/pilot.env `
  --mount "type=bind,source=$PWD\node_modules,target=/app/node_modules,readonly" `
  --mount "type=bind,source=$PWD\.sunat-worker-build,target=/app/build,readonly" `
  --mount "type=bind,source=$PWD\.envs\local\sunat,target=/private" `
  --entrypoint timeout mcr.microsoft.com/playwright:v1.64.1-noble `
  250s xvfb-run -a node /app/build/scripts/sunat-worker/pilot.js
```

El comando anterior conserva el directorio del segundo piloto. Para el tercero se usó `.envs/local/sunat/pilot-3/pilot.env` y se montó únicamente `.envs/local/sunat/pilot-3` como `/private`, con otro nombre de contenedor. Revisar autorización, referencia y meses antes de ejecutar; no realizar sesiones concurrentes de una misma cuenta. Las observaciones y el hash del archivo quedan en `/private/results/connector.json` de cada piloto, ignorado por Git. La consola solo muestra códigos, resultados y cantidades. [Contraste independiente del tercer piloto](../../../docs/hitos/evidencias/h10-tercer-piloto.md).

El proceso Node define salida `0` para consultas y adjunto completos en ese recorrido; todavía requiere revisar las ocho comprobaciones. Define `2` para resultado incompleto, por ejemplo `PAGE_INCONSISTENT`, y `1` para fallo de acceso, contrato o ejecución. Registrar también el código real devuelto por el contenedor: en el tercer recorrido Docker CLI terminó con `1` aunque el ejecutor escribió un informe parcial. No interpretar ningún código no nulo como éxito ni omitir la revisión del JSON.

## Ejecutor continuo local y condición histórica del piloto

El punto de entrada continuo es `scripts/sunat-worker/worker.ts`, compilado bajo `.sunat-worker-build`. Conserva `SUNAT_SOURCE_VALIDATED=false` y `SUNAT_RUN_DAILY=false` en el simulador. No ejecutar otro consumidor de su cola durante la presentación. Production utiliza `run-one.ts` en Sandbox temporal; sus banderas reales no se copian al laboratorio.

Construir una imagen no autoriza por sí solo publicaciones ni activación diaria. La puesta en marcha posterior de H10 sí fue solicitada por el usuario y sus evidencias están enlazadas arriba. Las peticiones de listado observadas pertenecen al portal interno de SUNAT; no constituyen una API pública con contrato garantizado.
