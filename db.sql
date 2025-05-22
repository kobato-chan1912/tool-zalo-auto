CREATE TABLE SendMessage (
    id INT IDENTITY(1,1) PRIMARY KEY,
    gpm_id VARCHAR(50) NOT NULL,
    status NVARCHAR(10) DEFAULT '0', -- 0 | sending | done | error
    zalo_receiver NVARCHAR(255) NOT NULL,
    content NVARCHAR(MAX),
    attachment_path NVARCHAR(1000), -- Đường dẫn file ảnh/zip/... nếu có
    error_message NVARCHAR(MAX), -- Ghi chú lỗi nếu có
);


CREATE TABLE zalo_messages (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    message_id BIGINT NOT NULL,
    sendFrom VARCHAR(255) NOT NULL,
    zalo_receiver VARCHAR(255) NOT NULL,
    text TEXT NULL,
    image TEXT NULL,
    file TEXT NULL,
);
