/**
 * Parser 模块入口
 */

const messageProcessService = require('./messageProcessService');

class ParserService {
  /**
   * 处理消息
   */
  static async processMessage(message) {
    return messageProcessService.processMessage(message);
  }

  /**
   * 批量处理消息
   */
  static async processMessages(messages) {
    return messageProcessService.processMessages(messages);
  }

  /**
   * 获取统计
   */
  static getStats() {
    return messageProcessService.getStats();
  }
}

module.exports = ParserService;
