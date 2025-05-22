const sql = require('mssql/msnodesqlv8');
require('dotenv').config();

const pool = new sql.ConnectionPool({
  connectionString: process.env.CONNECTION_STRING
});

const poolConnect = pool.connect()
  .then(() => console.log('✅ Connected to SQL Server'))
  .catch(err => {
    console.error('❌ Connection failed:', err);
    process.exit(1);
  });

async function getPendingMessages() {
  await poolConnect;
  const result = await pool.request()
    .query("SELECT * FROM SendMessage WHERE status = '0'");
  return result.recordset;
}

async function updateMessageStatus(id, status, errorMessage = null) {
  await poolConnect;
  await pool.request()
    .input('id', sql.Int, id)
    .input('status', sql.NVarChar, status)
    .input('error_message', sql.NVarChar, errorMessage)
    .query(`
      UPDATE SendMessage
      SET status = @status,
          error_message = @error_message
      WHERE id = @id
    `);
}


async function addCrawlMessage(data) {
  await poolConnect;
  await pool.request()
    .input('message_id', sql.NVarChar, data.message_id)
    .input('sendFrom', sql.NVarChar, data.sendFrom)
    .input('zalo_receiver', sql.NVarChar, data.zalo_receiver)
    .input('text', sql.NVarChar, data.text)
    .input('image', sql.NVarChar, data.image)
    .input('file', sql.NVarChar, data.file)
    .query(`
      INSERT INTO zalo_messages (message_id, sendFrom, zalo_receiver, text, image, file)
      VALUES (@message_id, @sendFrom, @zalo_receiver, @text, @image, @file)
    `);
}


module.exports = {
  sql,
  pool,
  poolConnect,
  getPendingMessages,
  updateMessageStatus,
  addCrawlMessage
};
