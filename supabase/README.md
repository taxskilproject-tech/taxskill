# Migraciones de Supabase

H01–H07 incorporan 56 migraciones y 29 tablas públicas. Local tiene 56; Cloud conserva 55 hasta `20261017002700`, pendiente de autorización específica para publicar `20261017164155_h07_audit_resource_scope.sql`. Las tres observaciones funcionales están [corregidas y validadas localmente](../docs/hitos/evidencias/h07-correcciones.md). RLS permanece pendiente de H08/T01.

Crea cada cambio con `yarn db:new nombre_del_cambio`. Los archivos SQL se guardan en `supabase/migrations/` y se versionan. Una migración puede agrupar tablas, restricciones y funciones de una misma capacidad; respeta las dependencias.

Consulta [el flujo de desarrollo](../docs/desarrollo.md) antes de cambiar conexiones o aplicar cambios remotos. El proyecto Cloud `gzwrqvqofcrdjvzoblaz` es el destino de la aplicación real. Todos los fixtures y pruebas de integración/SQL se ejecutan exclusivamente en Supabase local sobre Docker. Cloud no sustituye un Docker no disponible. `supabase test db --local` ejecuta las seis suites SQL; `yarn db:lint` comprueba las funciones de public/private.

`yarn seed:demo` crea la primera identidad ficticia local mediante Auth Admin y ejecuta el bootstrap de una sola organización. `yarn test:h02:live` completa usuarios/empresas de demostración locales y comprueba los endpoints. Los scripts de prueba rechazan destinos remotos. Los archivos con contraseñas son locales y están ignorados por Git. `seed.sql` no escribe identidades internas de Auth. No ejecutar fixtures contra Cloud.
