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
    await sleep(Math.random() * 2000 + 3000);
    await page.click('div-b14[data-translate-inner=STR_CHAT_SEARCH]');
    await sleep(3000);

    const groupItemSelector = '[id^="group-item-"]';
    const contact = await page.$(groupItemSelector);
    if (!contact) throw new Error('Không tìm thấy GROUP!');

    await contact.click();
    await page.waitForSelector("#richInput")
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
