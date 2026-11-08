import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

import { loadH11LabEnvironment } from "../utils/h11-lab-environment";

const environment = loadH11LabEnvironment();
const api = createClient(
  environment.NEXT_PUBLIC_SUPABASE_URL,
  environment.SUPABASE_SECRET_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);
async function localUser(email: string) {
  const existing = await api.auth.admin.listUsers();
  if (existing.error) throw new Error("LOCAL_AUTH_LIST_FAILED");
  const found = existing.data.users.find((user) => user.email === email);
  if (found) return found.id;
  const created = await api.auth.admin.createUser({
    email,
    password: environment.H11_FIXTURE_PASSWORD,
    email_confirm: true,
  });
  if (created.error || !created.data.user)
    throw new Error("LOCAL_AUTH_SEED_FAILED");
  return created.data.user.id;
}
function localSql(sql: string) {
  execFileSync(
    "docker",
    [
      "exec",
      "-i",
      "supabase_db_tax-skill-h11",
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    { input: sql, stdio: ["pipe", "pipe", "pipe"], windowsHide: true },
  );
}
const companies = await api
  .from("organizations")
  .select("id")
  .eq("name", "H11 Docker");
if (companies.error) throw new Error("LOCAL_FIXTURE_LOOKUP_FAILED");
if (!companies.data.length) {
  let sql = readFileSync("supabase/tests/h11-followup.sql", "utf8");
  const identities = [
    ["admin_id", "h11-admin@example.test"],
    ["assistant", "h11-client@example.test"],
    ["other_assistant", "h11-other@example.test"],
    ["staff", "h11-staff@example.test"],
  ];
  for (const [variable, email] of identities) {
    const id = await localUser(email);
    sql = sql.replace(
      variable + " uuid:=gen_random_uuid()",
      variable + " uuid:='" + id + "'::uuid",
    );
  }
  sql = sql.replace(/ insert into auth\.users\(id,email\) values[\s\S]*?;/, "");
  for (const name of [
    "auth-session.psql",
    "document-workspace.psql",
    "document-upload.psql",
  ])
    sql = sql.replace("\\ir helpers/" + name, () =>
      readFileSync("supabase/tests/helpers/" + name, "utf8"),
    );
  sql = sql.replace(/rollback;\s*$/, "commit;");
  localSql(sql);
}
const supervisor = await localUser("h11-supervisor@example.test");
// This fixture is restricted to the independent local project by the environment loader.
localSql(`
begin;
insert into public.profiles(user_id,email,full_name,provisioning_status)
values('${supervisor}','h11-supervisor@example.test','Supervisor H11','ready') on conflict(user_id) do nothing;
insert into public.organization_members(organization_id,user_id,member_type)
select id,'${supervisor}','internal' from public.organizations where name='H11 Docker'
on conflict(organization_id,user_id) do nothing;
insert into public.roles(organization_id,code,name,audience)
select id,'h11_supervisor','Supervisor','internal' from public.organizations where name='H11 Docker'
on conflict(organization_id,code) do nothing;
insert into public.role_permissions(organization_id,role_id,permission_id)
select r.organization_id,r.id,p.id from public.roles r join public.permissions p
on p.organization_id=r.organization_id where r.code='h11_supervisor'
on conflict do nothing;
insert into public.access_grants(organization_id,member_id,company_id,scope,module,role_id)
select c.organization_id,m.id,c.id,'company','tributario',r.id from public.companies c
join public.organization_members m on m.organization_id=c.organization_id and m.user_id='${supervisor}'
join public.roles r on r.organization_id=c.organization_id and r.code='h11_supervisor'
where c.ruc='20999999111' on conflict do nothing;
commit;
`);
console.log(
  "Fixtures H11 listos exclusivamente en Docker local; cuatro perfiles disponibles.",
);
