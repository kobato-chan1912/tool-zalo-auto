import { Zalo } from "zca-js";
import fs from "fs";
import path from "path";
import axios from "axios";
import dotenv from 'dotenv';
dotenv.config();
import { processPendingMessages } from './sendMessages.js';



// Đọc toàn bộ các file cấu hình tài khoản trong thư mục ./accounts
const accountsDir = "./accounts";
const accountFiles = fs.readdirSync(accountsDir).filter(file => file.endsWith(".json"));

const zaloInstances = [];

for (const file of accountFiles) {
    const accountData = JSON.parse(fs.readFileSync(path.join(accountsDir, file), "utf-8"));

    const zalo = new Zalo({
        selfListen: false,
        checkUpdate: true, // nên tắt khi chạy nhiều instance
        logging: true
    });

    const api = await zalo.login({
        cookie: accountData.cookie,
        imei: accountData.imei,
        userAgent: accountData.userAgent
    });



    // Lưu lại instance nếu cần dùng sau
    const instance = { zalo, api, accountData };
    zaloInstances.push(instance);

    console.log(`✅ Đã đăng nhập ${file}`);
    // const instance = { zalo, api, accountData };

    

    
    processPendingMessages(zaloInstances);


    // setInterval(() => {
    // processPendingMessages(zaloInstances);
    // }, 60 * 1000); // mỗi 1 phút




    // Bắt đầu lắng nghe tin nhắn
    api.listener.start();


}
