const { Client } = require('pg')
const fs = require('fs-extra')
const path = require('path')

const client = new Client({
  user: process.env.PSQL_USER,
  host: process.env.PSQL_HOST,
  password: process.env.PSQL_PASSWORD,
  database: process.env.PSQL_NAME,
  port: process.env.PSQL_PORT
})
const pgfuncDir = path.join(__dirname, '../pgfunc')

function parseComments(file) {
  const lines = file.split('\n'), require = []
  let i = 0, dropCode = ''

  while(lines[i].startsWith('--')) {
    if (lines[i].startsWith('-- drop-code')) {
      dropCode = lines[i].slice(13)
    }

    if (lines[i].startsWith('-- require')) {
      require.push(lines[i].slice(11))
    }

    i++
  }

  return { require, dropCode }
}

function removeNode(adjacencyLists, node) {
  delete adjacencyLists[node]

  Object.keys(adjacencyLists).forEach(key => {
    const index = adjacencyLists[key].indexOf(node)
    if (index > -1) {
      adjacencyLists[key].splice(index, 1)
    }
  })
}

async function recreateEntities() {
  const functionFileNames = await fs.readdir(path.join(pgfuncDir, 'functions'))
  const triggerFileNames = await fs.readdir(path.join(pgfuncDir, 'triggers'))
  const viewFileNames = await fs.readdir(path.join(pgfuncDir, 'views'))

  const functionFilePaths = functionFileNames.map(fileName => path.join(pgfuncDir, 'functions', fileName))
  const triggerFilePaths = triggerFileNames.map(fileName => path.join(pgfuncDir, 'triggers', fileName))
  const viewFilePaths = viewFileNames.map(fileName => path.join(pgfuncDir, 'views', fileName))

  const filePaths = [...functionFilePaths, ...triggerFilePaths, ...viewFilePaths]
  const entities = await Promise.all(filePaths.map(async (filePath) => {
    const file = await fs.readFile(filePath, 'utf-8')
    return { ...parseComments(file), filePath, file }
  }))
  const entitiesByFilePath = entities.reduce(
    (accumulator, entity) => ({ ...accumulator, [entity.filePath]: entity }),
    {}
  )

  const adjacencyLists = {}
  entities.forEach(entity => {
    if (!adjacencyLists[entity.filePath]) {
      adjacencyLists[entity.filePath] = []
    }
    entity.require.forEach(relativePath => {
      adjacencyLists[entity.filePath].push(path.join(pgfuncDir, relativePath))
    })
  })

  await client.connect()

  await client.query('CREATE TABLE IF NOT EXISTS pgfunc_dropcodes (id bigserial PRIMARY KEY, dropcode text)')
  const dropCodesResult = await client.query('SELECT dropcode FROM pgfunc_dropcodes ORDER BY id DESC')
  await dropCodesResult.rows
    .map(row => async () => await client.query(row.dropcode))
    .reduce(
      (promise, func) => promise.then(func).catch(console.error),
      Promise.resolve()
    )
  await client.query('TRUNCATE TABLE pgfunc_dropcodes RESTART IDENTITY')

  while(Object.keys(adjacencyLists).length !== 0) {
    let key = Object.keys(adjacencyLists)[0]
    const visited = [key]

    while (adjacencyLists[key].length !== 0) {
      key = adjacencyLists[key][0]
      if (visited.indexOf(key) > -1) {
        throw new Error(`Cyclic dependency for file: ${key}`)
      }
      visited.push(key)
    }

    console.log(key)
    await client.query(entitiesByFilePath[key].file)
    await client.query('INSERT INTO pgfunc_dropcodes (dropcode) VALUES ($1)', [entitiesByFilePath[key].dropCode])
    removeNode(adjacencyLists, key)
  }

  await client.end()
}

recreateEntities().catch(console.error)
