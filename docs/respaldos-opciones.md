# Respaldo independiente: opciones económicas

Comparación consultada el **18 de octubre de 2026**. Es una recomendación técnica, no una contratación ni una decisión confirmada. Complementa [operación H08](operacion-produccion.md).

## Recomendación

Para priorizar el costo del respaldo diario de TaxSkill, elegiría **Backblaze B2**. La recuperación es ocasional y su almacenamiento cuesta menos que R2. **Cloudflare R2 Standard** es una buena alternativa si se esperan muchas restauraciones o se prefiere salida de datos sin cargo.

| Opción | Almacenamiento publicado | Incluido | Recuperación / salida |
|---|---|---|---|
| Backblaze B2 | US$6,95 por TB/mes | Primeros 10 GB gratuitos; API estándar sin cargo. | Hasta 3 veces el almacenamiento promedio mensual sin cargo; excedente US$0,01/GB. |
| Cloudflare R2 Standard | US$0,015 por GB/mes | 10 GB-mes, 1 millón de operaciones A y 10 millones B/mes. | Salida sin cargo; operaciones adicionales se cobran. |

Fuentes primarias: [precios B2](https://www.backblaze.com/cloud-storage/pricing), [actualización B2 vigente desde mayo de 2026](https://www.backblaze.com/blog/backblaze-pricing-and-product-updates/) y [precios R2](https://developers.cloudflare.com/r2/pricing/). La tarifa B2 antigua de US$6/TB ya no es la referencia para una cuenta nueva de pago por uso.

Estimaciones de almacenamiento mensual constante, aplicando 10 GB gratuitos y conversión orientativa 1 TB = 1.000 GB:

| Total de copias almacenadas | B2 aprox. | R2 Standard aprox. |
|---|---:|---:|
| 10 GB | US$0 | US$0 |
| 100 GB | US$0,63 | US$1,35 |
| 500 GB | US$3,41 | US$7,35 |

Son cálculos orientativos de almacenamiento, sin impuestos, ejecución de jobs, tráfico saliente de Supabase ni posibles solicitudes/transferencias fuera de lo incluido. No representan una medición del tamaño actual del proyecto. Se paga por el total retenido de dumps/manifiestos y archivos; no solo por el tamaño de una copia de la base.

## Configuración propuesta

Bucket privado independiente de Supabase, copias cifradas antes de subirlas, clave bajo custodia separada y credencial limitada al bucket/prefijo. Dump DB diario, archivos incrementales por hash, retención inicial de dumps de 30 días y prueba periódica de restauración. No expirar por antigüedad los objetos compartidos mientras existan manifiestos vigentes que los referencien.

El código H08 preparado usa AWS CLI/S3 y el workflow AWS usa OIDC. Para elegir B2 o R2 hay que adaptar y verificar endpoint S3, autenticación y opciones compatibles del proveedor; no se ha creado una cuenta, configurado un bucket o probado una copia remota. El flujo AWS/OIDC no se activa tal cual para B2/R2. La comparación tampoco sustituye el respaldo de archivos: el backup DB de Supabase no incluye sus bytes.

## Decisión temporal del usuario: Supabase Storage

El 18/10/2026 el usuario eligió usar por ahora el Storage del mismo proyecto. Se añadió el destino `supabase-storage`, con bucket privado `system-backups`, archivos cifrados antes de subirlos, objetos incrementales por hash y manifiesto que identifica el destino. La clave permanece en configuración privada; el navegador no recibe acceso al bucket. Esta elección aplaza contratar almacenamiento externo: **una copia en el mismo proyecto comparte su riesgo de eliminación, indisponibilidad o pérdida de acceso**.

Descarga íntegra mediante `backup:fetch` y restauración aislada comprobadas en Docker. Tras instalar la CA oficial y usar el rol autorizado por el CLI, se completó la copia real **ffe0c353-a303-4499-8189-57dbd8362eeb**, su descarga autenticada y su restauración en Docker vacío: 64 migraciones, 13 huellas coincidentes, sesiones revocadas y login nuevo correcto en **54,38 s**. La copia actual tiene cero documentos; el ensayo de bytes se hizo localmente con un PDF. Los fallos anteriores se conservaron y TLS sigue en `verify-full`. Falta configurar identidad/ejecutor permanente, custodia independiente y objetivos al volumen real. La retención de 30 días sigue como política propuesta; no se activó eliminación automática de objetos compartidos. [Evidencia](hitos/evidencias/h08.md).

El respaldo DB nativo de Supabase sigue sin incluir los bytes de Storage; este adaptador copia los objetos confirmados y los cifra por separado. [Limitación documentada por Supabase](https://supabase.com/docs/guides/platform/backups).
