/**
 * 智能信号解析器
 * 优先从文本解析，只在必要时使用 OCR
 */

const logger = require('../../utils/logger');
const ocrService = require('../ocr/ocrService');

class SmartSignalParser {
  /**
   * 解析消息 - 智能路由
   */
  async parseMessage(message) {
    logger.info('Smart parsing message', {
      messageId: message.id,
      hasText: !!message.content,
      hasImages: message.attachments && message.attachments.length > 0,
      textLength: message.content ? message.content.length : 0
    });

    const signals = [];

    // 【策略】：优先从文本解析，只在文本信号不足时使用 OCR

    // Step 1: 尝试从文本解析
    if (message.content) {
      const textSignals = this.parseText(message.content);
      signals.push(...textSignals);

      logger.info('Text parsing result', {
        signalsFound: textSignals.length,
        messageId: message.id
      });
    }

    // Step 2: 如果文本没找到信号，才尝试 OCR 识别图片
    if (signals.length === 0 && message.attachments && message.attachments.length > 0) {
      logger.info('No signals from text, trying OCR on images...', {
        imageCount: message.attachments.length
      });

      const imageSignals = await this.parseImages(message.attachments);
      signals.push(...imageSignals);
    }

    // Step 3: 处理 embeds（Button、Embed 等 Discord 组件）
    if (message.embeds && message.embeds.length > 0) {
      const embedSignals = await this.parseEmbeds(message.embeds);
      signals.push(...embedSignals);
    }

    logger.info('Message parsing completed', {
      messageId: message.id,
      totalSignals: signals.length,
      methods: signals.map(s => s.type).join(', ')
    });

    return signals;
  }

  /**
   * 从文本解析信号
   * 支持多种格式，精确匹配
   */
  parseText(content) {
    const signals = [];

    // 格式 1: OPEN/CLOSE/LONG/SHORT BTC 45000 0.5
    const directRegex = /\b(OPEN|CLOSE|LONG|SHORT|BUY|SELL)\s+([A-Z]{2,})\s+([\d.]+)\s+([\d.]+)?/gi;
    let match;
    while ((match = directRegex.exec(content)) !== null) {
      const signal = {
        type: 'direct_command',
        action: match[1].toLowerCase().includes('close') || match[1].toLowerCase().includes('sell') ? 'close' : 'open',
        symbol: this.normalizeSymbol(match[2]),
        entry: parseFloat(match[3]),
        size: match[4] ? parseFloat(match[4]) : null,
        direction: match[1].toLowerCase().includes('short') || match[1].toLowerCase().includes('sell') ? 'SELL' : 'BUY'
      };
      signals.push(signal);
    }

    // 格式 2: Tao limit 228 218 stop 205
    const limitMatch = content.match(
      /([A-Z]{2,})\s+limit\s+([\d.]+)\s+([\d.]+)\s+stop\s+([\d.]+)/i
    );
    if (limitMatch) {
      const [, symbol, entry, tp, sl] = limitMatch;
      signals.push({
        type: 'limit_order',
        action: 'open',
        symbol: this.normalizeSymbol(symbol),
        entry: parseFloat(entry),
        takeProfit: parseFloat(tp),
        stopLoss: parseFloat(sl),
        direction: 'BUY',
        source: 'eli_trading_signal'
      });
    }

    // 格式 3: LIMIT TAO | Entry: 228 - 218 | SL: 205
    const limitTaoMatch = content.match(
      /(?:LIMIT\s+)?([A-Z]{2,})\s*\|\s*Entry:\s*([\d.]+)\s*[-–—]\s*([\d.]+)\s*\|\s*SL:\s*([\d.]+)/i
    );
    if (limitTaoMatch) {
      const [, symbol, entry, tp, sl] = limitTaoMatch;
      signals.push({
        type: 'structured_limit',
        action: 'open',
        symbol: this.normalizeSymbol(symbol),
        entry: parseFloat(entry),
        takeProfit: parseFloat(tp),
        stopLoss: parseFloat(sl),
        direction: 'BUY',
        source: 'eli_structured_format'
      });
    }

    return signals;
  }

  /**
   * 从图片解析 - 仅在需要时调用
   */
  async parseImages(attachments) {
    const signals = [];

    for (const attachment of attachments) {
      try {
        // 只处理图片
        if (!attachment.contentType || !attachment.contentType.startsWith('image/')) {
          continue;
        }

        logger.info('OCR processing image', {
          fileName: attachment.name,
          size: attachment.size,
          url: attachment.url.substring(0, 50) + '...'
        });

        // 使用 OCR 识别
        const result = await ocrService.processImage(attachment.url);

        if (result.success && result.tradeInfo.symbols.length > 0) {
          const { symbols, entry, stop, takeProfit } = result.tradeInfo;

          symbols.forEach(symbol => {
            signals.push({
              type: 'ocr_image',
              action: 'open',
              symbol: this.normalizeSymbol(symbol),
              entry: entry,
              stopLoss: stop,
              takeProfit: takeProfit,
              direction: 'BUY',
              source: 'image_ocr',
              ocrConfidence: result.confidence || 'unknown'
            });
          });

          logger.info('OCR successful', {
            fileName: attachment.name,
            symbolsFound: symbols,
            confidence: result.confidence
          });
        } else {
          logger.warn('OCR found no trade info', {
            fileName: attachment.name,
            error: result.error
          });
        }
      } catch (error) {
        logger.error('OCR processing failed', {
          fileName: attachment.name,
          error: error.message
        });
      }
    }

    return signals;
  }

  /**
   * 从 embeds 解析
   */
  async parseEmbeds(embeds) {
    const signals = [];

    for (const embed of embeds) {
      try {
        const embedText = [
          embed.title,
          embed.description,
          embed.fields?.map(f => `${f.name}: ${f.value}`).join('\n')
        ].filter(Boolean).join('\n');

        if (embedText) {
          const textSignals = this.parseText(embedText);
          signals.push(...textSignals);
        }
      } catch (error) {
        logger.error('Embed parsing failed', { error: error.message });
      }
    }

    return signals;
  }

  /**
   * 规范化符号格式
   */
  normalizeSymbol(symbol) {
    const upper = symbol.toUpperCase();
    if (!upper.includes('USD')) {
      return upper + 'USD';
    }
    return upper;
  }

  /**
   * 验证信号完整性
   */
  validateSignal(signal) {
    return signal.action && signal.symbol && signal.entry !== null && !isNaN(signal.entry);
  }

  /**
   * 格式化信号用于数据库存储
   */
  formatSignal(signal, trader, messageId) {
    return {
      type: signal.type,
      trader: trader,
      symbol: signal.symbol,
      action: signal.action,
      direction: signal.direction,
      entry: signal.entry,
      size: signal.size || null,
      tp: signal.takeProfit || null,
      sl: signal.stopLoss || null,
      source: signal.source || 'unknown',
      message_id: messageId,
      confidence: signal.ocrConfidence || 'high'
    };
  }
}

module.exports = new SmartSignalParser();
