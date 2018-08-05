#!/usr/bin/env node

const dotenv = require('dotenv')
const commander = require('commander')
const pgcodebase = require('./index')

dotenv.config()
commander
  .option('-u, --user <user>', 'Postgresql user')
  .option('-H, --host <host>', 'Postgresql host')
  .option('-p, --password <password>', 'Postgresql password')
  .option('-d, --database <database>', 'Postgresql database name')
  .option('-P, --port <port>', 'Postgresql port')
  .option('-C, --connection-string <connectionString>', 'Postgresql connection string')
  .option('-s, --current-schema <currentSchema>', 'Default postgresql schema to use')
  .option('-D, --dir <dir>', 'Sql files directory')
  .option('-c, --create-only', 'Only create entities in database, drop nothing')
  .option('-r, --drop-only', 'Only drop entities in database, create nothing')
  .parse(process.argv)

pgcodebase({
  user: commander.user || process.env.PGUSER,
  host: commander.host || process.env.PGHOST,
  password: commander.password || process.env.PGPASSWORD,
  database: commander.database || process.env.PGDATABASE,
  port: commander.port || process.env.PGPORT,
  dir: commander.dir || process.env.PGCODEBASE_DIR,
  connectionString: commander.connectionString || process.env.PGCODEBASE_CONNECTION_STRING,
  createOnly: commander.createOnly,
  dropOnly: commander.dropOnly,
  currentSchema: commander.currentSchema
}).catch(console.error)
