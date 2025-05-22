const fs = require('fs');
const path = require('path');
const sleep = ms => new Promise(res => setTimeout(res, ms));
const axios = require('axios')
const mime = require('mime-types');

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

    await keyboard.press("ENTER")
    await sleep(5000)

    if (message.attachment_path) {
      const filePath = path.resolve(message.attachment_path);
      await dropFileToInput(page, filePath);
      await sleep(10000); // đợi file preview hiện
    }


    await page.type('#richInput', message.content || '', { delay: 100 });
    await page.keyboard.press('Enter');
    await sleep(5000)
  } catch (err) {
    throw err;
  } finally {
    await page.close();
  }
}

module.exports = { sendMessageViaZalo };
