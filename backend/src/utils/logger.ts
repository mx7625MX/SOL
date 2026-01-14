/**
 * 日志工具
 * 使用 Winston 进行日志记录
 */

import winston from 'winston';
import config from '../config';
import path from 'path';
import fs from 'fs';

// 确保日志目录存在
const logDir = path.dirname(config.logFile);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 自定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (stack) {
      log += `\n${stack}`;
    }
    return log;
  })
);

// 创建 logger 实例
export const logger = winston.createLogger({
  level: config.logLevel,
  format: logFormat,
  transports: [
    // 控制台输出（带颜色）
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      ),
    }),
    // 文件输出
    new winston.transports.File({
      filename: config.logFile,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
  ],
});

export default logger;
