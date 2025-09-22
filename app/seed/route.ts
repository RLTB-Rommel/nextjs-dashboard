import bcrypt from 'bcrypt';
import postgres from 'postgres';
import { invoices, customers, revenue, users } from '../lib/placeholder-data';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

// ---- helpers accept the client they should use (tx inside a transaction) ----
async function seedUsers(db: typeof sql) {
  await db`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
  await db`
    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    );
  `;

  await Promise.all(
    users.map(async (user) => {
      const hashed = await bcrypt.hash(user.password, 10);
      return db`
        INSERT INTO users (id, name, email, password)
        VALUES (${user.id}, ${user.name}, ${user.email}, ${hashed})
        ON CONFLICT (id) DO NOTHING;
      `;
    })
  );
}

async function seedCustomers(db: typeof sql) {
  await db`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
  await db`
    CREATE TABLE IF NOT EXISTS customers (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      image_url VARCHAR(255) NOT NULL
    );
  `;

  await Promise.all(
    customers.map((c) => db`
      INSERT INTO customers (id, name, email, image_url)
      VALUES (${c.id}, ${c.name}, ${c.email}, ${c.image_url})
      ON CONFLICT (id) DO NOTHING;
    `)
  );
}

async function seedInvoices(db: typeof sql) {
  await db`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
  await db`
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      customer_id UUID NOT NULL,
      amount INT NOT NULL,
      status VARCHAR(255) NOT NULL,
      date DATE NOT NULL
    );
  `;

  // (Optional) add FK if you want:
  // await db`ALTER TABLE invoices ADD CONSTRAINT IF NOT EXISTS invoices_customer_fk
  //          FOREIGN KEY (customer_id) REFERENCES customers(id)`;

  await Promise.all(
    invoices.map((inv) => db`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${inv.customer_id}, ${inv.amount}, ${inv.status}, ${inv.date})
      ON CONFLICT (id) DO NOTHING;
    `)
  );
}

async function seedRevenue(db: typeof sql) {
  await db`
    CREATE TABLE IF NOT EXISTS revenue (
      month VARCHAR(4) NOT NULL UNIQUE,
      revenue INT NOT NULL
    );
  `;
  await Promise.all(
    revenue.map((r) => db`
      INSERT INTO revenue (month, revenue)
      VALUES (${r.month}, ${r.revenue})
      ON CONFLICT (month) DO NOTHING;
    `)
  );
}

export async function GET() {
  try {
    // quick connection sanity check
    await sql`select 1 as ok`;

    // run everything in a single transaction
    await sql.begin(async (tx) => {
      // order matters if you later add FKs: users/customers -> invoices -> revenue
      await seedUsers(tx);
      await seedCustomers(tx);
      await seedInvoices(tx);
      await seedRevenue(tx);
    });

    return Response.json({ message: 'Database seeded successfully' });
  } catch (err: any) {
    console.error('SEED ERROR:', err);
    // expose full details instead of { name: 'k', code: 'XX000' }
    const full = JSON.stringify(err, Object.getOwnPropertyNames(err));
    return Response.json({ error: JSON.parse(full) }, { status: 500 });
  }
}