# Migraciones de Supabase

H02 incorpora 13 tablas, una vista paginable y operaciones verificadas. RLS permanece pendiente de H08/T01.

Crea cada cambio con `yarn db:new nombre_del_cambio`. Los archivos SQL se guardan en `supabase/migrations/` y se versionan. Una migración puede agrupar tablas, restricciones y funciones de una misma capacidad; respeta las dependencias.

Consulta [el flujo de desarrollo](../docs/desarrollo.md) antes de aplicar cambios remotos. Las migraciones 20261014000100–20261014001000 se aplicaron incrementalmente al proyecto de desarrollo inicialmente vacío. `yarn test:h02:sql` usa fixtures transaccionales con rollback; `yarn db:lint` comprueba las funciones de public/private.

`yarn seed:demo` crea la primera identidad ficticia mediante Auth Admin y ejecuta el bootstrap de una sola organización. `yarn test:h02:live` completa usuarios/empresas de demostración y comprueba los endpoints. Los archivos con contraseñas son locales y están ignorados por Git. `seed.sql` no escribe identidades internas de Auth. No ejecutar estas fixtures contra producción.
