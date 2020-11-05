const fs = require('fs')
const util = require('util')
const mariadb = require('mariadb')
const readline = require('godkimchi-read-line')

module.exports = class {
  constructor ({ file, database }) {
    this.config = arguments[0]
    this.conn = null
    this.lines = 0
    this.affectedRows = 0
    this.values = []
    this.query = undefined
    this.sizePerTime = 3000
    this.eachRow = null
  }

  async execute () {
    try {
      const { host, user, password } = this.config.database
      this.conn = await mariadb.createConnection({ host, user, password })

      const { lineCount } = await readline(this.config.file.path, { type: 'csv', quote: this.config.file.quote, delimiter: this.config.file.delimiter }, async (readlineError, { fields, lineCount }) => {
        if (readlineError) {
          throw readlineError
        }

        const { beforeBatch } = this.config.file

        if (typeof beforeBatch === 'function') {
          beforeBatch(fields)
        }

        if (lineCount === 1) {
          this.query = `insert into ${this.config.database.table} values (${new Array(fields.length).fill('?').join(', ')})`
          return true
        }

        this.values.push(fields)

        if (this.values.length >= this.sizePerTime) {
          // batch
          const { affectedRows } = await this.conn.batch(this.query, this.values)
          this.affectedRows += affectedRows
          this.values = []
        }

        return true
      })

      if (this.values.length >= 0) {
        // batch
        const { affectedRows } = await this.conn.batch(this.query, this.values)
        this.affectedRows += affectedRows
      }

      return { totalLines: lineCount - 1, totalAffectedRows: this.affectedRows }
    } catch (e) {
      return Promise.reject(e)
    }
  }
}
