# mariadb-csv-to-db

Bulk insert csv file to table, focused on convenience rather than performance.

### Quick Example
```javascript
const mariadb = require('mariadb')
const batch = require('mariadb-csv-to-db')

process.nextTick(async () => {
  let conn

  try {
    // Property for CSV to Database
    const props = {
      file: {
        path: 'Your csv file path',
        encoding: 'utf-8',
        quote: '',
        delimiter: ','
      },
      database: {
        table: 'test.WOW'
      },
      import: {
        skipHeader: true,
        sizePerTime: 1000,
        modifyFields: fields => fields.splice(0, 1)
      }
    }
    // Databse connection
    conn = await mariadb.createConnection({ host: 'HolyHost', user: 'Kimchi', password: '????' })

    await conn.beginTransaction()
    console.log(await batch(conn, props)) // { totalCount: 1000, totalAffectedRows: 1000, match: true }
    await conn.commit()
  } catch (e) {
    await conn.rollback()
    console.error(e)
  } finally {
    if (conn) {
      await conn.end()
    }

    process.exit()
  }
})
```

### Flow
1. Access your csv file
2. Decoding your csv file
3. Parsing your csv record → fields(array) using props(quote, delimiter, escape)
4. Modifying your fields
5-a. Set parameter if props.database.columns is array
5-b. Set parameter using header (modified fields) if props.database.columns is null
6. Skip header ? then not pushing header into values(array)
7. Pushing your fields to values until values.length < sizePerTime
8. Batch values  
*if values.length !== affetcedRows(batch insert result) ? then throw Error
9. [7]~[8] loop
10. Batch rest values
11. Return total file line count and total affected row count (match always true because [8])

### batch(conn, props)  
`conn` object(required), mariadb connection  
`props` object  
&nbsp;&nbsp;&nbsp;&nbsp;`file` object  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`path` string(required), csv file path  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`encoding` string, file encoding, default `utf-8`  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`quote` string, csv quote, default `(empty string)`  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`delimiter` string, csv delimiter, default `,`  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`escape` string, csv escape, default `false`  
&nbsp;&nbsp;&nbsp;&nbsp;`database` object  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`table` string(required), target table name  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`columns` array, column names, default `null`  
&nbsp;&nbsp;&nbsp;&nbsp;`import` object  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`skipHeader` boolean, first line of the file is excluded from the batch, default `true`  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`sizePerTime` number, number of rows inserted per time, default `1000`  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`modifyFields` function, fields => return fields, modifying fields, must return fields, default `null`  

### Another Example
```javascript
const mariadb = require('mariadb')
const batch = require('mariadb-csv-to-db')

process.nextTick(async () => {
  let conn

  try {
    // Property for CSV to Database
    const props = {
      file: {
        path: 'Your csv file path',
        encoding: 'utf-8',
        quote: '',
        delimiter: ','
      },
      database: {
        table: 'test.WOW',
        // if columns: null ? insert into table values (?, ?)
        // if columns array ? insert into table (columns.join(',')) values (?, ?)
        columns: ['`a`', '`b`']
      },
      import: {
        skipHeader: true,
        sizePerTime: 1000,
        modifyFields: fields => [fields[0], fields[1]] // returned fields length must be equal to the props.database.columns length
      }
    }
    // Databse connection
    conn = await mariadb.createConnection({ host: 'HolyHost', user: 'Kimchi', password: '????' })

    await conn.beginTransaction()
    console.log(await batch(conn, props)) // { totalCount: 1000, totalAffectedRows: 1000, match: true }
    await conn.commit()
  } catch (e) {
    await conn.rollback()
    console.error(e)
  } finally {
    if (conn) {
      await conn.end()
    }

    process.exit()
  }
})
```

