/**
 * 直接命令解析器
 * 识别格式：OPEN SYMBOL PRICE SIZE 或 CLOSE SYMBOL
 * 例：OPEN BTCUSD 45000 0.5
 */

const logger = require('../../utils/logger');

class DirectCommandParser {
  constructor() {
    // 匹配模式：ACTION SYMBOL [PRICE] [SIZE] [TP/SL...]
    this.openPattern = /^(OPEN|BUY|LONG)\s+([A-Z0-9]+)\s+([0-9.]+)\s+([0-9.]+)/i;
    this.closePattern = /^(CLOSE|SELL|EXIT)\s+([A-Z0-9]+)/i;
    this.tpPattern = /TP\s*[:=]?\s*([0-9.,\s]+)/i;
    this.slPattern = /SL\s*[:=]?\s*([0-9.,\s]+)/i;
  }

  /**
   * 解析消息
   */
  parse(content) {
    if (!content || typeof content !== 'string') {
      return null;
    }

    const text = content.trim().toUpperCase();

    // 尝试匹配 OPEN 命令
    const openMatch = text.match(this.openPattern);
    if (openMatch) {
      return this.parseOpenCommand(text, openMatch);
    }

    // 尝试匹配 CLOSE 命令
    const closeMatch = text.match(this.closePattern);
    if (closeMatch) {
      return this.parseCloseCommand(text, closeMatch);
    }

    return null;
  }

  /**
   * 解析 OPEN 命令
   */
  parseOpenCommand(text, match) {
    const [, action, symbol, entryStr, sizeStr] = match;

    try {
      const entry = parseFloat(entryStr);
      const size = parseFloat(sizeStr);

      if (!entry || !size || entry <= 0 || size <= 0) {
        return null;
      }

      const signal = {
        type: 'direct_command',
        action: 'open',
        symbol: symbol.toUpperCase(),
        entry: entry,
        size: size,
        direction: action === 'SHORT' ? 'SELL' : 'BUY',
        tp: this.extractPrices(text, this.tpPattern),
        sl: this.extractPrices(text, this.slPattern),
        confidence: 1.0,
        raw_data: {
          original_text: text,
          matched_pattern: 'open',
        },
      };

      logger.debug('Direct OPEN command parsed', {
        symbol: signal.symbol,
        entry: signal.entry,
        size: signal.size,
      });

      return signal;
    } catch (error) {
      logger.debug('Failed to parse OPEN command', {
        error: error.message,
      });
      return null;
    }
  }

  /**
   * 解析 CLOSE 命令
   */
  parseCloseCommand(text, match) {
    const [, action, symbol] = match;

    try {
      const signal = {
        type: 'direct_command',
        action: 'close',
        symbol: symbol.toUpperCase(),
        direction: action === 'SELL' ? 'SELL' : 'BUY',
        confidence: 1.0,
        raw_data: {
          original_text: text,
          matched_pattern: 'close',
        },
      };

      logger.debug('Direct CLOSE command parsed', {
        symbol: signal.symbol,
      });

      return signal;
    } catch (error) {
      logger.debug('Failed to parse CLOSE command', {
        error: error.message,
      });
      return null;
    }
  }

  /**
   * 提取价格列表（TP/SL）
   */
  extractPrices(text, pattern) {
    const match = text.match(pattern);
    if (!match || !match[1]) {
      return [];
    }

    return match[1]
      .split(/[,\s]+/)
      .map(p => parseFloat(p.trim()))
      .filter(p => !isNaN(p) && p > 0);
  }

  /**
   * 检查是否是命令
   */
  isCommand(content) {
    return this.parse(content) !== null;
  }
}

module.exports = new DirectCommandParser();
