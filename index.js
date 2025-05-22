require('dotenv').config();
const { getPendingMessages, updateMessageStatus, callReturnStatusSendMessage } = require('./db');
const { sendMessageViaZalo } = require('./sender');
const { addToQueue } = require('./queue');
const { getBrowser } = require('./browserManager');
const { getProfiles, crawlUnreadMessages} = require("./crawl")
const axios = require('axios')
const sleep = ms => new Promise(res => setTimeout(res, ms));

async function checkQueue() {
  const messages = await getPendingMessages();

  for (const msg of messages) {
    await updateMessageStatus(msg.id, 'sending');


    addToQueue(async () => {
      let browser;
      try {
        console.log("-- Task - Send to " + msg.zalo_receiver);
        browser = await getBrowser(msg.gpm_id);


        await sendMessageViaZalo(browser, msg);

        await callReturnStatusSendMessage(msg.id, 'done');
      } catch (err) {
        await callReturnStatusSendMessage(msg.id, 'error', err.message);
      } finally {
        // ✅ luôn luôn gọi sau cùng — kể cả lỗi hay không lỗi
        if (browser) {
          try {
            await axios.get(`http://127.0.0.1:19995/api/v3/profiles/close/${msg.gpm_id}`);
            await sleep(5000)
          } catch (closeErr) {
            console.error("⚠️ Không thể đóng profile:", closeErr.message);
          }
        }
      }
    });

  }
}



setInterval(async () => {
  const profiles = await getProfiles();
  for (const profile of profiles) {
    addToQueue(() => crawlUnreadMessages(profile));
  }
}, 5 * 60 * 1000);

(async () => {
  setInterval(() => {
    checkQueue().catch(console.error);
  }, 5000);
})();