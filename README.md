# Installation

```
npm install pgcodebase
```

# Problem

Have you ever worked with postgresql functions, triggers and views using migrations? It becomes increasingly complex when your codebase grows. If you want to change the signature of some function, postgresql requires you to drop and recreate all the functions that depend on your function.

Solution is a tool that drops and recreates all the functions, triggers and views in the order that respects dependencies. Pgcodebase does exactly that. To remember the order in which those entities were created it fills a table named `pgcodebase_dropcodes`. This table contains lines of sql code that can be executed in the necessary order to drop all functions, triggers and views. You need to specify dependencies using `require` comment and also specify drop codes using `drop-code` comment in your sql files.

# Code base

All the sql that creates functions, triggers and views has to be in one folder in any directory at any depth. `dir` in config should be the path to this folder. At the start of every sql file there *must* must be a line like
```
-- drop-code drop function foo(bar baz)
```
If, for example, function `baz()` depends on function `foo(bar baz)` at the start of the file `functions/baz.sql` there must be a line
```
-- require functions/foo_bar_baz.sql
```
Not that the path is relative to your `dir`.

# Usage

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