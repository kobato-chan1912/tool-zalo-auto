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
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    message_id BIGINT NOT NULL,
    sendFrom VARCHAR(255) NOT NULL,
    zalo_receiver VARCHAR(255) NOT NULL,
    text NVARCHAR(MAX) NULL,
    image NVARCHAR(MAX) NULL,
    [file] NVARCHAR(MAX) NULL
);

CREATE PROCEDURE [dbo].[ReturnStatusSendMessage]
    @id INT, -- Bắt buộc
    @status NVARCHAR(10), 
    @error_message NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE SendMessage 
    SET status  = @status,
	error_message = @error_message
    WHERE id  = @id
END

CREATE PROCEDURE [dbo].[Replyzalo_messages]
    @message_id BIGINT,
    @sendFrom VARCHAR(255),
    @zalo_receiver VARCHAR(255),
    @text TEXT,
    @image TEXT,
    @file TEXT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO zalo_messages(
	[message_id],
	[sendFrom], 
	[zalo_receiver], 
	[text],
    [image],
    [file])
	VALUES(
	@message_id,
	@sendFrom, 
	@zalo_receiver, 
	@text,
    @image,
    @file)

END