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
    .input('sendTo', sql.NVarChar, data.sendTo)
    .input('zalo_receiver', sql.NVarChar, data.zalo_receiver)
    .input('text', sql.NVarChar, data.text)
    .input('image', sql.NVarChar, data.image)
    .input('file', sql.NVarChar, data.file)
    .query(`
      INSERT INTO zalo_messages (message_id, sendTo, zalo_receiver, text, image, file)
      VALUES (@message_id, @sendTo, @zalo_receiver, @text, @image, @file)
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
    .input('sender', sql.NVarChar(255), data.sender || '')
    .input('sender_id', sql.NVarChar(255), data.sender || '')
    .input('sendTo', sql.NVarChar(255), data.sendTo || '')
    .input('sendTo_id', sql.NVarChar(255), data.sendTo_id || '')
    .input('zalo_receiver', sql.NVarChar(255), data.zalo_receiver || '')
    .input('text', sql.NVarChar(sql.MAX), data.text || '')
    .input('image', sql.NVarChar(sql.MAX), data.image || '')
    .input('file', sql.NVarChar(sql.MAX), data.file || '');


  await request.query(`
    EXEC Replyzalo_messages 
      @message_id = @message_id,
      @sender = @sender,
      @sender_id = @sender_id,
      @sendTo = @sendTo,
      @sendTo_id = @sendTo_id,
      @zalo_receiver = @zalo_receiver,
      @text = @text,
      @image = @image,
      @file = @file
  `);
}

async function findAliasByPhone(phone) {
  await poolConnect;
  const result = await pool.request()
    .input('phone', sql.VarChar, phone)
    .query('SELECT * FROM ZaloAlias WHERE phone = @phone');
  return result.recordset[0];
}

async function findAliasByUid(uid) {
  await poolConnect;
  const result = await pool.request()
    .input('uid', sql.VarChar, uid)
    .query('SELECT * FROM ZaloAlias WHERE uid = @uid');
  return result.recordset[0];
}



async function insertAlias(phone, uid, zaloName) {
  await poolConnect;
  return await pool.request()
    .input('phone', sql.VarChar, phone)
    .input('uid', sql.VarChar, uid)
    .input('zaloName', sql.NVarChar, zaloName)
    .query(`
      INSERT INTO ZaloAlias (phone, uid, zaloName)
      VALUES (@phone, @uid, @zaloName)
    `);
}

async function getPendingMessagesForIMEI(imei) {
  await poolConnect;
  const result = await pool.request()
    .input('imei', sql.VarChar, imei)
    .query(`
      SELECT * 
      FROM SendMessage 
      WHERE status = '0' 
        AND (timeSend IS NULL OR timeSend <= GETDATE())
        AND (imei = @imei)
    `);
  return result.recordset;
}


module.exports = {
  sql,
  pool,
  poolConnect,
  updateMessageStatus,
  addCrawlMessage,
  callReturnStatusSendMessage,
  callReplyZaloMessages,
  findAliasByPhone,
  findAliasByUid,
  insertAlias,
  getPendingMessagesForIMEI


};
