/**
 * 交易所集成模块
 * 支持 OKX 和 Hyperliquid
 */

const OKXAdapter = require('./adapters/OKXAdapter');
const HyperliquidAdapter = require('./adapters/HyperliquidAdapter');
const logger = require('../../utils/logger');

class ExchangeManager {
  constructor() {
    this.adapters = {
      okx: OKXAdapter,
      hyperliquid: HyperliquidAdapter
    };
  }

  /**
   * 创建交易所适配器
   */
  createAdapter(exchange, config) {
    if (!this.adapters[exchange]) {
      throw new Error(`Unsupported exchange: ${exchange}`);
    }

    logger.info('Creating exchange adapter', {
      exchange,
      environment: config.environment
    });

    return new this.adapters[exchange](config);
  }

  /**
   * 获取支持的交易所列表
   */
  getSupportedExchanges() {
    return Object.keys(this.adapters);
  }

  /**
   * 验证交易所配置
   */
  validateConfig(exchange, config) {
    switch (exchange) {
      case 'okx':
        return config.apiKey && config.apiSecret && config.passphrase;
      case 'hyperliquid':
        return config.privateKey && config.address;
      default:
        return false;
    }
  }
}

module.exports = new ExchangeManager();
