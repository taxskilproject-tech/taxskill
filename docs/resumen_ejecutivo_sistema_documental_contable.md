# Descripción Global del Proyecto

## Sistema de Gestión y Control Documental Contable y Laboral Multiempresa

El proyecto consiste en el desarrollo de una plataforma web orientada a estudios contables, contadores independientes y organizaciones que administran la documentación tributaria y laboral de múltiples empresas.

El sistema tendrá como objetivo principal centralizar, organizar y supervisar la documentación que cada empresa debe presentar periódicamente, permitiendo conocer de manera rápida qué documentos han sido entregados, cuáles se encuentran pendientes, cuáles presentan observaciones y cuáles ya fueron revisados y aprobados por el responsable contable.

Actualmente, gran parte de esta información suele administrarse mediante carpetas físicas, servicios de almacenamiento en la nube, mensajes de WhatsApp, correos electrónicos y hojas de cálculo independientes. Esto dificulta el seguimiento de las obligaciones documentales, genera duplicidad de información y aumenta el riesgo de pérdida de documentos, incumplimiento de fechas o falta de trazabilidad sobre quién realizó cada acción.

La plataforma propuesta busca transformar este proceso en un sistema centralizado de gestión documental, donde cada empresa cuente con un espacio independiente y estructurado.

## Gestión multiempresa

El sistema permitirá registrar y administrar múltiples empresas desde una misma plataforma.

Cada empresa contará con su propio expediente digital y con módulos específicos para organizar su documentación.

La estructura general será:

**Estudio contable / Contador → Empresas → Usuarios → Módulos → Periodos → Documentos**

De esta manera, un contador podrá supervisar varias empresas desde un único panel, mientras que los usuarios pertenecientes a cada empresa solamente podrán acceder a la información para la cual tengan autorización.

## Gestión de usuarios y permisos

La plataforma contará con un sistema de usuarios, roles y permisos.

Los administradores podrán crear usuarios y asignarlos a una o varias empresas. Cada usuario tendrá permisos específicos según sus responsabilidades.

Entre los perfiles considerados inicialmente se encuentran:

- Administrador.
- Contador.
- Supervisor.
- Usuario de empresa o cliente.

Un usuario perteneciente a una empresa podrá subir y consultar únicamente la documentación correspondiente a las empresas que tenga asignadas.

Los contadores y supervisores podrán revisar la documentación enviada, aprobarla, observarla y realizar seguimiento de su cumplimiento.

## Módulo Tributario

El módulo tributario permitirá organizar y controlar la documentación relacionada con las obligaciones tributarias de cada empresa.

Dentro de este módulo podrán gestionarse documentos como:

- Excel de cálculos tributarios.
- PDT.
- Registro de compras.
- Registro de ventas.
- Control tributario.
- Consultas de declaraciones.
- Constancias o consultas de pagos.

Cada tipo de documento podrá tener una periodicidad determinada, como semanal, quincenal, mensual o según necesidad.

El sistema deberá generar automáticamente las obligaciones documentales correspondientes a cada periodo.

Por ejemplo, si el Registro de Compras es un documento mensual, al comenzar un nuevo mes el sistema podrá generar automáticamente la obligación correspondiente y mantenerla como pendiente hasta que el usuario cargue el archivo.

## Módulo Laboral por Empleado

Cada empresa podrá registrar a sus trabajadores y mantener un expediente laboral digital individual.

El expediente podrá contener documentos como:

- Ficha de ingreso.
- Constancia de alta.
- Contrato.
- Curriculum Vitae.
- Examen médico.
- Memorándums.
- Otros documentos laborales.
- Boletas de pago.

Asimismo, el sistema deberá diferenciar entre trabajadores activos y cesados.

Cuando un trabajador cambie de estado a cesado, se habilitará una sección específica para gestionar la documentación correspondiente al término de la relación laboral, como:

- Liquidación.
- Certificado de trabajo.
- Acreditación del pago de liquidación.
- Carta de renuncia.
- Otros documentos relacionados con el cese.

## Módulo Laboral General

Además de los expedientes individuales de los trabajadores, la plataforma contará con un módulo de documentación laboral general de cada empresa.

Entre los documentos considerados inicialmente se encuentran:

- Control de asistencia.
- Planilla.
- Planillas de AFP.
- Constancias o pagos de AFP.
- Reportes de SIS.
- Constancias o pagos de SIS.
- Reporte del PLAME.
- Constancia de presentación del PLAME.

Cada documento podrá configurarse según su periodicidad.

## Gestión de estados documentales

Cada documento contará con un estado que permita conocer su situación dentro del proceso de revisión.

Entre los estados considerados se encuentran:

- Pendiente.
- Cargado.
- Por revisar.
- Aprobado.
- Observado.
- Corregido.
- No aplica.

Este flujo permitirá que el contador no solamente confirme que un documento fue enviado, sino que pueda verificar que su contenido sea correcto.

Cuando un documento presente errores, el contador podrá registrar una observación y solicitar al usuario que cargue una nueva versión.

## Control de versiones

El sistema conservará el historial de los archivos enviados.

Cuando un documento sea corregido, la nueva versión no eliminará la anterior.

Esto permitirá mantener trazabilidad sobre:

- Versión del documento.
- Fecha de carga.
- Usuario que realizó la carga.
- Observaciones realizadas.
- Usuario que revisó el documento.
- Fecha de aprobación.

## Dashboard de supervisión

La plataforma contará con un panel principal desde el cual el contador podrá visualizar el estado general de todas las empresas bajo su administración.

El dashboard podrá mostrar indicadores como:

- Número total de empresas.
- Documentos pendientes.
- Documentos aprobados.
- Documentos observados.
- Documentos por revisar.
- Próximos vencimientos.
- Porcentaje de cumplimiento documental.

Además, se podrá visualizar el nivel de cumplimiento de cada empresa mediante indicadores o sistemas de semáforo.

Por ejemplo:

- Verde: cumplimiento alto.
- Amarillo: documentación que requiere atención.
- Rojo: nivel de cumplimiento crítico.

Esto permitirá identificar rápidamente qué empresas requieren seguimiento.

## Alertas y vencimientos

El sistema podrá gestionar fechas límite para cada obligación documental.

A partir de estas fechas podrá generar alertas cuando un documento esté próximo a vencer o cuando el plazo ya haya sido superado.

Las alertas podrán mostrarse dentro de la plataforma y, en etapas posteriores, integrarse con correo electrónico u otros canales de comunicación.

## Historial y auditoría

La plataforma deberá registrar las acciones importantes realizadas dentro del sistema.

Entre ellas:

- Creación de empresas.
- Creación de usuarios.
- Asignación de usuarios.
- Carga de documentos.
- Reemplazo de documentos.
- Revisión.
- Observaciones.
- Aprobaciones.
- Cambios de estado.
- Descargas.

Esto permitirá disponer de un historial de auditoría para conocer qué usuario realizó cada acción y en qué momento.

## Buscador documental

El sistema contará con herramientas de búsqueda y filtros para localizar documentos rápidamente.

Los usuarios podrán buscar utilizando criterios como:

- Empresa.
- Trabajador.
- Tipo de documento.
- Periodo.
- Estado.
- Año.
- Mes.

Esto facilitará la consulta de documentación histórica sin necesidad de recorrer manualmente múltiples carpetas.

## Configuración de obligaciones documentales

Una característica importante del sistema será que los documentos y sus periodicidades no deberán estar completamente programados de manera rígida.

El administrador podrá disponer de un catálogo configurable de documentos.

Cada tipo de documento podrá definir:

- Nombre.
- Módulo.
- Periodicidad.
- Formato esperado.
- Obligatoriedad.
- Fecha de vencimiento.
- Empresa a la que aplica.

Gracias a esta característica, el sistema podrá adaptarse a nuevas obligaciones documentales sin necesidad de realizar modificaciones importantes en el software.

## Flujo general de funcionamiento

El funcionamiento general de la plataforma será el siguiente:

**Registro de empresa → Creación de usuarios → Asignación de usuarios a empresas → Generación de obligaciones documentales → Carga de archivos → Revisión del contador → Aprobación u observación → Corrección → Control de cumplimiento → Generación de reportes e historial.**

## Alcance inicial

La primera versión del sistema estará enfocada principalmente en tres áreas:

1. Gestión documental tributaria.
2. Gestión laboral por trabajador.
3. Gestión laboral general de la empresa.

Sobre esta base podrán desarrollarse posteriormente nuevas funcionalidades como:

- Calendario tributario.
- Gestión de tareas.
- Recordatorios automáticos.
- Notificaciones por correo o WhatsApp.
- Reportes gerenciales.
- Facturación y control de honorarios del estudio contable.
- Firma digital.
- Integraciones con plataformas externas.
- Automatización de validaciones documentales.

## Visión del proyecto

La finalidad del proyecto es evolucionar desde un simple repositorio de archivos hacia una plataforma integral de supervisión documental.

El sistema no solamente almacenará documentos, sino que permitirá controlar responsabilidades, periodos, fechas, revisiones, observaciones, vencimientos y niveles de cumplimiento.

De esta manera, el contador podrá disponer de una visión centralizada de todas las empresas que administra, mientras que los clientes tendrán un canal organizado y seguro para presentar la documentación solicitada.

El resultado esperado es reducir el trabajo manual de seguimiento, mejorar la organización documental, disminuir el riesgo de omisiones y proporcionar mayor trazabilidad sobre los procesos tributarios y laborales administrados por el estudio contable.
