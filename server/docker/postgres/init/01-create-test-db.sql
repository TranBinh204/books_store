-- Chỉ chạy MỘT lần khi volume PostgreSQL được tạo lần đầu.
-- Tạo DB riêng cho Jest để test không ảnh hưởng dữ liệu thật.
CREATE DATABASE bookstore_test OWNER bookstore;
