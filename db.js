import { Pool } from 'pg';

const pool = new Pool({
  user: 'postgres',
  password: '68301680NevanDev',
  host: 'localhost',
  port: 5432,
  database: 'postgres',
});

export default pool;
