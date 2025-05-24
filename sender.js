const fs = require('fs');
const path = require('path');
const sleep = ms => new Promise(res => setTimeout(res, ms));
const axios = require('axios')
const mime = require('mime-types');


async function clearInput(page, selector) {
  await page.focus(selector);
  await page.keyboard.down('Control');
  await page.keyboard.press('A');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');

}


function isValidVietnamPhoneNumber(phone) {
  // Xoá khoảng trắng và ký tự không phải số
  phone = phone.replace(/[^0-9]/g, '');

  // Kiểm tra theo các đầu số di động phổ biến tại Việt Nam
  const regex = /^(0|\+84)(3[2-9]|5[6|8|9]|7[0|6-9]|8[1-5]|9[0-9])[0-9]{7}$/;

  return regex.test(phone);
}


async function dropFileToInput(page, filePath, dropSelector = '#richInput') {
  const fileName = path.basename(filePath);
  const fileMime = mime.lookup(filePath) || 'application/octet-stream';
  const fileBuffer = fs.readFileSync(filePath);

  await page.evaluateHandle(async (selector, name, mimeType, bufferBase64) => {
    const dropTarget = document.querySelector(selector);
    if (!dropTarget) throw new Error("Không tìm thấy vùng drop file!");

    const binary = atob(bufferBase64);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }

    const file = new File([array], name, { type: mimeType });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    const event = new DragEvent('drop', {
      dataTransfer,
      bubbles: true,
      cancelable: true
    });

    dropTarget.dispatchEvent(event);
  }, dropSelector, fileName, fileMime, fileBuffer.toString('base64'));
}



async function sendMessageViaZalo(browser, message) {
  const page = await browser.newPage();
  await page.setDefaultTimeout(60000);
  await page.goto('https://chat.zalo.me/', { waitUntil: 'networkidle2' });
  await sleep(5000)
  const hasPopup = await page.evaluate(() => {
    return !!document.querySelector('.zl-modal__dialog');
  });

  if (hasPopup) {
    console.log("⚠️ Detected popup, reloading page...");
    await sleep(1000); // đợi nhẹ để popup hiện rõ
    await page.goto('https://chat.zalo.me/', { waitUntil: 'networkidle2' });
  }
  await page.waitForSelector('#contact-search')
  await sleep(4000)


  try {
    await page.type("#contact-search-input", message.zalo_receiver, { delay: 100 });
    await sleep(5000);


    const groupItemSelector = '[id^="group-item-"]';
    const contact = await page.$(groupItemSelector);

    const userItemSelector = '[id^="friend-item-"]';
    const friend = await page.$(userItemSelector);

    if (!contact && !friend) throw new Error('Không tìm thấy Info!');

    await page.keyboard.press('Enter');
    await sleep(5000)

    // kiem tra message.zalo_receiver co phai la so dien thoai hay khong
    // neu la so dien thoai thi check tiep cai nguoi nhan, neu nguoi nhan ko phai sdt thi bum

    const sendFrom = await page.$eval(`div-b18`, el => el.textContent).catch(() => null);
    if (isValidVietnamPhoneNumber(message.zalo_receiver) && (!isValidVietnamPhoneNumber(sendFrom))) {
      await page.evaluate(() => {
        const el = document.querySelector('.edit-icon');
        if (el) el.click();
      });

      await sleep(3000)
      await clearInput(page, ".zl-input")
      await page.type(".zl-input", message.zalo_receiver, { delay: 100 })
      await sleep(3000)
      await page.keyboard.press('Enter');
      await sleep(3000)
    }


    await page.type('#richInput', message.content || '', { delay: 100 });
    await page.keyboard.press('Enter');
    await sleep(3000)


    if (message.attachment_path) {
      const filePath = path.resolve(message.attachment_path);
      await dropFileToInput(page, filePath);
      await sleep(10000); // đợi file preview hiện
    }




    // lay tin nhan dap lai 
    const msgIds = await page.$$eval('[id^="bb_msg_id_"]', (els, unreadCount) =>
      els.slice(-unreadCount).map(el => el.id.replace("bb_msg_id_", ""))
      , 1); // <-- truyền biến vào page.$$eval
    const msgId = msgIds[0]
    const msgSelector = `#bb_msg_id_${msgId}`;
    const text = await page.$eval(`${msgSelector} .text`, el => el.textContent).catch(() => null);
    if (text !== null && text.includes("chưa thể gửi tin nhắn đến người này")) {

      throw new Error("Người nhận không nhận tin nhắn từ người lạ!");

    }

  } catch (err) {
    throw err;
  } finally {
    await sleep(5000)
    await page.close();
  }
}

module.exports = { sendMessageViaZalo };
