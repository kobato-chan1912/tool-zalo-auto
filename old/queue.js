const Queue = require('queue').default;
const queue = new Queue({ concurrency: 1, autostart: true }); // Xử lý từng job một

function addToQueue(task) {
    queue.push(task);
}

module.exports = { addToQueue };
