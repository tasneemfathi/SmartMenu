# صورة Docker لتشغيل منصة ذكاء المنيو على Render
FROM node:20-alpine

WORKDIR /app

# تثبيت الاعتماديات أولاً للاستفادة من طبقات الكاش
COPY package*.json ./
RUN npm install --omit=dev

# نسخ بقية الملفات
COPY . .

ENV NODE_ENV=production

# Render يحقن متغيّر PORT تلقائياً؛ التطبيق يقرأه من process.env.PORT
EXPOSE 3000

CMD ["npm", "start"]

