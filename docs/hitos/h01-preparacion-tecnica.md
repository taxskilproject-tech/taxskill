# H01 — Preparación técnica

**Estado:** implementado y verificado técnicamente el 14 de octubre de 2026. **Dependencia:** documentación vigente. **Habilita:** [H02 — Acceso y empresas](h02-acceso-empresas.md). Aplican las [reglas comunes](README.md#3-reglas-transversales-obligatorias) y la [Definition of Done común](README.md#4-definition-of-done-comun).

Ver [evidencias, resultados y límites de la verificación](evidencias/h01.md) y [guía de desarrollo](../desarrollo.md). Docker local no se inició porque su motor no estaba activo; no hay migraciones de negocio en H01. La recepción del equipo/producto queda para su revisión.

<a id="objetivo"></a>
## 1. Objetivo

Dejar una base de desarrollo reproducible para construir recorridos completos con Next.js y Supabase, manteniendo consultas directas desde el navegador y Atomic Design desde la primera interfaz.

El resultado es un proyecto preparado para trabajar con contratos, migraciones y componentes de dominio. Este hito no entrega todavía administración de empresas, usuarios ni documentos.

## 2. Alcance y condiciones de entrada

**Entrada:** ocho documentos fuente disponibles, decisiones D01–D35 vigentes y repositorio actual revisado.

**Incluye:** revisión del scaffold, configuración de desarrollo, organización de responsabilidades, adaptadores Supabase, contratos comunes, estrategia de migraciones y pruebas, convenciones de fechas y estados de interfaz.

**Salida:** el equipo puede iniciar H02 sin decidir de nuevo la arquitectura ni mezclar acceso a datos con componentes básicos.

Se conserva la versión instalada de Next.js salvo un cambio justificado y documentado. Antes de modificar código, leer las guías pertinentes de `node_modules/next/dist/docs/` y las instrucciones `AGENTS.md`. No asumir que ejemplos de otras versiones son compatibles.

<a id="requerimientos-funcionales"></a>
## 3. Requerimientos funcionales de habilitación

Este es un hito de infraestructura: sus requisitos preparan la experiencia futura y no sustituyen los RF de negocio.

- **H01-RF01 — Inicio reproducible.** Un desarrollador puede instalar, iniciar y construir el proyecto siguiendo instrucciones versionadas y sin conocer secretos de otro integrante. Un problema de configuración produce un mensaje entendible, sin revelar valores secretos.
- **H01-RF02 — Convenciones de interacción.** Definir estados comunes de carga, vacío, error, validación, conflicto y acceso denegado, con textos en español. Deben distinguirse fallos recuperables de una acción inválida; no resolver errores mostrando una lista vacía.
- **H01-RF03 — Base accesible y adaptable.** Controles comunes admiten teclado, foco visible, etiquetas y mensajes de error asociados. Las composiciones futuras podrán funcionar en móvil y escritorio sin perder acciones esenciales.
- **H01-RF04 — Contexto de operación.** Fechas civiles y horas se presentan de forma coherente con Perú y `America/Lima`. El contrato diferencia fecha de vencimiento y momento exacto de una acción.
- **H01-RF05 — Alcance reconocible.** Dejar identificadas las tres áreas documentales y Actividades en la organización de dominios, sin habilitar aún funcionalidades inexistentes ni anunciar controles RLS como implementados.

**Trazabilidad:** D01–D03, D31, D33–D35; RNF-02, RNF-03, RNF-04 y RNF-10. El alta y la navegación autenticada se implementan en H02.

<a id="requerimientos-tecnicos"></a>
## 4. Requerimientos técnicos

- **H01-RT01 — Compatibilidad real.** Revisar versión instalada, lockfile, scripts y opciones existentes. Usar App Router con grupos públicos/autenticados conforme a las guías locales, sin aplicar convenciones obsoletas ni introducir otra infraestructura de despliegue.
- **H01-RT02 — Atomic Design obligatorio.** Preparar átomos, moléculas, organismos y templates compartidos; páginas y composiciones de negocio pertenecen a `features`. Un template de Atomic Design no es el archivo especial `template.tsx` de Next.js.
- **H01-RT03 — Dependencias dirigidas.** Presentación consume hooks/contratos; hooks coordinan repositorios; repositorios usan adaptadores; mappers convierten registros a modelos de interfaz; reglas puras no dependen del SDK ni de React. Los componentes compartidos no importan una funcionalidad concreta.
- **H01-RT04 — Adaptadores separados.** Cliente Supabase de navegador para operaciones habituales y adaptador administrativo exclusivamente de servidor. Validar configuraciones en su frontera. No precargar datos privados habitualmente desde Server Components ni crear una API intermediaria para CRUD.
- **H01-RT05 — Secretos y entornos.** Versionar únicamente nombres y ejemplos vacíos de variables. El navegador puede conocer `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; las claves administrativas, HMAC y n8n permanecen en sus ejecutores de servidor/Edge. Separar desarrollo, preview y producción.
- **H01-RT06 — Contrato de operaciones.** Adoptar `request_id` UUID, `expected_revision` entero cuando aplique, códigos de error acordados y respuestas tipadas. El repositorio traduce errores del SDK; la equivalencia HTTP se limita a Route Handlers.
- **H01-RT07 — Migraciones y datos ficticios.** Preparar estructura Supabase, forma de aplicar migraciones y generar tipos. Las migraciones se agrupan por capacidad/dependencia, no obligatoriamente por tabla. Los seeds de desarrollo no se ejecutan sin control en producción.
- **H01-RT08 — Fechas y tipos.** Diferenciar `date` y `timestamptz`; centralizar conversión a Lima y formato de interfaz. No convertir fechas civiles a medianoche UTC para calcular el periodo.
- **H01-RT09 — Estado y caché.** Definir claves de caché con usuario, estudio, empresa y filtros pertinentes; estrategia de limpieza al cerrar sesión/cambiar contexto y cancelación de respuestas anteriores. No compartir datos autenticados mediante caché pública.
- **H01-RT10 — Calidad proporcional.** Definir verificaciones de tipos, lint/build y pruebas significativas de reglas/contratos. Preparar datos sintéticos y evidencia reproducible; no añadir pruebas que solo reflejen componentes triviales.
- **H01-RT11 — RLS pendiente identificable.** Registrar T01 como obligación de H08. Las credenciales administrativas no se usan en el navegador como sustituto; en esta fase se trabaja con datos sintéticos aislados.

## 5. Organización que debe quedar preparada

| Ubicación del diseño | Responsabilidad |
|---|---|
| `src/app` | Rutas, layouts y ensamblaje delgado; no repositorios ni cálculos documentales. |
| `src/components` | Atomic Design compartido y sin acoplamiento a un módulo concreto. |
| `src/features` | Composiciones, hooks, contratos, repositorios y mappers de cada dominio. |
| `src/domain` | Calendario, estados, cumplimiento y validaciones puras reutilizables. |
| `src/lib/supabase` | Adaptadores de navegador y administración separados. |
| `src/styles` y configuración compartida | Tokens, estilos y convenciones de UI acordadas. |
| `supabase` | Migraciones, seeds de prueba y funciones futuras conforme al árbol documentado. |

La ubicación exacta y sus subcarpetas siguen [Estructura de carpetas](../estructura-carpetas.md). Crear solamente lo necesario para esta entrega; el árbol no obliga a llenar carpetas con implementaciones ficticias.

Los primeros controles compartidos pueden incluir botón, input, etiqueta, mensaje, indicador de estado y un template de aplicación. Promover un componente de dominio a compartido cuando su API sea general y su reutilización esté demostrada; no crear una abstracción universal antes de sus casos de uso.

<a id="tareas"></a>
## 6. Tareas del hito

| Tarea | Trabajo concreto y entregable | Requisitos |
|---|---|---|
| H01-T01 | Inventariar scaffold, scripts, versiones y guías locales aplicables. Registrar decisiones de compatibilidad sin cambiar dependencias por costumbre. | RF01; RT01. |
| H01-T02 | Preparar configuración de desarrollo, ejemplo de variables e instrucciones de instalación/arranque/build. Identificar quién ejecuta cada secreto sin guardar su valor. | RF01; RT05, RT11. |
| H01-T03 | Aplicar la estructura mínima de responsabilidades y reglas de importación. Revisar un ejemplo de composición compartida y uno de dominio. | RF03, RF05; RT02, RT03. |
| H01-T04 | Preparar adaptadores de navegador y servidor y contratos comunes de operaciones/errores. Impedir importación del adaptador administrativo por código cliente. | RF01, RF02; RT04, RT06. |
| H01-T05 | Centralizar utilidades de fecha civil, hora Lima y formatos; definir comportamiento ante valores inválidos. | RF04; RT08. |
| H01-T06 | Definir contexto de sesión/caché y limpieza, sin asumir que los filtros de interfaz son autorización. | RF02; RT09, RT11. |
| H01-T07 | Preparar flujo de migraciones/tipos/seeds y verificación de una base limpia. No crear anticipadamente las 29 tablas. | RF01; RT07. |
| H01-T08 | Entregar controles y estados comunes mínimos con verificación de teclado/móvil; documentar cómo extenderlos. | RF02, RF03; RT02, RT03. |
| H01-T09 | Ejecutar checks pertinentes y registrar evidencia de reproducibilidad y ausencia de secretos públicos. Actualizar instrucciones del equipo. | RF01–RF05; RT01–RT11. |

`RFyy` y `RTyy` en esta tabla se refieren a los identificadores del propio hito.

## 7. Escenarios y evidencia de aceptación

| Escenario | Resultado verificable | Evidencia |
|---|---|---|
| Incorporación de un desarrollador | Instala y ejecuta con lockfile e instrucciones, usando su configuración de prueba. | Registro de comandos y variables requeridas sin valores. |
| Configuración incompleta | Error claro en la frontera correspondiente; no aparece la clave ni una traza privada en la UI. | Demostración con variable ausente. |
| Dependencias de componentes | Átomo/molécula no importa SDK ni repositorio; la ruta delega la composición. | Revisión de importaciones y composición. |
| Fecha civil en distintos navegadores | La misma fecha conserva su día; momentos se muestran en Lima. | Ejemplos reproducibles de fecha y cambio de día. |
| Bundles públicos | Ningún secreto de administración/integración queda incorporado. | Inspección del build y revisión de variables. |
| Interacción básica | Etiquetas, foco, error y acciones se usan con teclado y viewport móvil. | Checklist de interacción. |

Relaciona CA31, CA32 y CA33; establece las bases de CA27 y CA34 para sus recorridos posteriores.

<a id="definition-of-done"></a>
## 8. Definition of Done

- [x] H01-RF01–H01-RF05 y H01-RT01–H01-RT11 tienen evidencia; configuración e instrucciones permiten reproducir el entorno.
- [x] La versión de Next.js y sus guías pertinentes fueron revisadas antes del código.
- [x] La estructura y las reglas de importación respetan Atomic Design y separación de responsabilidades.
- [x] Los clientes Supabase de navegador y administración están separados y el segundo no llega al bundle público.
- [x] Los contratos comunes diferencian errores de dominio y transporte, fechas civiles y momentos.
- [x] El procedimiento de migraciones, tipos y seeds está documentado y es ejecutable; línea base remota vacía verificada. El reset local queda pendiente de activar Docker antes de H02.
- [x] Los estados y controles comunes mínimos pasan la verificación de accesibilidad pertinente.
- [x] Build, tipos, lint, arquitectura y 40 pruebas pasan; ajuste de Tailwind/PostCSS documentado.
- [x] T01 sigue señalado como pendiente de H08 y no se utiliza información real para acreditar aislamiento.
- [ ] El equipo dispone de los entregables y puede iniciar H02; aplica además la Definition of Done común.

## 9. Límites y continuidad

La administración de cuentas y empresas pertenece a H02. El motor, uploads, expedientes, avisos y reportes se entregan en sus hitos. Esta preparación no crea nuevas pantallas de negocio ni habilita proveedores productivos.

No se resuelve ahora RLS. La preparación de una variable o adaptador no acredita la configuración productiva correspondiente.

## 10. Referencias

- [Índice y reglas transversales](README.md).
- [Hito general y secuencia de trabajo](../hitos-implementacion.md).
- [Arquitectura y separación de responsabilidades](../diseno-tecnico.md#4-arquitectura-general).
- [Contratos de operaciones](../diseno-tecnico.md#12-contratos-de-operaciones).
- [Estructura de carpetas](../estructura-carpetas.md).
- [Navegación prevista](../flujo-navegacion.md).
- [Siguiente: H02](h02-acceso-empresas.md).
