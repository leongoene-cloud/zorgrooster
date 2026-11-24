/**
 * RLS-tests tegen een echte Postgres met het schema uit supabase/migrations.
 * Start eerst de testdatabase:  scripts/test-db/start.sh
 * Draai daarna:                 npm run test:db
 */
import { Client } from "pg";
import { afterAll, beforeAll, beforeEach, afterEach, describe, expect, it } from "vitest";

const url = process.env.TEST_DATABASE_URL ?? "postgres://postgres@localhost:54329/zorgrooster_test";
const db = new Client({ connectionString: url });

const ids: Record<"admin" | "anna" | "bram", { user: string; zv: string }> = {} as never;

async function als(wie: keyof typeof ids | "anoniem") {
  await db.query("reset role");
  if (wie === "anoniem") {
    await db.query("select set_config('request.jwt.claim.sub', '', true)");
    await db.query("set local role anon");
  } else {
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [ids[wie].user]);
    await db.query("set local role authenticated");
  }
}

async function alsPostgres() {
  await db.query("reset role");
  await db.query("select set_config('request.jwt.claim.sub', '', true)");
}

/** Verwacht dat de query faalt (RLS-fout of trigger-fout) */
async function faalt(sql: string, params: unknown[] = []) {
  await db.query("savepoint sp");
  let fout: unknown = null;
  try {
    await db.query(sql, params);
  } catch (e) {
    fout = e;
  }
  await db.query("rollback to savepoint sp");
  expect(fout, `verwachtte een fout voor: ${sql}`).not.toBeNull();
}

beforeAll(async () => {
  await db.connect();
  await db.query("begin");
  for (const [naam, email] of [
    ["admin", "admin@example.com"],
    ["anna", "anna@example.com"],
    ["bram", "bram@example.com"],
  ] as const) {
    const u = await db.query("insert into auth.users (email) values ($1) returning id", [email]);
    const z = await db.query("select id, user_id from public.zorgverleners where email = $1", [email]);
    expect(z.rows[0].user_id).toBe(u.rows[0].id); // koppeling via e-mail werkt
    ids[naam] = { user: u.rows[0].id, zv: z.rows[0].id };
  }
  await db.query("commit");
});

afterAll(async () => {
  await db.query("begin");
  await db.query("delete from public.verlof_aanvragen");
  await db.query("delete from public.diensten");
  await db.query("update public.zorgverleners set user_id = null");
  await db.query("delete from auth.users");
  await db.query("commit");
  await db.end();
});

beforeEach(async () => {
  await db.query("begin");
  await alsPostgres();
  await db.query(
    `insert into public.diensten (zorgverlener_id, datum, type, start_tijd, eind_tijd)
     values ($1, '2026-12-01', 'dag', '09:00', '21:00'), ($2, '2026-12-01', 'nacht', '21:00', '09:00')`,
    [ids.anna.zv, ids.bram.zv],
  );
});

afterEach(async () => {
  await db.query("rollback");
});

describe("registratie", () => {
  it("weigert een onbekend e-mailadres", async () => {
    await faalt("insert into auth.users (email) values ('vreemde@example.com')");
  });
  it("weigert een gedeactiveerde zorgverlener", async () => {
    await db.query("update public.zorgverleners set actief = false where email = 'bram@example.com'");
    const r = await db.query("select public.email_toegestaan('BRAM@example.com') as ok");
    expect(r.rows[0].ok).toBe(false);
  });
});

describe("diensten", () => {
  it("zorgverlener mag lezen maar niet schrijven", async () => {
    await als("anna");
    const r = await db.query("select * from public.diensten");
    expect(r.rowCount).toBe(2);

    await faalt(
      "insert into public.diensten (zorgverlener_id, datum, type, start_tijd, eind_tijd) values ($1, '2026-12-02', 'dag', '09:00', '21:00')",
      [ids.anna.zv],
    );
    const upd = await db.query("update public.diensten set notitie = 'gehackt' returning id");
    expect(upd.rowCount).toBe(0);
    const del = await db.query("delete from public.diensten returning id");
    expect(del.rowCount).toBe(0);
  });

  it("anoniem ziet niets", async () => {
    await als("anoniem");
    await faalt("select * from public.diensten");
  });

  it("admin mag alles", async () => {
    await als("admin");
    await db.query(
      "insert into public.diensten (zorgverlener_id, datum, type, start_tijd, eind_tijd) values ($1, '2026-12-02', 'dag', '09:00', '21:00')",
      [ids.anna.zv],
    );
    const upd = await db.query("update public.diensten set notitie = 'ok' returning id");
    expect(upd.rowCount).toBe(3);
  });

  it("vervang_diensten: alleen admin, en atomair", async () => {
    const rij = (zv: string) => [{ zorgverlener_id: zv, datum: "2026-12-01", type: "dag", start_tijd: "09:00", eind_tijd: "15:00" }];
    await als("anna");
    await faalt("select public.vervang_diensten('2026-12-01', '2026-12-31', $1::jsonb)", [JSON.stringify(rij(ids.anna.zv))]);

    await als("admin");
    // Ongeldige regel → hele transactie faalt, bestaande diensten blijven staan
    await faalt("select public.vervang_diensten('2026-12-01', '2026-12-31', $1::jsonb)", [
      JSON.stringify([{ ...rij(ids.anna.zv)[0], type: "fout" }]),
    ]);
    expect((await db.query("select count(*)::int n from public.diensten")).rows[0].n).toBe(2);

    const r = await db.query("select public.vervang_diensten('2026-12-01', '2026-12-31', $1::jsonb) as n", [
      JSON.stringify(rij(ids.anna.zv)),
    ]);
    expect(r.rows[0].n).toBe(1);
    expect((await db.query("select count(*)::int n from public.diensten")).rows[0].n).toBe(1);
  });

  it("gedeactiveerde zorgverlener ziet geen diensten meer", async () => {
    await db.query("update public.zorgverleners set actief = false where id = $1", [ids.bram.zv]);
    await als("bram");
    const r = await db.query("select * from public.diensten");
    expect(r.rowCount).toBe(0);
  });
});

describe("verlof", () => {
  it("nieuwe aanvraag krijgt altijd status 'aangevraagd'", async () => {
    await als("anna");
    const r = await db.query(
      `insert into public.verlof_aanvragen (zorgverlener_id, start_datum, eind_datum, status, opmerking_admin)
       values ($1, '2026-12-01', '2026-12-03', 'aangevraagd', null) returning status`,
      [ids.anna.zv],
    );
    expect(r.rows[0].status).toBe("aangevraagd");
  });

  it("zorgverlener kan geen goedgekeurde aanvraag aanmaken (status wordt geforceerd)", async () => {
    await als("anna");
    const r = await db.query(
      `insert into public.verlof_aanvragen (zorgverlener_id, start_datum, eind_datum, status, opmerking_admin, beoordeeld_op)
       values ($1, '2026-12-01', '2026-12-03', 'goedgekeurd', 'zelf goedgekeurd', now()) returning status, opmerking_admin, beoordeeld_op`,
      [ids.anna.zv],
    );
    expect(r.rows[0]).toEqual({ status: "aangevraagd", opmerking_admin: null, beoordeeld_op: null });
    const d = await db.query("select count(*)::int as n from public.diensten where vervanging_nodig");
    expect(d.rows[0].n).toBe(0);
  });

  it("zorgverlener kan geen verlof voor een ander aanvragen", async () => {
    await als("anna");
    await faalt(
      `insert into public.verlof_aanvragen (zorgverlener_id, start_datum, eind_datum) values ($1, '2026-12-01', '2026-12-03')`,
      [ids.bram.zv],
    );
  });

  it("einddatum vóór startdatum wordt geweigerd", async () => {
    await als("anna");
    await faalt(
      `insert into public.verlof_aanvragen (zorgverlener_id, start_datum, eind_datum) values ($1, '2026-12-05', '2026-12-03')`,
      [ids.anna.zv],
    );
  });

  it("zorgverlener ziet en wijzigt geen verlof van een ander", async () => {
    await als("bram");
    const v = await db.query(
      `insert into public.verlof_aanvragen (zorgverlener_id, start_datum, eind_datum, reden) values ($1, '2026-12-10', '2026-12-11', 'privé') returning id`,
      [ids.bram.zv],
    );
    await als("anna");
    const lees = await db.query("select * from public.verlof_aanvragen where id = $1", [v.rows[0].id]);
    expect(lees.rowCount).toBe(0);
    const upd = await db.query("update public.verlof_aanvragen set status = 'geannuleerd' where id = $1 returning id", [
      v.rows[0].id,
    ]);
    expect(upd.rowCount).toBe(0);
    const del = await db.query("delete from public.verlof_aanvragen where id = $1 returning id", [v.rows[0].id]);
    expect(del.rowCount).toBe(0);
  });

  it("zorgverlener kan eigen open aanvraag annuleren, maar niet goedkeuren of de periode wijzigen", async () => {
    await als("anna");
    const v = await db.query(
      `insert into public.verlof_aanvragen (zorgverlener_id, start_datum, eind_datum) values ($1, '2026-12-10', '2026-12-11') returning id`,
      [ids.anna.zv],
    );
    const id = v.rows[0].id;
    await faalt("update public.verlof_aanvragen set status = 'goedgekeurd' where id = $1", [id]);
    await faalt("update public.verlof_aanvragen set status = 'geannuleerd', eind_datum = '2026-12-20' where id = $1", [
      id,
    ]);
    const ok = await db.query("update public.verlof_aanvragen set status = 'geannuleerd' where id = $1 returning status", [
      id,
    ]);
    expect(ok.rows[0].status).toBe("geannuleerd");
  });

  it("zorgverlener kan een beoordeelde aanvraag niet meer annuleren", async () => {
    await als("anna");
    const v = await db.query(
      `insert into public.verlof_aanvragen (zorgverlener_id, start_datum, eind_datum) values ($1, '2026-12-10', '2026-12-11') returning id`,
      [ids.anna.zv],
    );
    await als("admin");
    await db.query("update public.verlof_aanvragen set status = 'afgekeurd' where id = $1", [v.rows[0].id]);
    await als("anna");
    const upd = await db.query(
      "update public.verlof_aanvragen set status = 'geannuleerd' where id = $1 returning id",
      [v.rows[0].id],
    );
    expect(upd.rowCount).toBe(0);
  });

  it("goedkeuren markeert diensten in de periode als 'vervanging nodig'; nieuwe status direct zichtbaar", async () => {
    await als("anna");
    const v = await db.query(
      `insert into public.verlof_aanvragen (zorgverlener_id, start_datum, eind_datum) values ($1, '2026-12-01', '2026-12-01') returning id`,
      [ids.anna.zv],
    );
    await als("admin");
    const r = await db.query(
      "update public.verlof_aanvragen set status = 'goedgekeurd', opmerking_admin = 'prima' where id = $1 returning beoordeeld_op",
      [v.rows[0].id],
    );
    expect(r.rows[0].beoordeeld_op).not.toBeNull();
    const d = await db.query("select vervanging_nodig from public.diensten where zorgverlener_id = $1", [ids.anna.zv]);
    expect(d.rows[0].vervanging_nodig).toBe(true);

    await als("anna");
    const zicht = await db.query("select status, opmerking_admin from public.verlof_aanvragen where id = $1", [
      v.rows[0].id,
    ]);
    expect(zicht.rows[0]).toEqual({ status: "goedgekeurd", opmerking_admin: "prima" });

    // Bram ziet het goedgekeurde verlof van Anna (zonder reden) via de view
    await als("bram");
    const view = await db.query("select * from public.verlof_goedgekeurd");
    expect(view.rowCount).toBe(1);
    expect(Object.keys(view.rows[0])).not.toContain("reden");

    // Andere zorgverlener toewijzen haalt de markering weg
    await als("admin");
    const t = await db.query(
      "update public.diensten set zorgverlener_id = $1 where zorgverlener_id = $2 returning vervanging_nodig",
      [ids.bram.zv, ids.anna.zv],
    );
    expect(t.rows[0].vervanging_nodig).toBe(false);
  });
});

describe("beheerder plant verlof in", () => {
  it("direct goedgekeurd verlof markeert diensten; intrekken haalt de markering weg", async () => {
    await als("admin");
    const v = await db.query(
      `insert into public.verlof_aanvragen (zorgverlener_id, start_datum, eind_datum, status, opmerking_admin, beoordeeld_op)
       values ($1, '2026-12-01', '2026-12-01', 'goedgekeurd', 'Ingepland door de beheerder', now()) returning id, status`,
      [ids.anna.zv],
    );
    expect(v.rows[0].status).toBe("goedgekeurd");
    const markering = async () =>
      (await db.query("select vervanging_nodig from public.diensten where zorgverlener_id = $1", [ids.anna.zv])).rows[0].vervanging_nodig;
    expect(await markering()).toBe(true);
    await db.query("update public.verlof_aanvragen set status = 'geannuleerd' where id = $1", [v.rows[0].id]);
    expect(await markering()).toBe(false);
  });

  it("een zorgverlener kan geen verlof voor een ander inplannen", async () => {
    await als("bram");
    await faalt(
      `insert into public.verlof_aanvragen (zorgverlener_id, start_datum, eind_datum, status) values ($1, '2026-12-01', '2026-12-01', 'goedgekeurd')`,
      [ids.anna.zv],
    );
  });
});

describe("zorgverleners, vakanties, sjablonen, log", () => {
  it("zorgverlener ziet via de view alleen naam en kleur, en kan niets wijzigen", async () => {
    await als("anna");
    const tabel = await db.query("select * from public.zorgverleners");
    expect(tabel.rowCount).toBe(1); // alleen zichzelf
    const view = await db.query("select * from public.zorgverleners_publiek");
    expect(view.rowCount).toBe(3);
    expect(Object.keys(view.rows[0]).sort()).toEqual(["actief", "id", "kleur", "naam"]);
    const upd = await db.query("update public.zorgverleners set rol = 'admin' returning id");
    expect(upd.rowCount).toBe(0);
    await faalt("insert into public.zorgverleners (naam, email) values ('X', 'x@example.com')");
  });

  it("anoniem kan de views niet lezen", async () => {
    await als("anoniem");
    await faalt("select * from public.zorgverleners_publiek");
    await faalt("select * from public.verlof_goedgekeurd");
  });

  it("schoolvakanties: lezen ja, schrijven nee", async () => {
    await als("anna");
    const r = await db.query("select * from public.schoolvakanties");
    expect(r.rowCount).toBe(7);
    await faalt("insert into public.schoolvakanties (naam, start_datum, eind_datum) values ('x', '2027-01-01', '2027-01-02')");
    const upd = await db.query("update public.schoolvakanties set naam = 'x' returning id");
    expect(upd.rowCount).toBe(0);
  });

  it("sjablonen en auditlog alleen voor admin", async () => {
    await als("anna");
    await faalt(
      "insert into public.dienst_sjablonen (weekdag, zorgverlener_id, type, start_tijd, eind_tijd) values (1, $1, 'dag', '09:00', '21:00')",
      [ids.anna.zv],
    );
    expect((await db.query("select * from public.audit_log")).rowCount).toBe(0);
    await faalt("insert into public.audit_log (tabel, actie) values ('x', 'y')");
    await faalt("delete from public.audit_log");

    await als("admin");
    await db.query("update public.diensten set notitie = 'test'");
    const log = await db.query(
      "select user_id, actie from public.audit_log where tabel = 'diensten' and actie = 'update' order by id desc limit 1",
    );
    expect(log.rows[0]).toEqual({ user_id: ids.admin.user, actie: "update" });
  });
});

describe("persoonlijke link (zorgverlener zonder account)", () => {
  async function maakLink(wie: "anna" | "bram") {
    await als("admin");
    const r = await db.query("select public.nieuwe_toegangslink($1) as t", [ids[wie].zv]);
    return r.rows[0].t as string;
  }

  it("alleen de admin kan een link maken; in de database staat alleen de hash", async () => {
    await als("anna");
    await faalt("select public.nieuwe_toegangslink($1)", [ids.anna.zv]);
    await als("anoniem");
    await faalt("select public.nieuwe_toegangslink($1)", [ids.anna.zv]);
    const token = await maakLink("anna");
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    await alsPostgres();
    const r = await db.query("select toegang_hash from public.zorgverleners where id = $1", [ids.anna.zv]);
    expect(r.rows[0].toegang_hash).not.toBe(token);
  });

  it("anoniem zonder geldige link krijgt niets, en kan de tabellen niet direct lezen", async () => {
    await maakLink("anna");
    await als("anoniem");
    expect((await db.query("select * from public.zv_diensten('fout-fout-fout-fout-fout-fout-fout-fout', '2026-12-01', '2026-12-31')")).rowCount).toBe(0);
    expect((await db.query("select * from public.zv_sessie('')")).rowCount).toBe(0);
    expect((await db.query("select * from public.zv_zorgverleners(null)")).rowCount).toBe(0);
    await faalt("select public.zv_uit_token('x')");
    await faalt("select * from public.diensten");
    await faalt("select * from public.verlof_aanvragen");
  });

  it("met link: rooster lezen, alleen naam/kleur van anderen", async () => {
    const token = await maakLink("anna");
    await als("anoniem");
    const s = await db.query("select * from public.zv_sessie($1)", [token]);
    expect(s.rows[0]).toMatchObject({ id: ids.anna.zv });
    expect((await db.query("select * from public.zv_diensten($1, '2026-12-01', '2026-12-31')", [token])).rowCount).toBe(2);
    const zv = await db.query("select * from public.zv_zorgverleners($1)", [token]);
    expect(Object.keys(zv.rows[0]).sort()).toEqual(["actief", "id", "kleur", "naam"]);
    expect((await db.query("select * from public.zv_vakanties($1, '2026-11-17', '2027-11-17')", [token])).rowCount).toBe(5);
  });

  it("met link: eigen verlof aanvragen (altijd 'aangevraagd') en annuleren, niet dat van een ander", async () => {
    const anna = await maakLink("anna");
    const bram = await maakLink("bram");
    await als("anoniem");
    const id = (await db.query("select public.zv_verlof_aanvragen($1, '2026-12-01', '2026-12-02', 'test') as id", [anna])).rows[0].id;
    const mijn = await db.query("select * from public.zv_mijn_verlof($1)", [anna]);
    expect(mijn.rows[0]).toMatchObject({ id, status: "aangevraagd" });
    expect((await db.query("select * from public.zv_mijn_verlof($1)", [bram])).rowCount).toBe(0);
    await faalt("select public.zv_verlof_aanvragen($1, '2026-12-05', '2026-12-01')", [anna]);

    // Bram kan Anna's aanvraag niet annuleren
    expect((await db.query("select public.zv_verlof_annuleren($1, $2) as ok", [bram, id])).rows[0].ok).toBe(false);
    expect((await db.query("select public.zv_verlof_annuleren($1, $2) as ok", [anna, id])).rows[0].ok).toBe(true);
    // al geannuleerd → nog een keer kan niet
    expect((await db.query("select public.zv_verlof_annuleren($1, $2) as ok", [anna, id])).rows[0].ok).toBe(false);

    await alsPostgres();
    const log = await db.query("select zorgverlener_id from public.audit_log where tabel = 'verlof_aanvragen' order by id desc limit 1");
    expect(log.rows[0].zorgverlener_id).toBe(ids.anna.zv);
  });

  it("goedgekeurd verlof van anderen is zichtbaar zonder reden", async () => {
    const anna = await maakLink("anna");
    const bram = await maakLink("bram");
    await als("anoniem");
    const id = (await db.query("select public.zv_verlof_aanvragen($1, '2026-12-01', '2026-12-01', 'privé') as id", [anna])).rows[0].id;
    await als("admin");
    await db.query("update public.verlof_aanvragen set status = 'goedgekeurd' where id = $1", [id]);
    await als("anoniem");
    const v = await db.query("select * from public.zv_verlof_goedgekeurd($1, '2026-12-01', '2026-12-31')", [bram]);
    expect(v.rowCount).toBe(1);
    expect(Object.keys(v.rows[0])).not.toContain("reden");
  });

  it("zorgverleners zien openstaand en goedgekeurd verlof van collega's, zonder reden", async () => {
    const anna = await maakLink("anna");
    const bram = await maakLink("bram");
    await als("anoniem");
    const open = (await db.query("select public.zv_verlof_aanvragen($1, current_date + 10, current_date + 12, 'geheim') as id", [anna])).rows[0].id;
    const goed = (await db.query("select public.zv_verlof_aanvragen($1, current_date + 20, current_date + 21) as id", [anna])).rows[0].id;
    const af = (await db.query("select public.zv_verlof_aanvragen($1, current_date + 30, current_date + 31) as id", [anna])).rows[0].id;
    const voorbij = (await db.query("select public.zv_verlof_aanvragen($1, current_date - 10, current_date - 5) as id", [anna])).rows[0].id;
    await als("admin");
    await db.query("update public.verlof_aanvragen set status = 'goedgekeurd' where id = any($1)", [[goed, voorbij]]);
    await db.query("update public.verlof_aanvragen set status = 'afgekeurd' where id = $1", [af]);

    await als("anoniem");
    const team = await db.query("select * from public.zv_verlof_team($1)", [bram]);
    expect(team.rows.map((r) => [r.id, r.status])).toEqual([
      [open, "aangevraagd"],
      [goed, "goedgekeurd"],
    ]);
    expect(Object.keys(team.rows[0])).not.toContain("reden");
    expect((await db.query("select * from public.zv_verlof_team('ongeldig-ongeldig-ongeldig-ongeldig')")).rowCount).toBe(0);
  });

  it("nieuwe link of deactiveren maakt de oude link ongeldig", async () => {
    const oud = await maakLink("anna");
    const nieuw = await maakLink("anna");
    await als("anoniem");
    expect((await db.query("select * from public.zv_sessie($1)", [oud])).rowCount).toBe(0);
    expect((await db.query("select * from public.zv_sessie($1)", [nieuw])).rowCount).toBe(1);
    await alsPostgres();
    await db.query("update public.zorgverleners set actief = false where id = $1", [ids.anna.zv]);
    await als("anoniem");
    expect((await db.query("select * from public.zv_sessie($1)", [nieuw])).rowCount).toBe(0);
    await faalt("select public.zv_verlof_aanvragen($1, '2026-12-01', '2026-12-01')", [nieuw]);
    await als("admin");
    await db.query("select public.trek_toegangslink_in($1)", [ids.bram.zv]);
  });
});

describe("werkbeschrijvingen", () => {
  it("admin schrijft; zorgverlener leest alleen via geldige link; anoniem niets", async () => {
    await als("admin");
    await db.query("insert into public.werkbeschrijvingen (titel, inhoud, volgorde) values ('Ochtendzorg', '- wassen', 1)");
    const token = (await db.query("select public.nieuwe_toegangslink($1) as t", [ids.anna.zv])).rows[0].t;

    await als("anna"); // ingelogd account zonder beheerrechten
    expect((await db.query("select * from public.werkbeschrijvingen")).rowCount).toBe(0);
    await faalt("insert into public.werkbeschrijvingen (titel) values ('x')");

    await als("anoniem");
    await faalt("select * from public.werkbeschrijvingen");
    const r = await db.query("select titel from public.zv_werkbeschrijvingen($1)", [token]);
    expect(r.rows).toEqual([{ titel: "Ochtendzorg" }]);
    expect((await db.query("select * from public.zv_werkbeschrijvingen('ongeldig-ongeldig-ongeldig-ongeldig')")).rowCount).toBe(0);
  });
});
