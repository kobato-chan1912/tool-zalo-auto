import { Zalo } from "zca-js";
import fs from "fs";
import path from "path";
import axios from "axios";
import dotenv from 'dotenv';
dotenv.config();
import { callReplyZaloMessages } from './db.js';



// Đọc toàn bộ các file cấu hình tài khoản trong thư mục ./accounts
const accountsDir = "./accounts";
const accountFiles = fs.readdirSync(accountsDir).filter(file => file.endsWith(".json"));

const zaloInstances = [];

for (const file of accountFiles) {
    const accountData = JSON.parse(fs.readFileSync(path.join(accountsDir, file), "utf-8"));

    const zalo = new Zalo({
        selfListen: true,
        checkUpdate: false, // nên tắt khi chạy nhiều instance
        logging: true
    });

    const api = await zalo.login({
        cookie: accountData.cookie,
        imei: accountData.imei,
        userAgent: accountData.userAgent
    });



    // Lưu lại instance nếu cần dùng sau
    zaloInstances.push({ zalo, api });

    console.log(`✅ Đã đăng nhập ${file}`);

    api.listener.on("message", async (msg) => {
        try {

            console.log(msg)
            let type = msg.constructor.name;
            const msgData = msg.data;
            let msgId = msgData.msgId;
            let sender = msgData.dName;
            let content = msgData.content;
            let sendFrom = null;
            if (type === "UserMessage") {
                sendFrom = msgData.dName;
            }

            if (type === "GroupMessage") {
                // get info 
                let groupInfo = await api.getGroupInfo(msg.threadId);
                const group = groupInfo.gridInfoMap?.[msg.threadId];
                sendFrom = group.name;
            }


            let imagePath = null;
            let filePath = null;

            if (msgData["content"]?.["href"]) {
                const fileUrl = msgData["content"]["href"];
                const downloadDir = process.env.DOWNLOAD_PATH || "./downloads";
                content = msgData["content"]["description"] || null;

                // Tạo thư mục nếu chưa có
                if (!fs.existsSync(downloadDir)) {
                    fs.mkdirSync(downloadDir, { recursive: true });
                }

                // Kiểm tra xem URL có chứa định dạng ảnh không
                const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];
                const urlPath = new URL(fileUrl).pathname;
                const ext = path.extname(urlPath).toLowerCase();

                let fileName;
                if (imageExtensions.includes(ext)) {
                    // Là ảnh → dùng tên file từ URL
                    fileName = path.basename(urlPath);
                } else {
                    // Không phải ảnh → dùng title làm tên file
                    const title = msgData["content"]["title"];
                    fileName = title ? title.replace(/[\\/:"*?<>|]+/g, "_") : "default_filename.bin"; // sanitize tên file
                }

                const fullPath = path.join(downloadDir, fileName);

                // Tải file về
                const writer = fs.createWriteStream(fullPath);
                const response = await axios.get(fileUrl, { responseType: "stream" });
                response.data.pipe(writer);

                await new Promise((resolve, reject) => {
                    writer.on("finish", resolve);
                    writer.on("error", reject);
                });

                // Phân loại ảnh / file
                if (imageExtensions.includes(ext)) {
                    imagePath = fullPath;
                } else {
                    filePath = fullPath;
                }

                console.log(`[✔] Đã tải về: ${fullPath}`);
            }



            const replyData = ({
                message_id: msgId,
                sender: sender,
                sendFrom: sendFrom, // xác định cách lấy nếu được
                zalo_receiver: accountData.name,
                text: content,
                image: imagePath,
                file: filePath
            });

            await callReplyZaloMessages(replyData)

            console.log(`[✔] Saved message ${msg.data.msgId}`);

        } catch (err) {
            // console.error("[✘] Gửi message lỗi:", err.message);
            // log chi tiết lỗi
            console.error(err);
        }
    });










    // Bắt đầu lắng nghe tin nhắn
    api.listener.start();


}
