## Local ที่ใช้ Supabase จริง

รัน `npm run dev:supabase` แล้วเปิด http://localhost:3100 ใช้ค่าจาก `.env.local` และบัญชีผู้ใช้จริง การบันทึกข้อมูลจะเปลี่ยนข้อมูลใน Supabase จริง ต้องหยุดชุดจำลองก่อนเพราะใช้พอร์ตเดียวกัน

## ทดลองหน้าจัดการสิทธิ์บน local

รัน `npm run dev:permissions` เพื่อเปิดเว็บที่ http://localhost:3100 พร้อมข้อมูลจำลอง ไม่เชื่อมฐานข้อมูลจริง ดูบัญชีทดลองและขอบเขตการทำงานใน [คู่มือสิทธิ์](docs/permissions.md)

ทดสอบ: `npm run test:permissions`

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
