const Queue = require('queue').default;

// Tạo hàng đợi với chỉ 1 tác vụ chạy cùng lúc (concurrency = 1)
const queue = new Queue({
  concurrency: 1,
  autostart: true
});

// Hàm mô phỏng tác vụ bất đồng bộ
function mockTask(id, delay) {
  return () => {
    return new Promise((resolve) => {
      console.log(`🕒 Bắt đầu task ${id}`);
      setTimeout(() => {
        console.log(`✅ Kết thúc task ${id}`);
        resolve();
      }, delay);
    });
  };
}

// Thêm vài tác vụ vào hàng đợi
queue.push(mockTask(1, 1000));
queue.push(mockTask(2, 500));
queue.push(mockTask(3, 2000));

// Hook khi toàn bộ queue xử lý xong
queue.addEventListener('end', () => {
  console.log('🎉 Tất cả tác vụ đã hoàn thành!');
});
