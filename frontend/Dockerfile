# pi-dashboard/frontend/Dockerfile の正しい例

# --- ビルドステージ ---
FROM node:22-alpine AS builder
WORKDIR /app

# パッケージリストをコピーしてインストール
COPY package*.json ./
RUN npm install

# ソースコードをコピーしてビルド
COPY . .
RUN npm run build

# --- 実行ステージ (Nginx) ---
FROM nginx:alpine
# ビルドしたReactのファイルをNginxの公開フォルダにコピー
# ※ Viteの場合は 'dist'、Create React Appの場合は 'build' になります
COPY --from=builder /app/dist /usr/share/nginx/html

# (オプション) カスタムNginx設定がある場合はここでコピー
# COPY default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]