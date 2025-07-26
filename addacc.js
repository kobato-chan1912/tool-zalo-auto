const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ask = (query) => new Promise(resolve => rl.question(query, resolve));

(async () => {
  try {
    console.log('-- Nhập dữ liệu từ phần phần Zalo Extractor Data --');
    const name = await ask('Nhập Zalo Username: ');
    const imei = await ask('Nhập IMEI: ');
    const cookieRaw = await ask('Nhập Cookies (JSON): ');
    const userAgent = await ask('Nhập User-Agent: ');

    let cookies;
    try {
      cookies = JSON.parse(cookieRaw);
      if (!Array.isArray(cookies)) throw new Error('Cookies không phải mảng!');
    } catch (err) {
      console.error('❌ Lỗi: Cookies phải là một JSON mảng hợp lệ!');
      rl.close();
      return;
    }

    const data = {
      name,
      imei,
      cookie: cookies,
      userAgent
    };

    const folderPath = path.join(__dirname, 'accounts');
    const filePath = path.join(folderPath, `${imei}.json`);

    // Tạo thư mục nếu chưa tồn tại
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf-8');
    console.log(`\n\n ✅ Đã thêm acc mới: ${imei}`);
  } catch (err) {
    console.error('Đã xảy ra lỗi:', err.message);
  } finally {
    rl.close();
  }
})();
