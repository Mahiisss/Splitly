// Security tests for the database schema. Runs the real migration inside
// PGlite (Postgres compiled to WebAssembly) with a tiny fake of Supabase auth,
// then checks what each user is and is not allowed to see and do.
// Run with: npm test --workspace=@splitly/db
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const db = new PGlite();
const ok = (m) => console.log("PASS", m);
const fail = (m) => { console.log("FAIL", m); process.exitCode = 1; };

// Minimal stand-in for Supabase's auth schema and roles.
await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant execute on functions to anon, authenticated;
`);
await db.exec(readFileSync(new URL("../migrations/20261005000000_initial_schema.sql", import.meta.url), "utf8"));
ok("migration applied");

const A = "00000000-0000-0000-0000-00000000000a";
const B = "00000000-0000-0000-0000-00000000000b";
const C = "00000000-0000-0000-0000-00000000000c";
await db.exec(`insert into auth.users (id, email, raw_user_meta_data) values
  ('${A}', 'mahi@x.com', '{"display_name":"Mahi"}'),
  ('${B}', 'aarav@x.com', '{}'),
  ('${C}', 'outsider@x.com', '{}');`);
const profiles = await db.query("select display_name from public.profiles order by id");
profiles.rows.map((r) => r.display_name).join() === "Mahi,aarav,outsider" ? ok("profiles auto-created") : fail(JSON.stringify(profiles.rows));

async function as(user, sql, params) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${user}', false); set role authenticated;`);
  try { return await db.query(sql, params); } finally { await db.exec("reset role"); }
}
async function expectError(user, sql, params, label) {
  try { await as(user, sql, params); fail(label + " (no error)"); } catch (e) { ok(label + " -> " + e.message); }
}

// A creates a group with insert ... returning (the classic RLS gotcha)
const g = await as(A, "insert into public.groups (name) values ('Goa Trip') returning id, invite_code");
const groupId = g.rows[0].id, code = g.rows[0].invite_code;
ok("group created with returning, code " + code);
(await as(A, "select role from public.group_members where group_id=$1", [groupId])).rows[0]?.role === "owner" ? ok("creator is owner") : fail("owner");

// C can't see it
(await as(C, "select * from public.groups")).rows.length === 0 ? ok("outsider sees no groups") : fail("outsider sees group");

// B joins by code
await as(B, "select public.join_group_by_code($1)", [code]);
(await as(B, "select count(*)::int n from public.group_members where group_id=$1", [groupId])).rows[0].n === 2 ? ok("B joined; sees 2 members") : fail("join");
(await as(B, "select count(*)::int n from public.profiles")).rows[0].n === 2 ? ok("B sees own + A's profile only") : fail("profiles visibility");

// expenses
const E1 = "11111111-1111-1111-1111-111111111111";
const splits = JSON.stringify([{ user_id: A, amount_minor: 500 }, { user_id: B, amount_minor: 500 }]);
await as(A, "select public.create_expense($1,$2,'Dinner',1000,$3,'equal',$4::jsonb)", [E1, groupId, A, splits]);
await as(A, "select public.create_expense($1,$2,'Dinner',1000,$3,'equal',$4::jsonb)", [E1, groupId, A, splits]);
(await as(B, "select count(*)::int n from public.expenses")).rows[0].n === 1 ? ok("expense created; retry is idempotent") : fail("idempotent");
(await as(B, "select count(*)::int n from public.expense_splits")).rows[0].n === 2 ? ok("B reads splits") : fail("splits");
(await as(B, "select category from public.expenses where id=$1", [E1])).rows[0].category === "other" ? ok("category defaults to other") : fail("category default");
const E2 = "22222222-2222-2222-2222-222222222222";
await as(A, "select public.create_expense($1,$2,'Villa',1000,$3,'equal',$4::jsonb,'stay')", [E2, groupId, A, splits]);
(await as(B, "select category from public.expenses where id=$1", [E2])).rows[0].category === "stay" ? ok("category saved") : fail("category");
await expectError(A, "select public.create_expense(gen_random_uuid(),$1,'Bad',1000,$2,'equal',$3::jsonb,'cars')",
  [groupId, A, splits], "rejects unknown category");

await expectError(A, "select public.create_expense(gen_random_uuid(),$1,'Bad',1000,$2,'exact',$3::jsonb)",
  [groupId, A, JSON.stringify([{ user_id: A, amount_minor: 100 }])], "rejects splits that don't add up");
await expectError(A, "select public.create_expense(gen_random_uuid(),$1,'Bad',1000,$2,'exact',$3::jsonb)",
  [groupId, A, JSON.stringify([{ user_id: C, amount_minor: 1000 }])], "rejects non-member in split");
await expectError(C, "select public.create_expense(gen_random_uuid(),$1,'Bad',1000,$2,'exact',$3::jsonb)",
  [groupId, C, JSON.stringify([{ user_id: C, amount_minor: 1000 }])], "outsider can't add expense");
await expectError(A, "insert into public.expenses (group_id, description, amount_minor, paid_by, split_type) values ($1,'x',1,$2,'equal')",
  [groupId, A], "direct insert into expenses blocked");
(await as(C, "select count(*)::int n from public.expenses")).rows[0].n === 0 ? ok("outsider sees no expenses") : fail("expense leak");

// editing
const fair = JSON.stringify([{ user_id: A, amount_minor: 300 }, { user_id: B, amount_minor: 700 }]);
await as(B, "select public.update_expense($1,'Dinner (edited)',1000,$2,'exact',$3::jsonb,'food')", [E1, A, fair]);
const edited = (await as(A, "select description, category from public.expenses where id=$1", [E1])).rows[0];
const editedSplits = (await as(A, "select amount_minor::int a from public.expense_splits where expense_id=$1 order by a", [E1])).rows.map((r) => r.a);
edited.description === "Dinner (edited)" && edited.category === "food" && editedSplits.join() === "300,700"
  ? ok("a member can edit an expense and its splits")
  : fail("edit " + JSON.stringify([edited, editedSplits]));
await expectError(A, "select public.update_expense($1,'Bad',1000,$2,'exact',$3::jsonb)",
  [E1, A, JSON.stringify([{ user_id: A, amount_minor: 1 }])], "edit rejects splits that don't add up");
await expectError(C, "select public.update_expense($1,'Hacked',1000,$2,'exact',$3::jsonb)",
  [E1, C, JSON.stringify([{ user_id: C, amount_minor: 1000 }])], "outsider can't edit an expense");

// settlements
await as(B, "insert into public.settlements (group_id, from_user, to_user, amount_minor) values ($1,$2,$3,500)", [groupId, B, A]);
ok("B records a settlement");
await expectError(B, "insert into public.settlements (group_id, from_user, to_user, amount_minor) values ($1,$2,$3,500)",
  [groupId, C, A], "settlement with non-member blocked");

// anon can't call RPCs
try {
  await db.exec("reset role; set role anon;");
  await db.query("select public.join_group_by_code('x')");
  fail("anon called rpc");
} catch (e) { ok("anon can't call join_group_by_code -> " + e.message); } finally { await db.exec("reset role"); }

// B leaves; then sees nothing
await as(B, "delete from public.group_members where group_id=$1 and user_id=$2", [groupId, B]);
(await as(B, "select count(*)::int n from public.expenses")).rows[0].n === 0 ? ok("after leaving, B sees no expenses") : fail("leave");
