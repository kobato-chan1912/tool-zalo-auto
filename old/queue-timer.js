const Queue = require('queue').default;
const chalk = require('chalk'); // để làm màu log cho đẹp
const dayjs = require('dayjs'); // để log thời gian đẹp

const queue = new Queue({
  concurrency: 1,
  autostart: true
});

let taskCount = 0;

function mockTask(id, delay) {
  return () => {
    const startedAt = Date.now();
    console.log(`[${dayjs().format('HH:mm:ss')}] 🎯 ${chalk.blue(`Task ${id}`)} started...`);

    return new Promise((resolve) => {
      setTimeout(() => {
        const duration = ((Date.now() - startedAt) / 1000).toFixed(2);
        console.log(`[${dayjs().format('HH:mm:ss')}] ✅ ${chalk.green(`Task ${id}`)} finished in ${duration}s`);
        resolve();
      }, delay);
    });
  };
}

// Giả lập thêm task mỗi vài giây như queue liên tục nhận job
setInterval(() => {
  taskCount++;
  const delay = Math.floor(Math.random() * 2000) + 1000;
  console.log(`[${dayjs().format('HH:mm:ss')}] 📩 Thêm task ${taskCount} vào hàng đợi`);
  queue.push(mockTask(taskCount, delay));
}, 5000); // cứ 5s thêm task

// Khi toàn bộ queue trống (sau khi xử lý hết)
queue.addEventListener('end', () => {
  console.log(`[${dayjs().format('HH:mm:ss')}] 💤 Queue hiện đang trống, chờ thêm task...`);
});
