const fs = require('fs')
const iconv = require('iconv-lite')
const parse = require('csv-parse')

const DEFAULT_PROPS = {
  file: {
    encoding: 'utf-8',
    quote: '',
    delimiter: ',',
    escape: false
  },
  database: {
    columns: null
  },
  import: {
    skipHeader: true,
    sizePerTime: 1000,
    modifyFields: null
  }
}

const setupProps = (group, props) => {
  if (props.hasOwnProperty(group) === false) {
    return props[group] = DEFAULT_PROPS[group]
  }

  Object.keys(DEFAULT_PROPS[group]).forEach(key => {
    if (props[group].hasOwnProperty(key) === false) {
      props[group][key] = DEFAULT_PROPS[group][key]
    }
  })
}

const batch = async (conn, insertStatement, values) => {
  try {
    const { affectedRows } = await conn.batch(insertStatement, values)

    if (values.length === affectedRows) {
      return affectedRows
    } else {
      throw Error(`Data lost while adding data to the table -- Data length to be inserted[${values.length}] -affectedRows[${affectedRows}]`)
    }
  } catch (e) {
    return Promise.reject(e)
  }
}

module.exports = async (conn, props) => {
  try {
    if (!conn) {
      throw Error(`Create connection before batch!`)
    }
    // Setup properties
    setupProps('file', props)
    setupProps('database', props)
    setupProps('import', props)

    const source = fs.createReadStream(props.file.path)
    const decode = iconv.decodeStream(props.file.encoding)
    const parser = parse({ quote: props.file.quote, delimiter: props.file.delimiter })
    // Database
    let insertStatement
    let totalAffectedRows = 0
    let values = []
    // File
    let count = 0
    // Parsing CSV to Array
    for await (let fields of source.pipe(decode).pipe(parser)) {
      // Modify field
      if (typeof props.import.modifyFields === 'function') {
        fields = props.import.modifyFields(fields)
      }
      // Header
      if (++count == 1) {
        let parameterSet
        let columns
        // Set insert statement
        if (Array.isArray(props.database.columns)) {
          parameterSet = new Array(props.database.columns.length).fill('?')
          columns = '(' + props.database.columns.join(', ') + ')'
        } else {
          parameterSet = new Array(fields.length).fill('?')
          columns = ''
        }

        insertStatement = `insert into ${props.database.table} ${columns} values(${parameterSet.join(', ')})`

        console.log(insertStatement)

        if (props.import.skipHeader === true) {
          continue
        }
      }
      // Batch
      if (values.length === props.import.sizePerTime) {
        totalAffectedRows += await batch(conn, insertStatement, values)
        values = []
      }

      values.push(fields)
    }
    // Batch rest values
    if (values.length > 0) {
      totalAffectedRows += await batch(conn, insertStatement, values)
    }

    return {
      totalCount: props.import.skipHeader ? count - 1 : count,
      totalAffectedRows,
      match: true
    }
  } catch (e) {
    return Promise.reject(e)
  }
}
