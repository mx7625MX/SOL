/**
 * 服务器主入口
 * 启动 Express 服务器和 WebSocket 服务
 */

import express from 'express';
import cors from 'cors';
import http from 'http';
import WebSocket from 'ws';
import config from './config';
import logger from './utils/logger';
import routes from './routes';
import monitorService from './services/monitor';

// 创建 Express 应用
const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API 路由
app.use('/api', routes);

// 错误处理中间件
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('服务器错误:', err);
  res.status(500).json({
    success: false,
    error: err.message || '服务器内部错误',
  });
});

// 创建 HTTP 服务器
const server = http.createServer(app);

// 创建 WebSocket 服务器
const wss = new WebSocket.Server({ server, path: '/ws' });

// WebSocket 连接处理
wss.on('connection', (ws: WebSocket) => {
  logger.info('WebSocket 客户端已连接');

  // 发送欢迎消息
  ws.send(JSON.stringify({
    type: 'connected',
    message: '已连接到监控服务',
    timestamp: new Date().toISOString(),
  }));

  // 监听监控服务事件并转发给客户端
  const handleEvent = (eventType: string, data: any) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: eventType,
        data,
        timestamp: new Date().toISOString(),
      }));
    }
  };

  // 绑定事件监听器
  monitorService.on('price-updated', (data) => handleEvent('price-updated', data));
  monitorService.on('new-position', (data) => handleEvent('new-position', data));
  monitorService.on('sell-executed', (data) => handleEvent('sell-executed', data));
  monitorService.on('sell-failed', (data) => handleEvent('sell-failed', data));
  monitorService.on('big-buy-detected', (data) => handleEvent('big-buy-detected', data));

  // 处理客户端消息
  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message.toString());
      logger.info('收到客户端消息:', data);

      // 可以在这里处理客户端请求
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
      }
    } catch (error) {
      logger.error('处理 WebSocket 消息失败:', error);
    }
  });

  // 处理断开连接
  ws.on('close', () => {
    logger.info('WebSocket 客户端已断开');
  });

  // 处理错误
  ws.on('error', (error) => {
    logger.error('WebSocket 错误:', error);
  });
});

// 启动服务器
server.listen(config.port, config.host, () => {
  logger.info(`╔════════════════════════════════════════════════╗`);
  logger.info(`║  Solana 监控机器人后端服务已启动               ║`);
  logger.info(`╠════════════════════════════════════════════════╣`);
  logger.info(`║  HTTP 服务:  http://${config.host}:${config.port}           ║`);
  logger.info(`║  WebSocket:  ws://${config.host}:${config.port}/ws         ║`);
  logger.info(`║  RPC 节点:   ${config.rpcEndpoint.substring(0, 30)}... ║`);
  logger.info(`╚════════════════════════════════════════════════╝`);
});

// 优雅关闭
process.on('SIGINT', async () => {
  logger.info('收到 SIGINT 信号，正在关闭服务器...');
  
  await monitorService.stop();
  
  server.close(() => {
    logger.info('服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  logger.info('收到 SIGTERM 信号，正在关闭服务器...');
  
  await monitorService.stop();
  
  server.close(() => {
    logger.info('服务器已关闭');
    process.exit(0);
  });
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的 Promise 拒绝:', reason);
});

export default app;
