# Reglas obligatorias para agentes

Estas reglas se aplican a todo el proyecto. Deben leerse antes de crear o modificar código y junto con el `AGENTS.md` de la raíz. Las instrucciones más recientes del usuario tienen prioridad sobre decisiones anteriores de la documentación.

## 1. Arquitectura y responsabilidades

- Aplica DRY (Don't Repeat Yourself) y buenas prácticas de código en todas las implementaciones.
- Refactoriza el código duplicado en cuanto lo detectes; reutiliza componentes y funciones existentes antes de crear otros.
- Organiza el código por feature o dominio. Dentro de cada feature, separa presentación, hooks, contratos, repositorios, mappers, tipos y lógica según su responsabilidad.
- Mantén Atomic Design: átomos, moléculas, organismos y templates compartidos; las composiciones específicas pertenecen a su feature.
- Prioriza composición sobre herencia y evita dependencias circulares entre módulos.
- Cada función debe hacer una sola cosa. Prefiere funciones pequeñas y específicas antes que funciones grandes y genéricas.
- Extrae la lógica de negocio a funciones puras en archivos `utils` o `services`. Separa los efectos de red, almacenamiento y SDK en repositorios o adaptadores.
- Mantén las funciones puras siempre que sea posible y evita efectos secundarios innecesarios.
- Evita mutaciones directas; usa inmutabilidad cuando sea posible.
- No excedas dos niveles de anidación. Usa early returns y extrae funciones auxiliares para reducir complejidad ciclomática.

## 2. Componentes pequeños

- Cada componente y cada archivo que contenga componentes debe tener un máximo de **170 líneas físicas**, incluyendo imports, comentarios y líneas vacías.
- Divide componentes por responsabilidades antes de alcanzar el límite. No comprimas ni minifiques código para cumplirlo.
- Mantén la presentación separada de la lógica de negocio y de la persistencia.
- Átomos y moléculas no importan Supabase ni hooks de negocio.
- Reutiliza los componentes existentes antes de introducir variantes o abstracciones nuevas.

## 3. TypeScript y archivos de tipado

- Usa TypeScript estricto y conserva `strict: true`.
- Declara interfaces, aliases de tipo y contratos de props, entradas y resultados en **archivos separados y dedicados al tipado**.
- No declares `interface` o `type` en archivos de componentes, páginas, hooks, repositorios, utils o services. Evita contratos de objetos escritos inline cuando deban tener un tipo propio.
- Crea una carpeta `types/` dentro de cada feature o dominio para sus tipos. Los tipos privados de componentes compartidos se mantienen en el ámbito compartido correspondiente.
- No concentres todos los tipos del producto en una carpeta global; promueve únicamente los que se reutilicen entre dominios.
- Importa tipos mediante `import type` cuando corresponda.
- Evita `any` y las aserciones `as` cuando sea posible. Prefiere inferencia, `unknown`, validación y type guards; no uses aserciones para ocultar errores o saltarte la validación.
- Los tipos generados, como los de Supabase, también se mantienen en archivos de tipado separados.

Ejemplo de organización dentro de una feature:

```text
src/features/companies/
├── components/
│   └── company-form.tsx
├── hooks/
│   └── use-company-form.ts
├── types/
│   ├── company-form.types.ts
│   └── company.types.ts
├── utils/
│   └── validate-company.ts
└── repositories/
    └── company.repository.ts
```

El árbol es un ejemplo de organización, no una instrucción para crear archivos vacíos.

## 4. Nombres, constantes e imports

- Usa nombres descriptivos y semánticos para variables, funciones, componentes y archivos.
- Mantén convenciones consistentes: componentes y tipos en PascalCase; variables y funciones en camelCase; hooks con prefijo `use`; archivos y carpetas en kebab-case.
- Usa constantes con nombres claros para valores mágicos y configuración. Las constantes de dominio pertenecen a su feature o dominio.
- Agrupa imports con los externos primero y los internos después. Ordena alfabéticamente por origen dentro de cada grupo, incluidos los imports de tipo.
- Escribe código autodocumentado antes que comentarios extensos.
- Documenta únicamente las funciones complejas y decisiones que necesiten explicación, con comentarios breves y claros.

## 5. Validación y errores

- Valida los datos de entrada en funciones críticas y en las fronteras que reciben datos externos.
- Maneja errores de forma explícita. No uses `catch` vacíos ni ignores excepciones o resultados fallidos.
- Devuelve un error de dominio, propágalo o tradúcelo al contexto que pueda resolverlo; evita mensajes que expongan información sensible.
- Los errores de operaciones iniciadas por el usuario deben mostrarse explícitamente. Un log o una lista vacía no sustituyen el mensaje de fallo.
- Evita estados parciales y dobles ejecuciones en operaciones críticas; aplica los contratos transaccionales, idempotencia y concurrencia del diseño.

## 6. Estilos y apariencia

- Usa **Tailwind CSS siempre** para los estilos.
- **No escribas CSS**, archivos CSS personalizados, CSS Modules, estilos inline, bloques `<style>`, CSS-in-JS ni reglas CSS mediante `@apply`.
- No añadas reglas CSS al archivo global existente. Conserva únicamente la infraestructura ya necesaria para cargar Tailwind; no amplíes ese archivo para estilizar componentes.
- La UI debe ser minimalista, sobria y consistente. Evita agregar muchos colores o decoración innecesaria.
- Prioriza tonos neutros, espacio, jerarquía visual y usos puntuales del color para estados y foco.
- Mantén etiquetas, foco, contraste y accesibilidad sin depender solo del color.

## 7. Acciones asíncronas y feedback

- Toda acción asíncrona iniciada por un botón debe mostrar **loading visible en el mismo control**, con un texto contextual, y permanecer deshabilitada hasta finalizar.
- Usa textos como “Guardando…”, “Generando PDF…”, “Exportando…” o “Descargando…”, según la operación real.
- Conserva el estado pendiente durante todo el trabajo necesario: solicitud, generación, preparación o transferencia que el flujo controle.
- Evita dobles ejecuciones y restablece el control tanto al completar como al fallar. El error debe mostrarse explícitamente.
- Los enlaces que visualmente funcionan como botones y generan, exportan, descargan o consultan archivos deben implementarse como **acciones controladas**.
- No uses un `href` directo como sustituto de una acción que deba comunicar progreso o errores. Usa un control accesible que gestione inicio, loading, éxito y fallo.
- La implementación técnica de una descarga puede activar el archivo ya preparado, pero el control visible debe gestionar el proceso y su feedback.
- **No muestres loading en navegación normal, pestañas, filtros locales ni controles instantáneos.**
- No agregues demoras ni indicadores artificiales. El loading representa exclusivamente trabajo asíncrono real; distingue la navegación de una operación de negocio.

## 8. Supabase y migraciones

- Mantén las consultas habituales directamente a Supabase desde el frontend, según los contratos del proyecto.
- Usa API routes únicamente para excepciones estrictamente necesarias, como operaciones que requieren secretos.
- Crea las migraciones dentro de **`supabase/migrations/`**, para ejecutarlas con **Supabase CLI**.
- Versiona cambios de tablas, restricciones, índices y funciones en migraciones; respeta sus dependencias.
- No sustituyas las migraciones por cambios manuales de esquema sin registrar.
- Conserva soft delete, auditoría, snapshots y reglas históricas definidos en la documentación.
- Mantén RLS como trabajo posterior de H08/T01 según lo acordado; no lo presentes como implementado antes de verificarlo.
- Nunca expongas claves administrativas, contraseñas o secretos de integración en navegador, repositorio, logs o respuestas.

## 9. Next.js, Proxy y compilación

- Lee las guías pertinentes de la versión instalada de Next.js en `node_modules/next/dist/docs/` antes de escribir código.
- Respeta los avisos de deprecación y las instrucciones de Next.js presentes en el `AGENTS.md` raíz.
- **No uses middleware. Usa Proxy.** No crees `middleware.ts`, `middleware.js` ni un mecanismo paralelo; conserva y extiende el Proxy cuando corresponda.
- Mantén las rutas delgadas y la separación entre código de navegador y servidor.
- **Compila siempre con Yarn: `yarn build`.** No uses `npm run build`, `pnpm build` ni otro gestor para compilar.
- Para los scripts de verificación que existan, usa Yarn y ejecuta los controles pertinentes al cambio. Una revisión documental no exige compilar la aplicación.
- No atribuyas una compilación o una comprobación a una ejecución que no realizaste.

## 10. Fuentes de implementación

- Sigue el alcance y las decisiones vigentes de [docs/hitos/README.md](../docs/hitos/README.md) y los documentos referenciados allí.
- Consulta el hito correspondiente antes de implementar una funcionalidad.
- Si una propuesta anterior contradice estas reglas, aplica estas instrucciones más recientes y actualiza la documentación afectada cuando corresponda.

