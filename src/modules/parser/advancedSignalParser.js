/**
 * 高级信号解析器
 * 支持：
 * 1. 直接命令格式 (OPEN BTC 45000 0.5)
 * 2. 限价单格式 (Tao limit 228 218 stop 205)
 * 3. 图片识别 (OCR)
 */

const logger = require('../../utils/logger');
const ocrService = require('../ocr/ocrService');

class AdvancedSignalParser {
  /**
   * 解析消息 - 主入口
   */
  async parseMessage(message) {
    logger.info('Parsing message', {
      messageId: message.id,
      hasAttachments: message.attachments && message.attachments.length > 0,
      hasEmbeds: message.embeds && message.embeds.length > 0
    });

    const signals = [];

    // 1. 先尝试从文本解析
    if (message.content) {
      const textSignals = this.parseText(message.content);
      signals.push(...textSignals);
    }

    // 2. 然后处理图片（OCR）
    if (message.attachments && message.attachments.length > 0) {
      const imageSignals = await this.parseImages(message.attachments);
      signals.push(...imageSignals);
    }

    // 3. 处理 embeds
    if (message.embeds && message.embeds.length > 0) {
      const embedSignals = await this.parseEmbeds(message.embeds);
      signals.push(...embedSignals);
    }

    logger.info('Message parsing completed', {
      messageId: message.id,
      signalsFound: signals.length
    });

    return signals;
  }

  /**
   * 从文本解析信号
   */
  parseText(content) {
    const signals = [];

    // 格式 1: OPEN/CLOSE/LONG/SHORT BTC 45000 0.5
    const directRegex = /\b(OPEN|CLOSE|LONG|SHORT|BUY|SELL)\s+([A-Z]{2,})\s+([\d.]+)\s+([\d.]+)?/gi;
    let match;
    while ((match = directRegex.exec(content)) !== null) {
      const action = match[1].toLowerCase();
      let symbol = match[2].toUpperCase();
      const entry = parseFloat(match[3]);
      const size = match[4] ? parseFloat(match[4]) : null;

      // 确保符号格式
      if (!symbol.includes('USD')) {
        symbol = symbol + 'USD';
      }

      signals.push({
        type: 'direct_command',
        action: action.includes('close') || action.includes('sell') ? 'close' : 'open',
        symbol: symbol,
        entry: entry,
        size: size,
        direction: action.includes('short') || action.includes('sell') ? 'SELL' : 'BUY'
      });
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
        symbol: (symbol.toUpperCase().includes('USD') ? symbol : symbol + 'USD').toUpperCase(),
        entry: parseFloat(entry),
        takeProfit: parseFloat(tp),
        stopLoss: parseFloat(sl),
        direction: 'BUY'
      });
    }

    // 格式 3: LIMIT TAO | Entry: 228 - 218 | SL: 205
    const limitTaoMatch = content.match(
      /(?:LIMIT\s+)?([A-Z]{2,})\s*\|\s*Entry:\s*([\d.]+)\s*[-–—]\s*([\d.]+)\s*\|\s*SL:\s*([\d.]+)/i
    );

    if (limitTaoMatch) {
      const [, symbol, entry, tp, sl] = limitTaoMatch;
      signals.push({
        type: 'limit_order',
        action: 'open',
        symbol: (symbol.toUpperCase().includes('USD') ? symbol : symbol + 'USD').toUpperCase(),
        entry: parseFloat(entry),
        takeProfit: parseFloat(tp),
        stopLoss: parseFloat(sl),
        direction: 'BUY'
      });
    }

    return signals;
  }

  /**
   * 从图片解析信号（OCR）
   */
  async parseImages(attachments) {
    const signals = [];

    for (const attachment of attachments) {
      try {
        if (!attachment.contentType || !attachment.contentType.startsWith('image/')) {
          continue;
        }

        logger.info('Processing image attachment', {
          fileName: attachment.name,
          url: attachment.url
        });

        // 使用 OCR 识别
        const result = await ocrService.processImage(attachment.url);

        if (result.success && result.tradeInfo.symbols.length > 0) {
          const { symbols, entry, stop, takeProfit } = result.tradeInfo;

          symbols.forEach(symbol => {
            signals.push({
              type: 'ocr_image',
              action: 'open',
              symbol: symbol.includes('USD') ? symbol : symbol + 'USD',
              entry: entry,
              stopLoss: stop,
              takeProfit: takeProfit,
              direction: 'BUY',
              ocrText: result.text.substring(0, 100)
            });
          });

          logger.info('Image OCR completed', {
            fileName: attachment.name,
            symbolsFound: symbols
          });
        }
      } catch (error) {
        logger.error('Failed to process image', {
          fileName: attachment.name,
          error: error.message
        });
      }
    }

    return signals;
  }

  /**
   * 从 embeds 解析信号
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
        logger.error('Failed to parse embed', {
          error: error.message
        });
      }
    }

    return signals;
  }
}

module.exports = new AdvancedSignalParser();
