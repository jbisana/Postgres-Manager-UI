import { Client } from 'pg';

async function check() {
  const connectionString = 'postgresql://kingkongsdlc:rltuyObEfrUDo5iXuspo@161.97.75.105:5433/sdlc';
  const client = new Client({ connectionString, connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    
    const resRole = await client.query(`
      SELECT rolname, rolsuper, rolinherit, rolcreaterole, rolcreatedb, rolcanlogin
      FROM pg_roles 
      WHERE rolname = 'kingkongsdlc'
    `);
    console.log('Role Attributes:', resRole.rows[0]);

    const resDB = await client.query(`
      SELECT datname, has_database_privilege('kingkongsdlc', datname, 'CONNECT') as can_connect
      FROM pg_database
      WHERE datistemplate = false;
    `);
    console.log('\nDatabase Access:', resDB.rows);

    await client.end();
  } catch (err) {
    console.error(err);
  }
}
check();
