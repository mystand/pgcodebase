# Installation

```
npm install pgcodebase
```

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

`pgcodebase` call returns Promise.

If `createOnly` or `dropOnly` is true, then the script will only create or only drop entities respectfully. It is useful to specify `dropOnly` before table migrations and `createOnly` after.

# Problem

Have you ever worked with postgresql functions, triggers and views using migrations? It becomes increasingly complex when your codebase grows. If you want to change the signature of some function, postgresql requires you to drop and recreate all the functions that depend on your function.

Let me demonstrate you on example. Say, you have a function `foo()` which depends on a function `bar()`. You want to change `bar()` signature to `bar(baz integer)`. Your sql migration code will be like this
```sql
DROP FUNCTION foo();
DROP FUNCTION baz();
CREATE FUNCTION baz(baz integer) [...]
CREATE FUNCTION foo() [...]
```
Imagine now you have multiple functions that depend on `bar()`. You will have to drop and recreate them all! This process becomes really painful as your codebase grows.

Solution is a tool that drops and recreates all the functions, triggers and views in the order that respects dependencies. Pgcodebase does exactly that. To remember the order in which those entities were created it fills a table named `pgcodebase_dropcodes`. This table contains lines of sql code that can be executed in the reverse order to drop all functions, triggers and views. You need to specify dependencies using `require` comment and also specify drop codes using `drop-code` comment in your sql files.

# Code base

All the sql that creates functions, triggers and views has to be in one directory at any depth. `dir` in config should be the absolute path to this folder. At the start of every sql file there *must* must be a line like
```
-- drop-code drop function foo(bar integer)
```
If, for example, function `baz()` depends on function `foo(bar integer)` at the start of the file `functions/baz.sql` there must be a line
```
-- require functions/foo.sql
```
Note that the path is relative to your `dir` and also `drop-code` and `require`s (you can specify multiple) can be in any order at the start of a file.

# Inspiration

This tool was inspired by [PgRebase](https://github.com/oelmekki/pgrebase). PgRebase, however, cannot process dependencies between different types of entities. If you have a view that depends on some function, you are out of luck. Pgcodebase doesn't care about the types of your entities. It can create and drop them in any order specified with `require`s.