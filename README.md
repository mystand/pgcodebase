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