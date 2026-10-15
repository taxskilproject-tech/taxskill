# DOCUMENTO DE ANÁLISIS DEL PROYECTO

## Sistema de Gestión y Control Documental Contable y Laboral Multiempresa

---

# 1. Información general del proyecto

## 1.1 Nombre del proyecto

**Sistema de Gestión y Control Documental Contable y Laboral Multiempresa**

Nombre abreviado provisional:

**SGD Contable**

El nombre comercial definitivo podrá definirse posteriormente.

---

## 1.2 Descripción general

El proyecto consiste en el desarrollo de una plataforma web orientada a estudios contables, contadores independientes y organizaciones responsables de administrar documentación tributaria y laboral de múltiples empresas.

La plataforma permitirá centralizar la recepción, clasificación, revisión, aprobación, observación y seguimiento de documentos entregados por las empresas clientes.

Cada empresa contará con usuarios autorizados que podrán cargar documentación únicamente dentro de las empresas y módulos para los cuales tengan permisos.

Los responsables contables podrán supervisar desde un único panel el nivel de cumplimiento documental de todas las empresas administradas, identificando documentos pendientes, observados, aprobados, próximos a vencer o vencidos.

El sistema buscará reemplazar procesos actualmente realizados mediante carpetas físicas, Google Drive, Excel, WhatsApp, correo electrónico y otros medios dispersos.

La plataforma no será únicamente un repositorio de archivos. Su objetivo principal será funcionar como un sistema de **control de obligaciones documentales**.

---

# 2. Problema identificado

Los estudios contables administran periódicamente grandes cantidades de documentación perteneciente a diferentes empresas.

Esta documentación suele encontrarse distribuida entre:

- Carpetas físicas.
- Computadoras personales.
- Google Drive.
- WhatsApp.
- Correos electrónicos.
- Hojas de cálculo.
- Carpetas compartidas.
- Dispositivos externos.

Esta situación genera diferentes problemas.

Entre ellos:

- Dificultad para conocer qué documentos faltan.
- Pérdida de tiempo solicitando constantemente documentación.
- Archivos duplicados.
- Documentos enviados fuera de plazo.
- Información almacenada sin una estructura uniforme.
- Dificultad para determinar quién cargó determinado archivo.
- Falta de historial de versiones.
- Dificultad para comprobar si un documento fue revisado.
- Falta de trazabilidad.
- Riesgo de pérdida de archivos.
- Dificultad para controlar muchas empresas simultáneamente.
- Dependencia excesiva de hojas de cálculo.
- Falta de indicadores de cumplimiento.
- Seguimiento manual mediante llamadas y mensajes.

El problema principal puede resumirse de la siguiente manera:

> El contador dispone de documentos, pero no dispone de una herramienta centralizada que le permita controlar eficientemente el estado documental de todas las empresas que administra.

---

# 3. Solución propuesta

Se desarrollará una plataforma centralizada donde cada empresa tenga su propio espacio documental.

El sistema permitirá estructurar la información de la siguiente manera:

**Estudio contable**

→ Empresas

→ Usuarios asignados

→ Módulos

→ Obligaciones documentales

→ Periodos

→ Documentos

→ Versiones

→ Revisiones

→ Estados

→ Observaciones

→ Historial

El sistema generará obligaciones documentales de acuerdo con la periodicidad configurada.

Por ejemplo:

Si una empresa debe presentar mensualmente:

**Registro de compras**

el sistema generará:

- Registro de compras – Enero 2026.
- Registro de compras – Febrero 2026.
- Registro de compras – Marzo 2026.
- Etc.

Cada obligación tendrá un estado independiente.

Esto permitirá saber no solamente si existe un archivo, sino también si el documento:

- falta,
- fue cargado,
- está siendo revisado,
- fue observado,
- fue corregido,
- fue aprobado,
- está vencido,
- o no aplica.

---

# 4. Objetivo general

Desarrollar una plataforma web multiempresa que permita administrar, supervisar y controlar de manera centralizada la documentación tributaria y laboral requerida por un estudio contable, facilitando la recepción de archivos, revisión, control de cumplimiento, generación de alertas, trazabilidad y consulta histórica.

---

# 5. Objetivos específicos

El sistema deberá permitir:

1. Registrar múltiples empresas.
2. Crear usuarios y asignarlos a una o varias empresas.
3. Definir roles y permisos.
4. Configurar los documentos requeridos para cada empresa.
5. Establecer periodicidades documentales.
6. Generar automáticamente obligaciones según el periodo correspondiente.
7. Permitir que los clientes carguen documentación.
8. Permitir que el contador revise los documentos.
9. Registrar observaciones.
10. Permitir la corrección de documentos observados.
11. Mantener versiones anteriores de los archivos.
12. Mostrar documentos pendientes.
13. Mostrar documentos vencidos.
14. Alertar sobre próximos vencimientos.
15. Calcular porcentajes de cumplimiento.
16. Mantener expedientes laborales individuales.
17. Gestionar trabajadores activos y cesados.
18. Mantener documentación laboral general de cada empresa.
19. Generar reportes.
20. Registrar un historial de auditoría.

---

# 6. Tipo de sistema

El sistema será inicialmente una:

**Aplicación web responsive multiempresa.**

Deberá funcionar principalmente en:

- Computadoras.
- Laptops.
- Tablets.
- Smartphones.

No será necesario inicialmente desarrollar una aplicación móvil nativa.

La plataforma web deberá adaptarse correctamente a dispositivos móviles.

---

# 7. Actores del sistema

## 7.1 Administrador

Usuario con el máximo nivel de acceso.

Podrá:

- Crear empresas.
- Editar empresas.
- Desactivar empresas.
- Crear usuarios.
- Asignar empresas.
- Asignar roles.
- Configurar documentos.
- Configurar periodicidades.
- Visualizar todas las empresas.
- Visualizar reportes.
- Administrar permisos.
- Consultar auditoría.
- Configurar parámetros generales.

## 7.2 Contador

Responsable del control documental.

Podrá:

- Acceder a empresas asignadas.
- Revisar documentos.
- Aprobar documentos.
- Observar documentos.
- Consultar pendientes.
- Consultar vencimientos.
- Revisar expedientes de empleados.
- Descargar documentación.
- Visualizar reportes.
- Consultar historial.

## 7.3 Supervisor

Usuario encargado de verificar el trabajo realizado.

Dependiendo de los permisos podrá:

- Revisar empresas.
- Consultar documentación.
- Aprobar determinados documentos.
- Consultar cumplimiento.
- Generar reportes.
- Consultar observaciones.

## 7.4 Usuario de empresa / Cliente

Representante de la empresa cliente.

Podrá:

- Acceder únicamente a empresas autorizadas.
- Visualizar obligaciones documentales.
- Subir archivos.
- Consultar observaciones.
- Corregir documentos.
- Descargar documentos propios.
- Consultar estados.
- Consultar fechas de vencimiento.

No podrá visualizar información perteneciente a otras empresas.

---

# 8. Arquitectura funcional general

El sistema estará compuesto inicialmente por los siguientes módulos:

1. Autenticación.
2. Dashboard.
3. Empresas.
4. Usuarios.
5. Roles y permisos.
6. Tributario.
7. Laboral por empleado.
8. Laboral general.
9. Obligaciones documentales.
10. Documentos.
11. Revisiones y observaciones.
12. Alertas y vencimientos.
13. Reportes.
14. Buscador.
15. Auditoría.
16. Configuración.

---

# 9. Módulo de autenticación

Permitirá controlar el acceso a la plataforma.

## Funcionalidades

- Inicio de sesión.
- Cierre de sesión.
- Recuperación de contraseña.
- Cambio de contraseña.
- Control de sesión.
- Bloqueo de usuarios.
- Activación/desactivación de usuarios.

El correo electrónico podrá utilizarse como identificador principal del usuario.

---

# 10. Dashboard

Será la pantalla principal del sistema.

Su objetivo será proporcionar una visión inmediata del estado documental.

## Indicadores generales

Podrá mostrar:

- Empresas activas.
- Usuarios registrados.
- Documentos pendientes.
- Documentos por revisar.
- Documentos aprobados.
- Documentos observados.
- Documentos vencidos.
- Próximos vencimientos.
- Cumplimiento promedio.

## 10.1 Dashboard del contador

Ejemplo:

**Empresas administradas:** 28

**Documentos del periodo actual:**

- Aprobados: 385.
- Pendientes: 37.
- Por revisar: 42.
- Observados: 12.
- Vencidos: 8.

## 10.2 Resumen por empresa

| Empresa | Tributario | Laboral | Pendientes | Cumplimiento |
|---|---|---|---|---|
| Empresa ABC | 95 % | 100 % | 2 | 97 % |
| Empresa XYZ | 75 % | 85 % | 11 | 80 % |
| Empresa DEF | 100 % | 92 % | 3 | 96 % |

---

# 11. Sistema de semáforo

El sistema podrá utilizar indicadores visuales.

### Verde

Cumplimiento alto.

Ejemplo:

90 % – 100 %.

### Amarillo

Requiere atención.

Ejemplo:

70 % – 89 %.

### Rojo

Situación crítica.

Ejemplo:

Menos de 70 %.

Estos valores deberán poder configurarse posteriormente.

---

# 12. Módulo de empresas

Permitirá registrar las empresas administradas.

## Información básica

Cada empresa podrá contener:

- ID.
- RUC.
- Razón social.
- Nombre comercial.
- Dirección.
- Correo.
- Teléfono.
- Representante legal.
- Régimen tributario.
- Fecha de registro.
- Estado.
- Contador responsable.
- Supervisor.
- Observaciones.

## 12.1 Estados de empresa

Inicialmente:

- Activa.
- Inactiva.
- Suspendida.

No deberá eliminarse definitivamente una empresa que posea información histórica.

Se recomienda utilizar baja lógica.

---

# 13. Asignación de usuarios a empresas

Una empresa podrá tener múltiples usuarios.

Un usuario también podrá pertenecer a múltiples empresas.

Esto genera una relación:

**Usuarios ↔ Empresas**

Ejemplo:

Usuario:

**maria@grupoabc.com**

Empresas:

- ABC SAC.
- Transportes ABC SAC.
- Servicios ABC SAC.

El usuario podrá acceder solamente a esas empresas.

---

# 14. Roles y permisos

El sistema debe utilizar permisos configurables.

No se recomienda controlar todo únicamente mediante perfiles rígidos.

Ejemplos de permisos:

- Ver empresas.
- Crear empresas.
- Editar empresas.
- Crear usuarios.
- Asignar usuarios.
- Subir documentos.
- Descargar documentos.
- Revisar documentos.
- Aprobar documentos.
- Observar documentos.
- Configurar obligaciones.
- Ver auditoría.
- Generar reportes.

---

# 15. Módulo Tributario

Permitirá gestionar las obligaciones tributarias de cada empresa.

Los documentos considerados inicialmente son:

## 15.1 Excel de cálculo

Periodicidad:

**Quincenal.**

Ejemplo:

- Primera quincena.
- Segunda quincena.

Formato esperado:

Excel.

## 15.2 PDT

Periodicidad:

**Mensual.**

Cantidad esperada inicialmente:

**2 archivos mensuales.**

El sistema deberá permitir modificar posteriormente la cantidad requerida.

## 15.3 Registro de compras

Periodicidad:

**Mensual.**

Formato inicial:

PDF.

## 15.4 Registro de ventas

Periodicidad:

**Mensual.**

Formato inicial:

PDF.

## 15.5 Control tributario

Periodicidad:

**Semanal.**

Formato:

Excel.

## 15.6 Consulta de declaraciones PDT

Permitirá almacenar la evidencia correspondiente a las declaraciones realizadas.

Periodicidad configurable.

## 15.7 Consulta de pagos

Permitirá almacenar las constancias, consultas o evidencias de los pagos tributarios.

Periodicidad configurable.

---

# 16. Módulo Laboral por Empleado

Este módulo administrará el expediente individual de cada trabajador.

La estructura será:

**Empresa**

→ Trabajadores

→ Trabajador

→ Expediente laboral

---

# 17. Registro de trabajadores

Cada trabajador podrá contener:

- ID.
- DNI.
- Nombres.
- Apellidos.
- Cargo.
- Área.
- Fecha de ingreso.
- Fecha de cese.
- Estado laboral.
- Tipo de contrato.
- Remuneración.
- Correo.
- Teléfono.
- Observaciones.

---

# 18. Estados de trabajador

Inicialmente:

- Activo.
- Cesado.

Posteriormente podrían incluirse:

- Suspendido.
- Vacaciones.
- Licencia.

---

# 19. Documentación de ingreso del trabajador

El expediente podrá contener:

- Ficha de ingreso.
- Constancia de alta.
- Contrato.
- CV.
- Examen médico.
- Otros documentos.

---

# 20. Documentación durante la relación laboral

Podrán gestionarse:

- Memorándums.
- Boletas de pago.
- Adendas.
- Comunicaciones.
- Otros documentos.

Las boletas deberán organizarse por periodo.

Ejemplo:

**2026**

- Enero.
- Febrero.
- Marzo.
- Abril.

---

# 21. Proceso de cese

Cuando el trabajador cambie:

**Activo → Cesado**

el sistema deberá habilitar automáticamente la sección:

**Documentación de cese.**

Documentos iniciales:

- Liquidación.
- Certificado de trabajo.
- Acreditación de pago de liquidación.
- Carta de renuncia.

También deberán registrarse:

- Fecha de cese.
- Motivo de cese.
- Observaciones.

---

# 22. Motivo de cese

El motivo podrá influir sobre los documentos obligatorios.

Ejemplo:

Si:

**Motivo = Renuncia**

entonces:

**Carta de renuncia = obligatoria.**

Si el motivo fuera diferente:

**Carta de renuncia = No aplica.**

Esta lógica deberá manejarse mediante reglas configurables.

---

# 23. Módulo Laboral General

Gestionará documentación laboral perteneciente a la empresa y no a un trabajador específico.

Inicialmente:

- Control de asistencia.
- Planilla.
- Planilla AFP.
- Pago AFP.
- Reporte SIS.
- Pago SIS.
- Reporte PLAME.
- Constancia PLAME.

---

# 24. Control de asistencia

Periodicidad:

**Diaria.**

Sin embargo, deberá evaluarse durante el desarrollo si realmente conviene crear una obligación independiente por cada día.

Como alternativa podrá manejarse:

- Un archivo diario.
- Un archivo semanal.
- Un archivo mensual.

La periodicidad deberá ser configurable.

---

# 25. Planilla

Periodicidad inicial:

**Quincenal.**

Deberá generar:

- Primera quincena.
- Segunda quincena.

---

# 26. AFP

Documentos:

- Planilla AFP.
- Constancia o evidencia de pago.

Periodicidad:

**Mensual.**

---

# 27. SIS

Documentos:

- Reporte SIS.
- Constancia o evidencia de pago.

Periodicidad:

**Mensual.**

---

# 28. PLAME

Documentos:

- Reporte PLAME.
- Constancia de presentación.

Periodicidad:

**Mensual.**

---

# 29. Catálogo de documentos

Uno de los elementos centrales del sistema será el catálogo de documentos.

No se recomienda programar directamente:

> “PLAME siempre es mensual”.

La periodicidad deberá almacenarse en configuración.

Cada tipo de documento podrá definir:

- Nombre.
- Código.
- Descripción.
- Módulo.
- Categoría.
- Periodicidad.
- Formato permitido.
- Cantidad de archivos.
- Obligatorio.
- Días de anticipación.
- Fecha límite.
- Estado.
- Empresas a las que aplica.

---

# 30. Periodicidades

El sistema deberá soportar inicialmente:

- Único.
- Diario.
- Semanal.
- Quincenal.
- Mensual.
- Trimestral.
- Semestral.
- Anual.
- Eventual.
- Personalizado.

---

# 31. Generación automática de obligaciones

El sistema deberá crear automáticamente las obligaciones correspondientes.

Ejemplo:

Configuración:

**Registro de Compras**

Periodicidad:

**Mensual**

Empresa:

**ABC SAC**

Al iniciar octubre:

El sistema genera:

> Registro de Compras – Octubre 2026.

Estado:

**Pendiente.**

---

# 32. Concepto de obligación documental

Es importante diferenciar:

### Tipo de documento

Ejemplo:

**Registro de Compras.**

### Obligación documental

Ejemplo:

**Registro de Compras – Octubre 2026 – Empresa ABC SAC.**

### Archivo

Ejemplo:

**registro_compras_octubre.pdf**

Esta separación permitirá que el sistema sea escalable.

---

# 33. Estados documentales

Se proponen los siguientes estados:

### Pendiente

Todavía no se ha cargado ningún archivo.

### Cargado

El usuario cargó un archivo.

### Por revisar

El archivo está esperando revisión.

### Aprobado

El contador confirmó que es correcto.

### Observado

El contador encontró un problema.

### Corregido

El cliente cargó una nueva versión.

### No aplica

La obligación no corresponde a esa empresa o situación.

### Vencido

La fecha límite ha sido superada sin completar correctamente la obligación.

---

# 34. Flujo de documento

Flujo normal:

**Pendiente**

↓

**Cargado**

↓

**Por revisar**

↓

**Aprobado**

Flujo con observación:

**Pendiente**

↓

**Cargado**

↓

**Por revisar**

↓

**Observado**

↓

**Corregido**

↓

**Por revisar**

↓

**Aprobado**

---

# 35. Observaciones

Cuando un documento sea observado, el contador deberá poder indicar:

- Motivo.
- Comentario.
- Fecha.
- Usuario que realizó la observación.

Ejemplo:

> El documento corresponde a septiembre. Subir el Registro de Compras correspondiente a octubre de 2026.

El cliente deberá visualizar claramente la observación.

---

# 36. Control de versiones

Cada nueva carga asociada a una obligación deberá generar una versión.

Ejemplo:

### Registro de Compras – Octubre

**Versión 1**

Archivo:

registro_compras_v1.pdf

Estado:

Observado.

**Versión 2**

Archivo:

registro_compras_v2.pdf

Estado:

Aprobado.

La versión anterior deberá conservarse.

---

# 37. Información de cada versión

Cada versión deberá registrar:

- Número de versión.
- Archivo.
- Nombre original.
- Usuario.
- Fecha.
- Hora.
- Tamaño.
- Tipo de archivo.
- Comentario.
- Estado.

---

# 38. Eliminación de archivos

Se recomienda no permitir la eliminación definitiva de archivos a usuarios normales.

Si fuera necesario retirar un archivo:

Debe utilizarse:

**Archivo anulado**

o:

**Versión reemplazada.**

Esto permite mantener trazabilidad.

---

# 39. Alertas

El sistema deberá generar alertas según fechas de vencimiento.

Ejemplo:

**Faltan 5 días.**

**Faltan 3 días.**

**Vence mañana.**

**Vence hoy.**

**Documento vencido.**

---

# 40. Canales de notificación

Primera versión:

- Notificaciones internas.

Posteriormente:

- Correo electrónico.
- WhatsApp.
- SMS.
- Notificaciones push.

---

# 41. Centro de notificaciones

Los usuarios podrán consultar:

- Documentos próximos a vencer.
- Documentos vencidos.
- Nuevas observaciones.
- Documentos aprobados.
- Nuevos archivos recibidos.

---

# 42. Sistema de cumplimiento

Se deberá calcular el porcentaje de cumplimiento documental.

Ejemplo:

Una empresa tiene:

20 obligaciones.

18 aprobadas.

Porcentaje:

**90 %.**

---

# 43. Cálculo de cumplimiento

Una fórmula inicial podría ser:

**Cumplimiento = Documentos aprobados / Documentos exigibles × 100**

Los documentos marcados como:

**No aplica**

no deberán afectar negativamente el porcentaje.

---

# 44. Cumplimiento por módulo

El sistema podrá calcular:

- Cumplimiento tributario.
- Cumplimiento laboral individual.
- Cumplimiento laboral general.
- Cumplimiento global.

---

# 45. Buscador

Se deberá implementar búsqueda global.

La búsqueda podrá realizarse por:

- Razón social.
- RUC.
- Trabajador.
- DNI.
- Tipo de documento.
- Periodo.
- Archivo.
- Estado.

---

# 46. Filtros

Los módulos deberán permitir filtros.

Ejemplo:

**Empresa:** ABC SAC

**Módulo:** Tributario

**Periodo:** Octubre 2026

**Estado:** Pendiente

Resultado:

Todos los documentos tributarios pendientes de octubre.

---

# 47. Reportes

El sistema deberá permitir generar reportes.

Inicialmente:

### Reporte de cumplimiento por empresa

### Reporte de documentos pendientes

### Reporte de documentos vencidos

### Reporte de documentos observados

### Reporte por periodo

### Reporte tributario

### Reporte laboral

### Reporte de trabajadores

### Reporte de actividad de usuarios

---

# 48. Exportación

Los reportes podrán exportarse inicialmente a:

- Excel.
- PDF.

---

# 49. Auditoría

Todas las operaciones importantes deberán registrarse.

Ejemplos:

- Inicio de sesión.
- Creación de empresa.
- Modificación de empresa.
- Creación de usuario.
- Asignación de usuario.
- Carga de archivo.
- Descarga.
- Aprobación.
- Observación.
- Cambio de estado.
- Cambio de permisos.

---

# 50. Datos de auditoría

Cada evento deberá registrar:

- Usuario.
- Acción.
- Fecha.
- Hora.
- Empresa.
- Módulo.
- Documento.
- Información adicional.

Opcionalmente:

- Dirección IP.
- Navegador.
- Dispositivo.

---

# 51. Seguridad

Debido a la naturaleza de los documentos almacenados, la seguridad será un componente importante.

Se deberá contemplar:

- Contraseñas cifradas.
- HTTPS.
- Control de sesiones.
- Autorización por roles.
- Separación lógica entre empresas.
- Validación de archivos.
- Restricción de extensiones.
- Límite de tamaño.
- Registro de actividad.
- Copias de seguridad.

---

# 52. Separación de información entre empresas

Un usuario de:

**Empresa A**

nunca deberá poder visualizar documentos de:

**Empresa B**

aunque conozca una URL interna.

Esta validación deberá realizarse en el servidor y no solamente en la interfaz.

---

# 53. Archivos permitidos

Inicialmente podrían permitirse:

- PDF.
- XLS.
- XLSX.
- DOC.
- DOCX.
- JPG.
- PNG.

Los formatos deberán ser configurables.

---

# 54. Tamaño de archivos

El administrador podrá definir un tamaño máximo.

Ejemplo:

**20 MB por archivo.**

La cifra final se definirá de acuerdo con el almacenamiento disponible.

---

# 55. Diseño de navegación

Menú principal sugerido:

**Dashboard**

**Empresas**

**Documentos**

**Trabajadores**

**Pendientes**

**Vencimientos**

**Reportes**

**Usuarios**

**Auditoría**

**Configuración**

---

# 56. Vista de empresa

Al ingresar a una empresa:

### Información general

### Tributario

### Laboral

### Trabajadores

### Pendientes

### Documentos observados

### Próximos vencimientos

### Historial

---

# 57. Vista del módulo Tributario

Ejemplo:

**Empresa ABC SAC**

**Tributario**

Periodo:

**Octubre 2026**

| Obligación | Periodo | Vencimiento | Estado |
|---|---|---|---|
| Cálculo tributario | 1ra quincena | 16/10 | Aprobado |
| Cálculo tributario | 2da quincena | 01/11 | Pendiente |
| Registro compras | Octubre | 05/11 | Por revisar |
| Registro ventas | Octubre | 05/11 | Aprobado |
| PDT | Octubre | 10/11 | Pendiente |

---

# 58. Vista de trabajador

Ejemplo:

## Juan Pérez Gómez

DNI:

12345678

Cargo:

Asistente administrativo

Estado:

Activo

Fecha de ingreso:

01/02/2025

### Documentación

**Ingreso**

- Ficha de ingreso.
- Constancia de alta.
- Contrato.
- CV.
- Examen médico.

**Durante relación laboral**

- Boletas.
- Memorándums.
- Otros.

**Cese**

No habilitado mientras permanezca activo.

---

# 59. Panel de pendientes

Permitirá consultar todos los documentos pendientes sin ingresar empresa por empresa.

Filtros:

- Empresa.
- Módulo.
- Fecha.
- Tipo.
- Responsable.
- Estado.

---

# 60. Panel de documentos observados

Permitirá visualizar:

- Empresa.
- Documento.
- Periodo.
- Observación.
- Responsable.
- Días desde la observación.

Esto facilitará hacer seguimiento a correcciones.

---

# 61. Requisitos funcionales

## RF-01

El sistema deberá permitir registrar empresas.

## RF-02

El sistema deberá permitir editar empresas.

## RF-03

El sistema deberá permitir desactivar empresas.

## RF-04

El sistema deberá permitir registrar usuarios.

## RF-05

El sistema deberá permitir asignar usuarios a empresas.

## RF-06

El sistema deberá permitir crear roles.

## RF-07

El sistema deberá permitir asignar permisos.

## RF-08

El sistema deberá permitir registrar trabajadores.

## RF-09

El sistema deberá permitir modificar trabajadores.

## RF-10

El sistema deberá permitir cambiar trabajadores a estado cesado.

## RF-11

El sistema deberá habilitar documentación de cese.

## RF-12

El sistema deberá permitir configurar tipos de documento.

## RF-13

El sistema deberá permitir configurar periodicidades.

## RF-14

El sistema deberá generar obligaciones automáticamente.

## RF-15

El sistema deberá permitir cargar archivos.

## RF-16

El sistema deberá validar formatos.

## RF-17

El sistema deberá permitir revisar documentos.

## RF-18

El sistema deberá permitir aprobar documentos.

## RF-19

El sistema deberá permitir observar documentos.

## RF-20

El sistema deberá permitir cargar correcciones.

## RF-21

El sistema deberá conservar versiones.

## RF-22

El sistema deberá calcular cumplimiento.

## RF-23

El sistema deberá mostrar vencimientos.

## RF-24

El sistema deberá generar alertas.

## RF-25

El sistema deberá permitir buscar documentos.

## RF-26

El sistema deberá permitir descargar documentos.

## RF-27

El sistema deberá mantener auditoría.

## RF-28

El sistema deberá permitir generar reportes.

## RF-29

El sistema deberá permitir exportar reportes.

## RF-30

El sistema deberá mostrar un dashboard.

---

# 62. Requisitos no funcionales

## RNF-01 Seguridad

Las contraseñas deberán almacenarse utilizando algoritmos seguros de hashing.

## RNF-02 Disponibilidad

La plataforma deberá estar disponible mediante Internet.

## RNF-03 Responsive

La interfaz deberá adaptarse a diferentes tamaños de pantalla.

## RNF-04 Rendimiento

Las operaciones habituales deberán responder rápidamente bajo condiciones normales.

## RNF-05 Escalabilidad

El sistema deberá permitir incorporar más empresas sin modificar su arquitectura principal.

## RNF-06 Trazabilidad

Todas las operaciones críticas deberán poder ser auditadas.

## RNF-07 Integridad

Los archivos históricos no deberán desaparecer cuando se cargue una nueva versión.

## RNF-08 Seguridad multiempresa

Los datos de una empresa deberán mantenerse aislados de otras empresas.

## RNF-09 Copias de seguridad

Se deberán implementar mecanismos periódicos de respaldo.

## RNF-10 Usabilidad

La interfaz deberá ser comprensible para usuarios sin conocimientos técnicos avanzados.

---

# 63. Entidades principales de información

A nivel conceptual, la base de datos podría contener las siguientes entidades:

### Usuario

### Rol

### Permiso

### Empresa

### UsuarioEmpresa

### Trabajador

### TipoDocumento

### CategoríaDocumento

### ObligaciónDocumental

### Documento

### VersionDocumento

### Observación

### Periodo

### Notificación

### Auditoría

### Configuración

---

# 64. Relaciones principales

### Empresa

Tiene muchos:

- Usuarios.
- Trabajadores.
- Obligaciones.
- Documentos.

### Usuario

Puede pertenecer a muchas empresas.

### Trabajador

Pertenece a una empresa.

### TipoDocumento

Define cómo funciona una obligación.

### ObligaciónDocumental

Pertenece a:

- Empresa.
- Tipo de documento.
- Periodo.

### Obligación

Puede tener múltiples versiones de documento.

---

# 65. Modelo conceptual simplificado

**EMPRESA**

1

↓

N

**TRABAJADOR**

---

**EMPRESA**

N

↔

N

**USUARIO**

---

**EMPRESA**

1

↓

N

**OBLIGACIÓN DOCUMENTAL**

---

**TIPO DOCUMENTO**

1

↓

N

**OBLIGACIÓN DOCUMENTAL**

---

**OBLIGACIÓN**

1

↓

N

**VERSIONES**

---

**VERSIÓN**

1

↓

N

**OBSERVACIONES**

---

# 66. Reglas de negocio principales

## RN-01

Un usuario únicamente podrá acceder a las empresas que tenga asignadas.

## RN-02

Cada obligación deberá pertenecer a una empresa.

## RN-03

Cada obligación deberá corresponder a un periodo.

## RN-04

Una nueva carga no deberá eliminar la versión anterior.

## RN-05

Un documento aprobado no deberá modificarse sin generar una nueva versión.

## RN-06

Los documentos No Aplica no deberán afectar el porcentaje de cumplimiento.

## RN-07

Los documentos vencidos deberán permanecer visibles hasta su regularización.

## RN-08

Un trabajador cesado deberá mantener todo su historial.

## RN-09

Los documentos de cese aparecerán únicamente cuando corresponda.

## RN-10

Las obligaciones podrán variar según empresa.

## RN-11

No todas las empresas necesariamente tendrán los mismos documentos.

## RN-12

Una obligación podrá aceptar uno o múltiples archivos.

## RN-13

La aprobación deberá registrar al usuario responsable.

## RN-14

Las observaciones deberán conservarse históricamente.

## RN-15

Las empresas inactivas deberán mantener su historial.

---

# 67. Matriz básica de permisos

| Función | Administrador | Contador | Supervisor | Cliente |
|---|---|---|---|---|
| Crear empresa | Sí | No | No | No |
| Crear usuario | Sí | Opcional | No | No |
| Subir archivo | Sí | Sí | Opcional | Sí |
| Aprobar | Sí | Sí | Sí | No |
| Observar | Sí | Sí | Sí | No |
| Descargar | Sí | Sí | Sí | Sí |
| Ver auditoría | Sí | Opcional | Opcional | No |
| Configurar documentos | Sí | Opcional | No | No |
| Generar reportes | Sí | Sí | Sí | Limitado |

Esta matriz deberá ser configurable.

---

# 68. Historias de usuario principales

## HU-01

Como administrador quiero registrar una empresa para comenzar a gestionar su documentación.

## HU-02

Como administrador quiero asignar usuarios a una empresa para controlar quién puede acceder a ella.

## HU-03

Como cliente quiero ver los documentos que debo entregar para saber qué obligaciones están pendientes.

## HU-04

Como cliente quiero cargar un archivo para cumplir con una obligación documental.

## HU-05

Como contador quiero revisar documentos para verificar si fueron correctamente elaborados.

## HU-06

Como contador quiero observar documentos incorrectos para solicitar su corrección.

## HU-07

Como cliente quiero conocer la razón por la cual mi documento fue observado.

## HU-08

Como contador quiero visualizar documentos vencidos para priorizar su seguimiento.

## HU-09

Como contador quiero ver el porcentaje de cumplimiento de cada empresa.

## HU-10

Como responsable laboral quiero consultar el expediente completo de un trabajador.

## HU-11

Como contador quiero conservar versiones anteriores para saber qué documentos fueron reemplazados.

## HU-12

Como administrador quiero conocer quién realizó cada acción importante.

---

# 69. Criterios básicos de aceptación

Ejemplo:

### Carga de documento

Dado que el usuario tiene acceso a una empresa,

cuando seleccione una obligación pendiente,

y cargue un archivo válido,

entonces el sistema deberá:

- guardar el archivo,
- registrar el usuario,
- registrar fecha y hora,
- crear una versión,
- actualizar el estado,
- registrar la operación en auditoría.

---

# 70. Criterio de observación

Cuando un contador observe un documento:

El sistema deberá:

- solicitar un comentario.
- cambiar el estado a Observado.
- registrar al contador.
- registrar fecha.
- notificar al usuario responsable.
- conservar el documento observado.

---

# 71. Criterio de corrección

Cuando el cliente cargue una corrección:

El sistema deberá:

- conservar la versión anterior.
- crear una nueva versión.
- cambiar el estado a Corregido o Por revisar.
- registrar la carga.
- notificar al contador.

---

# 72. Criterio de cese

Cuando un trabajador pase de Activo a Cesado:

El sistema deberá:

- solicitar fecha de cese.
- solicitar motivo.
- habilitar documentación de cese.
- conservar el expediente previo.
- registrar el cambio en auditoría.

---

# 73. Alcance del MVP

La primera versión funcional debería concentrarse en las características esenciales.

## MVP

### Empresas

- Registro.
- Edición.
- Estado.

### Usuarios

- Registro.
- Roles.
- Asignación a empresas.

### Tributario

- Tipos de documentos.
- Carga.
- Revisión.
- Observaciones.
- Aprobación.

### Laboral

- Registro de trabajadores.
- Expedientes.
- Documentación laboral general.

### Obligaciones

- Mensuales.
- Quincenales.
- Semanales.

### Dashboard

- Pendientes.
- Aprobados.
- Observados.
- Vencidos.

### Documentos

- Versiones.
- Descarga.

### Seguridad

- Autenticación.
- Autorización.

### Auditoría básica

- Cargas.
- Revisiones.
- Cambios de estado.

---

# 74. Funcionalidades para una segunda etapa

Después del MVP podrían incorporarse:

- Alertas por correo.
- Integración con WhatsApp.
- Firma digital.
- Recordatorios automáticos.
- Calendario tributario.
- Gestión de tareas.
- Asignación de responsables.
- Comentarios internos.
- Reportes avanzados.
- Dashboard gerencial.
- Aplicación móvil.
- Integración con Google Drive.
- Integración con OneDrive.
- Integración con SUNAT.
- Extracción automática de datos.
- OCR.
- Inteligencia artificial.

---

# 75. Posibles funcionalidades con inteligencia artificial

En una etapa futura podrían incorporarse:

### Clasificación automática

El usuario carga un documento y el sistema intenta determinar si corresponde a:

- PDT.
- Registro de compras.
- Planilla.
- AFP.
- PLAME.

### Lectura documental

Extraer información como:

- RUC.
- Periodo.
- Empresa.
- Fecha.
- Importe.

### Validación

Detectar:

> El archivo parece corresponder a septiembre, pero fue cargado en octubre.

### Resúmenes

Generar un resumen de pendientes por empresa.

---

# 76. Riesgos del proyecto

## Riesgo 1: exceso de complejidad inicial

Intentar implementar demasiadas funciones puede retrasar el lanzamiento.

Mitigación:

Construir primero un MVP.

## Riesgo 2: configuración rígida

Programar los documentos directamente dificultaría futuras modificaciones.

Mitigación:

Utilizar catálogos y configuraciones.

## Riesgo 3: permisos incorrectos

Un error podría mostrar documentos de otra empresa.

Mitigación:

Validar permisos en backend.

## Riesgo 4: almacenamiento creciente

La conservación de versiones aumentará el uso de almacenamiento.

Mitigación:

Utilizar almacenamiento de objetos escalable y políticas de conservación.

## Riesgo 5: resistencia de usuarios

Algunas empresas podrían seguir enviando archivos por WhatsApp.

Mitigación:

Crear una experiencia de carga muy sencilla.

---

# 77. Decisiones de diseño recomendadas

## 77.1 No tratar el sistema como carpetas

El concepto principal debe ser:

**Obligación documental**

y no simplemente:

**Carpeta.**

## 77.2 Separar definición y ejecución

Ejemplo:

**Tipo de documento:**

Registro de compras.

**Obligación:**

Registro de compras – octubre 2026.

**Archivo:**

registro_octubre.pdf.

## 77.3 Configuración por empresa

No asumir que todas las empresas funcionan igual.

## 77.4 Mantener historial

No eliminar versiones anteriores.

## 77.5 Priorizar dashboard

El valor principal para el contador estará en poder detectar rápidamente problemas.

---

# 78. Flujo principal completo

## Paso 1

Administrador registra empresa.

↓

## Paso 2

Administrador crea usuarios.

↓

## Paso 3

Asigna usuarios a empresa.

↓

## Paso 4

Configura obligaciones documentales.

↓

## Paso 5

El sistema genera obligaciones.

↓

## Paso 6

Cliente visualiza pendientes.

↓

## Paso 7

Cliente carga archivos.

↓

## Paso 8

Contador recibe documentos.

↓

## Paso 9

Contador revisa.

↓

### Si está correcto:

Aprobado.

### Si está incorrecto:

Observado.

↓

## Paso 10

Cliente corrige.

↓

## Paso 11

Contador vuelve a revisar.

↓

## Paso 12

Documento aprobado.

↓

## Paso 13

Sistema actualiza cumplimiento.

↓

## Paso 14

Dashboard refleja la situación actual.

---

# 79. Ejemplo práctico completo

Empresa:

**COMERCIAL ABC S.A.C.**

Periodo:

**Octubre 2026**

El sistema genera:

### Tributario

- Cálculo tributario – Primera quincena.
- Cálculo tributario – Segunda quincena.
- PDT 1.
- PDT 2.
- Registro de compras.
- Registro de ventas.
- Control tributario semana 1.
- Control tributario semana 2.
- Control tributario semana 3.
- Control tributario semana 4.
- Consulta de declaración.
- Consulta de pago.

### Laboral general

- Planilla primera quincena.
- Planilla segunda quincena.
- Planilla AFP.
- Pago AFP.
- Reporte SIS.
- Pago SIS.
- Reporte PLAME.
- Constancia PLAME.

El usuario de la empresa visualiza:

**20 obligaciones.**

Estado:

- 12 aprobadas.
- 4 pendientes.
- 2 observadas.
- 2 por revisar.

Cumplimiento:

**60 %.**

El contador puede identificar inmediatamente que la empresa necesita atención.

---

# 80. Indicadores futuros

El sistema podrá calcular:

### Tiempo promedio de entrega.

### Tiempo promedio de revisión.

### Número de observaciones por empresa.

### Empresas con mayor cantidad de retrasos.

### Usuarios que cargan documentos fuera de plazo.

### Obligaciones que generan más observaciones.

### Cumplimiento histórico.

---

# 81. Reporte mensual de empresa

Podría generarse automáticamente:

## COMERCIAL ABC SAC

Periodo:

Octubre 2026.

### Cumplimiento tributario

95 %.

### Cumplimiento laboral

90 %.

### Cumplimiento total

92.5 %.

### Pendientes

3.

### Observados

2.

### Vencidos

1.

Este reporte podría exportarse a PDF.

---

# 82. Escalabilidad comercial

El sistema podrá evolucionar posteriormente a un modelo SaaS.

Un estudio contable podría contratar un plan según:

- Número de empresas.
- Número de usuarios.
- Espacio utilizado.
- Funcionalidades habilitadas.

Ejemplo futuro:

### Básico

Hasta 10 empresas.

### Profesional

Hasta 50 empresas.

### Corporativo

Empresas ilimitadas.

Esto no forma parte obligatoria del MVP, pero debe considerarse al diseñar la arquitectura.

---

# 83. Propuesta de estructura de desarrollo

Se recomienda dividir el proyecto en fases.

## Fase 1 – Base del sistema

- Login.
- Usuarios.
- Roles.
- Empresas.
- Permisos.

## Fase 2 – Motor documental

- Tipos de documento.
- Obligaciones.
- Periodos.
- Cargas.
- Versiones.

## Fase 3 – Tributario

- Documentación tributaria.
- Periodicidad.
- Estados.

## Fase 4 – Laboral

- Trabajadores.
- Expedientes.
- Cese.
- Laboral general.

## Fase 5 – Supervisión

- Dashboard.
- Pendientes.
- Observaciones.
- Vencimientos.

## Fase 6 – Reportes y auditoría

- Reportes.
- Exportaciones.
- Historial.

## Fase 7 – Automatizaciones

- Correos.
- WhatsApp.
- Integraciones.

---

# 84. Principios del sistema

El desarrollo deberá mantenerse alineado a los siguientes principios:

### Centralización

Toda la documentación debe estar disponible desde una misma plataforma.

### Trazabilidad

Toda acción relevante debe poder identificarse.

### Seguridad

Cada usuario accederá solamente a información autorizada.

### Flexibilidad

Las obligaciones deben poder configurarse.

### Automatización

El sistema deberá reducir tareas repetitivas.

### Simplicidad

La carga de documentos debe ser fácil.

### Supervisión

El contador debe detectar rápidamente problemas.

### Historial

La información anterior debe conservarse.

---

# 85. Resultado esperado

Una vez implementado, el sistema deberá permitir que un contador ingrese a la plataforma y pueda responder inmediatamente preguntas como:

> ¿Qué empresas todavía no entregaron su documentación?

> ¿Qué documentos vencen esta semana?

> ¿Qué empresa tiene más documentos pendientes?

> ¿Qué archivos están esperando revisión?

> ¿Cuáles fueron observados?

> ¿Quién cargó este documento?

> ¿Cuándo se corrigió?

> ¿Quién lo aprobó?

> ¿Cuál es el cumplimiento documental de esta empresa?

> ¿Qué documentación tiene determinado trabajador?

> ¿Qué documentos faltan de un trabajador cesado?

Actualmente estas respuestas podrían requerir buscar en carpetas, mensajes o archivos Excel.

El objetivo del sistema será responderlas en segundos.

---

# 86. Visión final del producto

El proyecto deberá evolucionar hacia una plataforma integral para la gestión documental de estudios contables.

La plataforma no solamente deberá almacenar información.

Deberá controlar:

- qué documento se requiere,
- quién debe entregarlo,
- a qué empresa pertenece,
- a qué periodo corresponde,
- cuándo debe entregarse,
- quién lo cargó,
- quién lo revisó,
- si fue observado,
- qué versión fue aprobada,
- qué documentos siguen pendientes,
- y cuál es el nivel de cumplimiento de cada empresa.

La visión final es convertir un proceso actualmente disperso y manual en un proceso:

**centralizado, medible, trazable, automatizado y supervisable.**

---

# 87. Conclusión

El Sistema de Gestión y Control Documental Contable y Laboral Multiempresa permitirá solucionar uno de los principales problemas operativos de los estudios contables: el seguimiento constante de documentación proveniente de múltiples clientes.

La propuesta combina almacenamiento documental, control de obligaciones, gestión laboral, revisión, auditoría, permisos, alertas y reportes dentro de una sola plataforma.

La arquitectura deberá desarrollarse con flexibilidad suficiente para permitir que posteriormente se incorporen nuevos módulos, documentos, periodicidades, integraciones y automatizaciones sin reconstruir el sistema.

El elemento diferenciador del proyecto será que la plataforma no estará enfocada simplemente en almacenar archivos, sino en administrar el **ciclo completo de cumplimiento documental** desde la generación de la obligación hasta su aprobación final.
