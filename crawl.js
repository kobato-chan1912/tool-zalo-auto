require('dotenv').config();
const { callReplyZaloMessages } = require('./db');
const { sendMessageViaZalo } = require('./sender');
const { addToQueue } = require('./queue');
const { getBrowser } = require('./browserManager');
const axios = require('axios')
const sleep = ms => new Promise(res => setTimeout(res, ms));
const path = require('path')
const fs = require('fs')

async function getProfiles() {
    const res = await axios.get("http://127.0.0.1:19995/api/v3/profiles");
    return res.data.data; // danh sách profiles
}





async function crawlUnreadMessages(profile) {

    console.log("-- Task: Crawl message for Profile " + profile.name)


    try {
        const browser = await getBrowser(profile.id);
        const page = await browser.newPage();
        page.setDefaultTimeout(60000);
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

        // 1. Tìm các hội thoại có tin chưa đọc
        await page.waitForSelector('#contact-search')
        await sleep(4000)
        const unreadConvs = await page.$$(".conv-action__unread-v2");

        for (const conv of unreadConvs) {


            // 1. Lấy số lượng tin chưa đọc (số lượng icon .fa-2_24_Line)
            const unreadCount = await page.evaluate((convEl) => {
                const unread = convEl.querySelector("i");
                if (!unread) return 0;

                const content = getComputedStyle(unread, "::after").content.replace(/['"]/g, "");
                const hex = content.codePointAt(0).toString(16);
                const match = hex.match(/ea([0-9a-fA-F]{2})/);
                if (match) {
                    const hex = match[1];
                    const value = parseInt(hex, 16);
                    return value - 4; // vì ea05 là 1, ea06 là 2, v.v...
                }

                return 0;
            }, conv);





            // 2. Click vào hội thoại
            await conv.click();
            await sleep(3000); // chờ load nội dung
            const sendFrom = await page.$eval(`div-b18`, el => el.textContent).catch(() => null);



            // 4. Lấy các message gần nhất theo selector id = bb_msg_id_xxx
            const msgIds = await page.$$eval('[id^="bb_msg_id_"]', (els, unreadCount) =>
                els.slice(-unreadCount).map(el => el.id.replace("bb_msg_id_", ""))
                , unreadCount); // <-- truyền biến vào page.$$eval


            for (const msgId of msgIds) {
                const msgSelector = `#bb_msg_id_${msgId}`;
                const text = await page.$eval(`${msgSelector} .text`, el => el.textContent).catch(() => null);

                // Image
                const base64Image = await page.$eval(`${msgSelector} .zimg-el`, async (img) => {
                    const response = await fetch(img.src);
                    const buffer = await response.arrayBuffer();
                    // convert buffer to base64 string
                    return btoa(
                        new Uint8Array(buffer)
                            .reduce((data, byte) => data + String.fromCharCode(byte), "")
                    );
                }).catch(error => {
                    return null;
                });


                let imagePath = null;
                const downloadFolder = process.env.DOWNLOAD_PATH


                if (base64Image) {
                    // Step 2: write file in Node.js context
                    imagePath = path.resolve(downloadFolder, `image_${Date.now()}.jpg`);
                    const buffer = Buffer.from(base64Image, "base64");
                    fs.writeFileSync(imagePath, buffer);
                }


                // File
                const fileName = await page.$eval(`${msgSelector} .file-message__content-title`, el => el.textContent).catch(() => null);
                let filePath = null;
                if (fileName) {
                    filePath = path.resolve(downloadFolder, fileName);
                    await page.click(`${msgSelector} .download`);
                    await sleep(30000)
                    // Optionally wait or move file after downloaded
                }

                // Lưu DB
                const data = ({
                    message_id: msgId,
                    sendFrom: sendFrom, // xác định cách lấy nếu được
                    zalo_receiver: profile.name,
                    text,
                    image: imagePath,
                    file: filePath
                });


                await callReplyZaloMessages(data)



            }

            await sleep(5000); // chờ trước khi chuyển hội thoại tiếp theo
        }

        await page.close();

    } catch (error) {
        if (!error.message.includes("BigInt")) {
            console.error(`❌ Error crawling profile ${profile.name}:`, error.message);
        }


    } finally {
        await axios.get(`http://127.0.0.1:19995/api/v3/profiles/close/${profile.id}`);
        await sleep(5000)
    }


}


// (async () => {
//     const profiles = await getProfiles();
//     for (const profile of profiles) {
//         addToQueue(() => crawlUnreadMessages(profile));
//     }
// })();


module.exports = { getProfiles, crawlUnreadMessages }