# Installation

```
npm install pgcodebase
```

# Usage

Pgcodebase is a tool for easy management of postgresql functions, triggers and views inspired by [PgRebase](https://github.com/oelmekki/pgrebase).

```javascript
const pgcodebase = require('pgcodebase')

pgcodebase({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT,
  dir: path.join(__dirname, 'pgcodebase'),
  createOnly: false,
  dropOnly: false
}).catch(console.error)
```

`pgcodebase` call returns Promise.

## Console

```
Usage: npx pgcodebase [options]

Options:

-u, --user <user>          Postgresql user
-H, --host <host>          Postgresql host
-p, --password <password>  Postgresql password
-d, --database <database>  Postgresql database name
-P, --port <port>          Postgresql port
-D, --dir <dir>            Sql files directory
-c, --create-only          Only create entities in database, drop nothing
-r, --drop-only            Only drop entities in database, create nothing
-h, --help                 output usage information
```

If `createOnly` or `dropOnly` is true, then the script will only create or only drop entities respectively. It is useful to specify `dropOnly` before table migrations and `createOnly` after.

You can also configure pgcodebase using `.env` file. You will have to create `.env` file in the directory where you execute the command. In `.env` there should be variables `PGUSER`, `PGHOST`, `PGPASSWORD`, `PGDATABASE`, `PGPORT` and `PGCODEBASE_DIR`. Last one should contain an absolute or relative path to the directory with functions, triggers and views. Other variables are [standard for postgresql](https://www.postgresql.org/docs/9.3/static/libpq-envars.html).

# Problem

Have you ever worked with postgresql functions, triggers and views using migrations? It becomes increasingly complex when your codebase grows. If you want to change the signature of some function, postgresql requires you to drop and recreate all the functions that depend on your function.

Let me demonstrate you on an example. Usually you would create migrations to create functions. [Migration 1](./examples/bad/1_create_function_bar.sql) and [Migration 2](./examples/bad/2_create_function_foo.sql). Notice that function `foo` calls function `bar` therefore a dependency exists. Then if you need to modify body of the `bar` you will need to drop and recreate both functions: [Migration 3](./examples/bad/3_modify_function_bar.sql). Imagine now you have multiple functions that depend on `bar()`. You will have to drop and recreate them all! This process becomes really painful as your codebase grows.

A solution to the problem is a tool that drops and recreates all the functions, triggers and views in the order that respects dependencies. In our example you just have to create a folder and 2 files in it: [function_bar](./examples/good/pgcodebase/function_bar.sql) and [function_foo](./examples/good/pgcodebase/function_foo.sql). Then you can run `pgcodebase` whenever any change is made in those files.

Internally pgcodebase after resolving dependencies drops all entities and starts filling a table named `pgcodebase_dropcodes` with sql specified using `drop-code` comment. Simultaneously it is creating entities in database. To drop entities it executes sql code from `pgcodebase_dropcodes` table in reverse order.

# Code base

All the sql that creates functions, triggers and views has to be in one directory at any depth. `dir` in config should be the absolute path to this folder. At the start of every sql file there *must* be a line like
```
-- drop-code drop function foo(bar integer)
```
After `drop-code` there should be a valid sql query that drops the entity created by this sql file.

If, for example, function `baz()` depends on function `foo(bar integer)` at the start of the file `functions/baz.sql` there must be a line
```
-- require functions/foo.sql
```
Note that the path is relative to your `dir` and also `drop-code` and `require`s (you can specify multiple) can be in any order at the start of a file.

# Inspiration

This tool was inspired by [PgRebase](https://github.com/oelmekki/pgrebase). PgRebase, however, cannot process dependencies between different types of entities. If you have a view that depends on some function, you are out of luck. Pgcodebase doesn't care about the types of your entities. It can create and drop them in any order specified with `require`s.