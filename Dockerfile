# Sử dụng base image từ node
FROM node

# Tạo thư mục làm việc
WORKDIR /usr/src/app

# Cài đặt các dependencies
COPY package*.json ./
RUN npm install

# Sao chép tất cả các source code vào trong image
COPY . .

# Build ứng dụng
RUN npm run build

# Mở cổng 3000
EXPOSE 3000

# Lệnh để chạy ứng dụng
CMD ["npm", "run", "start:prod"]