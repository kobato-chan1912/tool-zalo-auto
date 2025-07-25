
require('dotenv').config();
let sql, pool;

if (process.env.APP === 'dev') {
  sql = require('mssql/msnodesqlv8');

  pool = new sql.ConnectionPool({
    connectionString: process.env.CONNECTION_STRING
  });

} else {
  sql = require('mssql');

  pool = new sql.ConnectionPool(process.env.CONNECTION_STRING);
}


const poolConnect = pool.connect()
  .then(() => console.log('✅ Connected to SQL Server'))
  .catch(err => {
    console.error('❌ Connection failed:', err);
    process.exit(1);
  });


async function createZaloAlias(phone, username) {
  await poolConnect;
  const result = await pool.request()
    .input('phone', phone)
    .input('username', username)
    .query(`
      INSERT INTO ZaloAlias (phone, username)
      VALUES (@phone, @username);
    `);
  return result.rowsAffected[0] > 0; // true nếu insert thành công
}

async function findUsernameByPhone(phone) {
  await poolConnect;
  const result = await pool.request()
    .input('phone', phone)
    .query(`
      SELECT username
      FROM ZaloAlias
      WHERE phone = @phone
    `);
  
  if (result.recordset.length > 0) {
    return result.recordset[0].username; // Có thể là null nếu username null
  } else {
    return null; // Không tìm thấy
  }
}


async function getPendingMessages() {
  await poolConnect;
  const result = await pool.request()
    .query(`
      SELECT * 
      FROM SendMessage 
      WHERE status = '0' 
        AND (timeSend IS NULL OR timeSend <= GETDATE())
    `);
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


async function callReturnStatusSendMessage(id, status, errorMessage = null) {
  await poolConnect;
  const request = pool.request()
    .input('id', sql.Int, id)
    .input('status', sql.NVarChar, status)
    .input('error_message', sql.NVarChar(sql.MAX), errorMessage);

  await request.query(`
    EXEC ReturnStatusSendMessage 
      @id = @id, 
      @status = @status, 
      @error_message = @error_message
  `);
}


async function callReplyZaloMessages(data) {
  await poolConnect;
  const request = pool.request()
    .input('message_id', sql.BigInt, data.message_id)
    .input('sendFrom', sql.NVarChar(255), data.sendFrom || '')
    .input('zalo_receiver', sql.NVarChar(255), data.zalo_receiver || '')
    .input('text', sql.NVarChar(sql.MAX), data.text || '')
    .input('image', sql.NVarChar(sql.MAX), data.image || '')
    .input('file', sql.NVarChar(sql.MAX), data.file || '');


  await request.query(`
    EXEC Replyzalo_messages 
      @message_id = @message_id,
      @sendFrom = @sendFrom,
      @zalo_receiver = @zalo_receiver,
      @text = @text,
      @image = @image,
      @file = @file
  `);
}


module.exports = {
  sql,
  pool,
  poolConnect,
  getPendingMessages,
  updateMessageStatus,
  addCrawlMessage,
  callReturnStatusSendMessage,
  callReplyZaloMessages,
  createZaloAlias,
  findUsernameByPhone
};
