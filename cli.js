#!/usr/bin/env node

const dotenv = require('dotenv')
const pgcodebase = require('./index')

dotenv.config()

const args = process.argv.slice(2)
const createOnly = args.indexOf('--create-only') !== -1
const dropOnly = args.indexOf('--drop-only') !== -1

pgcodebase({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT,
  dir: process.env.PGCODEBASE_DIR,
  createOnly, dropOnly
}).catch(console.error)
