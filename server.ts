import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import pg from "pg";
const { Client } = pg;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route to test connection
  app.post("/api/db/test-connection", async (req, res) => {
    const { connectionString } = req.body;

    if (!connectionString) {
      return res.status(400).json({ success: false, error: "Connection string is required" });
    }

    const client = new Client({
      connectionString,
      connectionTimeoutMillis: 5000,
    });

    try {
      await client.connect();
      // Optionally run a simple query to verify access
      const result = await client.query("SELECT version()");
      await client.end();
      
      res.json({ 
        success: true, 
        message: "Successfully connected to the database",
        version: result.rows[0].version
      });
    } catch (err: any) {
      console.error("Database connection error:", err);
      res.status(500).json({ 
        success: false, 
        error: err.message || "Failed to connect to the database" 
      });
    }
  });

  app.post("/api/db/databases", async (req, res) => {
    const { connectionString } = req.body;
    if (!connectionString) return res.status(400).json({ success: false, error: "Connection string required" });

    const client = new Client({ connectionString, connectionTimeoutMillis: 5000 });
    try {
      await client.connect();
      const result = await client.query(`
        SELECT datname as name
        FROM pg_database
        WHERE datistemplate = false
        ORDER BY datname;
      `);
      await client.end();
      res.json({ success: true, databases: result.rows.map(r => r.name) });
    } catch(err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/db/databases/create", async (req, res) => {
    const { connectionString, dbName } = req.body;
    if (!connectionString || !dbName) return res.status(400).json({ success: false, error: "Missing parameters" });

    const client = new Client({ connectionString, connectionTimeoutMillis: 5000 });
    try {
      await client.connect();
      // Use double quotes for dbName to handle special characters/casing
      await client.query(`CREATE DATABASE "${dbName}"`);
      await client.end();
      res.json({ success: true, message: `Database ${dbName} created successfully` });
    } catch(err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/db/databases/delete", async (req, res) => {
    const { connectionString, dbName } = req.body;
    if (!connectionString || !dbName) return res.status(400).json({ success: false, error: "Missing parameters" });

    const client = new Client({ connectionString, connectionTimeoutMillis: 5000 });
    try {
      await client.connect();
      // Terminate other connections first
      await client.query(`
        SELECT pg_terminate_backend(pid) 
        FROM pg_stat_activity 
        WHERE datname = $1 AND pid <> pg_backend_pid()
      `, [dbName]);
      
      await client.query(`DROP DATABASE "${dbName}"`);
      await client.end();
      res.json({ success: true, message: `Database ${dbName} deleted successfully` });
    } catch(err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/db/users/create", async (req, res) => {
    const { connectionString, username, password, role, databases } = req.body;
    if (!connectionString || !username || !password) return res.status(400).json({ success: false, error: "Missing parameters" });

    const client = new Client({ connectionString, connectionTimeoutMillis: 5000 });
    try {
      await client.connect();
      // Using double quotes and basic escaping (in real apps rely on strict validation)
      const safeUsername = username.replace(/"/g, '""');
      const safePassword = password.replace(/'/g, "''");
      
      let createQuery = `CREATE ROLE "${safeUsername}" WITH LOGIN PASSWORD '${safePassword}'`;
      if (role === 'admin') createQuery += " SUPERUSER";
      else if (role === 'manager') createQuery += " CREATEDB CREATEROLE";
      
      await client.query(createQuery);

      if (databases && Array.isArray(databases)) {
        for (const db of databases) {
          const safeDb = db.replace(/"/g, '""');
          try {
            await client.query(`REVOKE CONNECT ON DATABASE "${safeDb}" FROM PUBLIC`);
          } catch(e) {
             console.warn(`Failed to revoke from PUBLIC on ${safeDb}`, e);
          }
          try {
            await client.query(`GRANT CONNECT ON DATABASE "${safeDb}" TO "${safeUsername}"`);
          } catch(e) {
             console.warn(`Failed to grant on ${safeDb} for ${safeUsername}`, e);
          }
        }
      }

      await client.end();
      res.json({ success: true, message: `User ${username} created.` });
    } catch(err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/db/users/edit", async (req, res) => {
    const { connectionString, username, password, role, databases, allDatabases } = req.body;
    if (!connectionString || !username) return res.status(400).json({ success: false, error: "Missing parameters" });

    const client = new Client({ connectionString, connectionTimeoutMillis: 5000 });
    try {
      await client.connect();
      const safeUsername = username.replace(/"/g, '""');
      
      if (password) {
        const safePassword = password.replace(/'/g, "''");
        await client.query(`ALTER ROLE "${safeUsername}" WITH PASSWORD '${safePassword}'`);
      }
      
      if (role) {
        if (role === 'admin') {
          await client.query(`ALTER ROLE "${safeUsername}" WITH SUPERUSER CREATEDB CREATEROLE`);
        } else if (role === 'manager') {
          await client.query(`ALTER ROLE "${safeUsername}" WITH NOSUPERUSER CREATEDB CREATEROLE`);
        } else {
          await client.query(`ALTER ROLE "${safeUsername}" WITH NOSUPERUSER NOCREATEDB NOCREATEROLE`);
        }
      }

      if (allDatabases && Array.isArray(allDatabases) && databases && Array.isArray(databases)) {
        for (const db of allDatabases) {
          const safeDb = db.replace(/"/g, '""');
          try {
            await client.query(`REVOKE CONNECT ON DATABASE "${safeDb}" FROM PUBLIC`);
          } catch (e) {
            console.warn(`Failed to revoke from PUBLIC on ${safeDb}`, e);
          }
          try {
            if (databases.includes(db)) {
              await client.query(`GRANT CONNECT ON DATABASE "${safeDb}" TO "${safeUsername}"`);
            } else {
              await client.query(`REVOKE CONNECT ON DATABASE "${safeDb}" FROM "${safeUsername}"`);
            }
          } catch (e) {
            console.warn(`Failed to grant/revoke on ${safeDb} for ${safeUsername}`, e);
          }
        }
      }
      
      await client.end();
      res.json({ success: true, message: `User ${username} updated.` });
    } catch(err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/db/schema", async (req, res) => {
    const { connectionString } = req.body;
    if (!connectionString) return res.status(400).json({ success: false, error: "Connection string required" });

    const client = new Client({ connectionString, connectionTimeoutMillis: 5000 });
    try {
      await client.connect();
      
      const tablesResult = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `);
      
      const tables = [];
      for (const row of tablesResult.rows) {
        const tableName = row.table_name;
        
        const colResult = await client.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1
          ORDER BY ordinal_position;
        `, [tableName]);

        let pkColumns: string[] = [];
        try {
          const pkResult = await client.query(`
            SELECT a.attname
            FROM   pg_index i
            JOIN   pg_attribute a ON a.attrelid = i.indrelid
                                AND a.attnum = ANY(i.indkey)
            WHERE  i.indrelid = (
              SELECT c.oid 
              FROM pg_class c 
              JOIN pg_namespace n ON n.oid = c.relnamespace 
              WHERE n.nspname = 'public' AND c.relname = $1
            )
            AND    i.indisprimary;
          `, [tableName]);
          pkColumns = pkResult.rows.map((r: any) => r.attname);
        } catch (e) {
          console.warn('Could not fetch PKs for', tableName, e);
        }

        const columns = colResult.rows.map((c: any, i: number) => ({
          id: `c_${i}`,
          name: c.column_name,
          type: c.data_type,
          isPrimary: pkColumns.includes(c.column_name),
          isNullable: c.is_nullable === 'YES',
          defaultValue: c.column_default
        }));

        tables.push({
          id: `t_${tableName}`,
          name: tableName,
          columns,
          rows: []
        });
      }

      await client.end();
      res.json({ success: true, tables });
    } catch(err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/db/query", async (req, res) => {
    const { connectionString, query, values } = req.body;
    if (!connectionString) return res.status(400).json({ success: false, error: "Connection string required" });
    if (!query) return res.status(400).json({ success: false, error: "Query required" });

    const client = new Client({ connectionString, connectionTimeoutMillis: 5000 });
    try {
      await client.connect();
      const result = await client.query(query, values || []);
      await client.end();
      res.json({ success: true, rows: result.rows, fields: result.fields, rowCount: result.rowCount });
    } catch(err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/db/export", async (req, res) => {
    const { connectionString, table, format } = req.body;
    if (!connectionString || !table) return res.status(400).json({ success: false, error: "Missing parameters" });

    const client = new Client({ connectionString, connectionTimeoutMillis: 5000 });
    try {
      await client.connect();
      const result = await client.query(`SELECT * FROM "${table}"`);
      await client.end();
      
      let dataStr = "";
      if (format === 'json') {
        dataStr = JSON.stringify(result.rows, null, 2);
      } else {
        if (result.rows.length > 0) {
          const keys = Object.keys(result.rows[0]);
          dataStr += keys.join(',') + '\n';
          for (const row of result.rows) {
             dataStr += keys.map(k => {
                let v = row[k];
                if (v === null || v === undefined) return '';
                if (typeof v === 'string') return '"' + v.replace(/"/g, '""') + '"';
                if (typeof v === 'object') return '"' + JSON.stringify(v).replace(/"/g, '""') + '"';
                return String(v);
             }).join(',') + '\n';
          }
        }
      }
      res.json({ success: true, data: dataStr });
    } catch(err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/db/import", express.json({limit: '50mb'}), async (req, res) => {
    const { connectionString, table, format, data } = req.body;
    if (!connectionString || !table || !data) return res.status(400).json({ success: false, error: "Missing parameters" });

    const client = new Client({ connectionString, connectionTimeoutMillis: 5000 });
    try {
      await client.connect();
      
      let rowsToInsert: any[] = [];
      if (format === 'json') {
         rowsToInsert = JSON.parse(data);
         if (!Array.isArray(rowsToInsert)) throw new Error("JSON data must be an array of objects");
      } else {
         const lines = data.trim().split('\n');
         if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row");
         
         const headers = lines[0].split(',').map((h: string) => h.replace(/^"|"$/g, '').trim());
         for (let i = 1; i < lines.length; i++) {
            const rowStr = lines[i];
            const values = [];
            let inQuotes = false;
            let val = '';
            for (let j = 0; j < rowStr.length; j++) {
               const char = rowStr[j];
               if (char === '"' && rowStr[j+1] === '"') {
                  val += '"'; j++;
               } else if (char === '"') {
                  inQuotes = !inQuotes;
               } else if (char === ',' && !inQuotes) {
                  values.push(val); val = '';
               } else {
                  val += char;
               }
            }
            values.push(val); // push last val
            
            const rowObj: any = {};
            headers.forEach((h: string, idx: number) => {
               rowObj[h] = values[idx] || null;
            });
            rowsToInsert.push(rowObj);
         }
      }
      
      if (rowsToInsert.length === 0) throw new Error("No data found to import");

      await client.query('BEGIN');
      try {
        for (const row of rowsToInsert) {
           const keys = Object.keys(row);
           const cols = keys.map(k => `"${k}"`).join(',');
           const placeholders = keys.map((_, i) => `$${i+1}`).join(',');
           const values = keys.map(k => row[k]);
           await client.query(`INSERT INTO "${table}" (${cols}) VALUES (${placeholders})`, values);
        }
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      }
      
      await client.end();
      res.json({ success: true, rowCount: rowsToInsert.length });
    } catch(err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/db/diagnostics", async (req, res) => {
    const { connectionString } = req.body;
    if (!connectionString) return res.status(400).json({ success: false, error: "Connection string required" });

    const client = new Client({ connectionString, connectionTimeoutMillis: 5000 });
    try {
      await client.connect();
      
      // 1. Basic Stats
      const statsResult = await client.query(`
        SELECT 
          (SELECT count(*) FROM pg_stat_activity) as active_connections,
          pg_size_pretty(pg_database_size(current_database())) as total_size,
          (SELECT count(*) FROM pg_extension) as extension_count
      `);

      // 2. Database Version
      const versionResult = await client.query("SELECT version()");

      // 3. Top Tables by Size
      const tablesSizeResult = await client.query(`
        SELECT 
          relname as table_name, 
          pg_size_pretty(pg_total_relation_size(relid)) as total_size,
          pg_total_relation_size(relid) as size_bytes
        FROM pg_catalog.pg_statio_user_tables 
        ORDER BY pg_total_relation_size(relid) DESC
        LIMIT 5
      `);

      await client.end();
      res.json({ 
        success: true, 
        stats: {
          activeConnections: parseInt(statsResult.rows[0].active_connections),
          totalSize: statsResult.rows[0].total_size,
          extensionCount: parseInt(statsResult.rows[0].extension_count),
          version: versionResult.rows[0].version
        },
        topTables: tablesSizeResult.rows
      });
    } catch(err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/db/activity", async (req, res) => {
    const { connectionString } = req.body;
    if (!connectionString) return res.status(400).json({ success: false, error: "Connection string required" });

    const client = new Client({ connectionString, connectionTimeoutMillis: 5000 });
    try {
      await client.connect();
      const result = await client.query(`
        SELECT 
          pid, 
          state, 
          query, 
          now() - query_start as duration,
          wait_event_type,
          wait_event
        FROM pg_stat_activity 
        WHERE state IS NOT NULL
        ORDER BY query_start ASC
        LIMIT 20
      `);
      await client.end();
      res.json({ success: true, activity: result.rows });
    } catch(err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/db/bloat", async (req, res) => {
    const { connectionString } = req.body;
    if (!connectionString) return res.status(400).json({ success: false, error: "Connection string required" });

    const client = new Client({ connectionString, connectionTimeoutMillis: 5000 });
    try {
      await client.connect();
      const result = await client.query(`
        SELECT
          schemaname, relname as table_name,
          n_live_tup as live_tuples, n_dead_tup as dead_tuples,
          round(n_dead_tup * 100 / (n_live_tup + n_dead_tup + 1), 2) as dead_pct,
          last_vacuum, last_autovacuum, vacuum_count, autovacuum_count,
          pg_size_pretty(pg_total_relation_size(relid)) as table_size
        FROM pg_stat_user_tables
        ORDER BY n_dead_tup DESC
        LIMIT 20
      `);
      await client.end();
      res.json({ success: true, report: result.rows });
    } catch(err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/db/extensions", async (req, res) => {
    const { connectionString } = req.body;
    if (!connectionString) return res.status(400).json({ success: false, error: "Connection string required" });

    const client = new Client({ connectionString, connectionTimeoutMillis: 5000 });
    try {
      await client.connect();
      const result = await client.query(`
        SELECT name, default_version, installed_version, comment
        FROM pg_available_extensions
        ORDER BY installed_version IS NULL, name
      `);
      await client.end();
      res.json({ success: true, extensions: result.rows });
    } catch(err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
