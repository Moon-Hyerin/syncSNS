This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## 📋 환경 설정

### 1. 환경변수 설정

`.env.local` 파일을 생성하고 다음과 같이 설정하세요:

```bash
# Instagram API 설정
INSTAGRAM_CLIENT_ID=your_instagram_client_id
INSTAGRAM_CLIENT_SECRET=your_instagram_client_secret

# 앱 URL 설정 (ngrok 사용 시)
NEXT_PUBLIC_APP_URL=https://your-ngrok-subdomain.ngrok.io

# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Instagram OAuth를 위한 HTTPS 설정 (ngrok 사용)

Instagram OAuth는 HTTPS가 필수입니다. 로컬 개발 시 ngrok을 사용하세요:

```bash
# 1. ngrok 설치
npm install -g ngrok

# 2. Next.js 개발 서버 실행
npm run dev

# 3. 새 터미널에서 ngrok 터널 생성
ngrok http 3000
```

ngrok이 제공하는 HTTPS URL을 `.env.local`의 `NEXT_PUBLIC_APP_URL`에 설정하세요.

### 3. Instagram 앱 설정

Instagram 개발자 콘솔에서 다음 URL을 Valid OAuth Redirect URIs에 추가하세요:
```
https://your-ngrok-subdomain.ngrok.io/api/auth/instagram/callback
```

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

Open [https://your-ngrok-subdomain.ngrok.io](https://your-ngrok-subdomain.ngrok.io) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
