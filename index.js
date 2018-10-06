const { Client } = require('pg')
const fs = require('fs-extra')
const path = require('path')
const recursiveReadDir = require('recursive-readdir')

function parseComments(file) {
  const lines = file.split('\n'), require = []
  let i = 0, dropCode = ''

  while(lines[i].startsWith('--') || lines[i].trim() === '') {
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

async function syncFiles(client, config) {
  if (config.schema) {
    await client.query(`SET SCHEMA '${config.schema}'`)
  }

  await client.query('CREATE TABLE IF NOT EXISTS pgcodebase_dropcodes (id bigserial PRIMARY KEY, dropcode text)')

  if (!config.createOnly) {
    const dropCodesResult = await client.query('SELECT dropcode FROM pgcodebase_dropcodes ORDER BY id DESC')
    await dropCodesResult.rows
      .map(row => async () => await client.query(row.dropcode))
      .reduce(
        (promise, func) => promise.then(func).catch(console.error),
        Promise.resolve()
      )
    await client.query('TRUNCATE TABLE pgcodebase_dropcodes RESTART IDENTITY')
  }

  if (!config.dropOnly) {
    const filePaths = await recursiveReadDir(config.dir)
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
        adjacencyLists[entity.filePath].push(path.join(config.dir, relativePath))
      })
    })

    while (Object.keys(adjacencyLists).length !== 0) {
      let key = Object.keys(adjacencyLists)[0]
      const visited = [key]
      if (!adjacencyLists[key]) {
        throw new Error(`Required file "${key}" not found`);
      }
      while (adjacencyLists[key].length !== 0) {
        key = adjacencyLists[key][0]
        if (visited.indexOf(key) > -1) {
          throw new Error(`Cyclic dependency for file: ${key}`)
        }
        visited.push(key)
      }

      console.log(key)
      await client.query(entitiesByFilePath[key].file)
      await client.query('INSERT INTO pgcodebase_dropcodes (dropcode) VALUES ($1)', [entitiesByFilePath[key].dropCode])
      removeNode(adjacencyLists, key)
    }
  }
}

async function recreateEntities(config) {
  let client;
  let usingExternalConnection = false;

  try {
    if (config.client) {
      client = config.client
      usingExternalConnection = true;
    } else {
      client = new Client({
        user: config.user,
        host: config.host,
        password: config.password,
        database: config.database,
        port: config.port,
        connectionString: config.connectionString
      })

      await client.connect()
      await client.query('START TRANSACTION')
    }

    await syncFiles(client, config)
    if (!usingExternalConnection) {
      await client.query('COMMIT')
    }
  } catch (e) {
    if (!usingExternalConnection) {
      await client.query('ROLLBACK')
    }
    throw e;
  } finally {
    if (!usingExternalConnection) {
      await client.end()
    }
  }
}

module.exports = recreateEntities
