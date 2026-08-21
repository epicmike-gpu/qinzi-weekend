// Vercel Serverless 入口：捕获所有 /api/* 请求并交给 Express 应用处理
import { app } from '../server/src/app.js';

export default app;

export const config = {
  // 允许较大的请求体与较长执行时间
  maxDuration: 30,
};
