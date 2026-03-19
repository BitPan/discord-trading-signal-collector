/**
 * OCR 服务 - 用于识别图片中的交易信号
 */

const Tesseract = require('tesseract.js');
const logger = require('../../utils/logger');

class OCRService {
  /**
   * 识别图片中的文本
   */
  async recognizeText(imageUrl) {
    try {
      logger.info('Starting OCR recognition', { imageUrl });

      const result = await Tesseract.recognize(
        imageUrl,
        'eng',
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              const progress = (m.progress * 100).toFixed(0);
              logger.debug('OCR progress', { progress: progress + '%' });
            }
          }
        }
      );

      const text = result.data.text;
      logger.info('OCR recognition completed', {
        textLength: text.length
      });

      return text;
    } catch (error) {
      logger.error('OCR recognition failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 提取交易信息
   */
  extractTradeInfo(text) {
    const info = {
      symbols: [],
      entry: null,
      stop: null,
      takeProfit: null,
      raw: text.substring(0, 200)
    };

    // 常见代币列表
    const knownSymbols = [
      'LIMIT TAO', 'TAO', 'BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE',
      'ARB', 'OP', 'MATIC', 'AVAX', 'LINK', 'UNI', 'AAVE', 'GMX',
      'PEPE', 'SHIB', 'RENDER', 'SUI', 'SEI', 'WIF', 'JTO', 'JUMP',
      'BEAM', 'GRASS', 'FARTCOIN', 'MEME', 'VIRTUAL'
    ];

    // 提取代币名字
    knownSymbols.forEach(symbol => {
      const regex = new RegExp('\\b' + symbol + '\\b', 'gi');
      if (regex.test(text)) {
        if (!info.symbols.includes(symbol.toUpperCase())) {
          info.symbols.push(symbol.toUpperCase());
        }
      }
    });

    // 提取价格范围 (Entry: 228 - 218 or 228 218)
    const entryMatch = text.match(/(?:Entry|ENTRY)[\s:]*(\d+\.?\d*)/i);
    if (entryMatch) {
      info.entry = parseFloat(entryMatch[1]);
    }

    // 提取 SL (Stop Loss)
    const slMatch = text.match(/(?:SL|Stop|STOP)[\s:]*(\d+\.?\d*)/i);
    if (slMatch) {
      info.stop = parseFloat(slMatch[1]);
    }

    // 如果没找到，尝试提取数字序列
    if (!info.entry && !info.stop) {
      const numbers = text.match(/\d+\.?\d*/g);
      if (numbers && numbers.length >= 2) {
        info.entry = parseFloat(numbers[0]);
        if (numbers.length >= 3) {
          info.takeProfit = parseFloat(numbers[1]);
          info.stop = parseFloat(numbers[2]);
        } else {
          info.stop = parseFloat(numbers[1]);
        }
      }
    }

    return info;
  }

  /**
   * 处理图片
   */
  async processImage(imageUrl) {
    try {
      logger.info('Processing image for OCR', { url: imageUrl });

      // OCR 识别
      const text = await this.recognizeText(imageUrl);

      // 提取信息
      const tradeInfo = this.extractTradeInfo(text);

      logger.info('Image processing completed', {
        symbols: tradeInfo.symbols,
        entry: tradeInfo.entry,
        stop: tradeInfo.stop
      });

      return {
        success: true,
        text: text,
        tradeInfo: tradeInfo
      };
    } catch (error) {
      logger.error('Image processing failed', {
        error: error.message
      });
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new OCRService();
