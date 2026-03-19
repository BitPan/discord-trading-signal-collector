/**
 * OKX API Adapter
 * 
 * OKX (欧易) 是全球领先的加密交易所
 * 支持现货、合约、期权交易
 * 
 * API 文档：https://www.okx.com/docs/en/#trading
 */

const crypto = require('crypto');
const axios = require('axios');
const logger = require('../../../utils/logger');

class OKXAdapter {
  constructor(config = {}) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.passphrase = config.passphrase;  // OKX 特定认证参数
    
    // 环境：live 或 sandbox
    this.environment = config.environment || 'sandbox';
    this.baseUrl = this.environment === 'sandbox'
      ? 'https://aws.okx.com'
      : 'https://www.okx.com';
    
    // API 版本
    this.apiVersion = 'v5';
    
    logger.info('OKXAdapter initialized', {
      environment: this.environment
    });
  }

  /**
   * 生成 OKX API 签名
   */
  _generateSignature(timestamp, method, requestPath, body = '') {
    const message = timestamp + method + requestPath + body;
    const signature = crypto
      .createHmac('sha256', this.apiSecret)
      .update(message)
      .digest('base64');
    return signature;
  }

  /**
   * 构建请求头
   */
  _buildHeaders(method, requestPath, body = '') {
    const timestamp = new Date().toISOString();
    const signature = this._generateSignature(timestamp, method, requestPath, body);

    return {
      'OK-ACCESS-KEY': this.apiKey,
      'OK-ACCESS-SIGN': signature,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': this.passphrase,
      'Content-Type': 'application/json'
    };
  }

  /**
   * 获取账户余额
   */
  async getAccountBalance() {
    try {
      const method = 'GET';
      const requestPath = `/api/${this.apiVersion}/account/balance`;
      const headers = this._buildHeaders(method, requestPath);

      const response = await axios.get(`${this.baseUrl}${requestPath}`, {
        headers
      });

      logger.info('OKX account balance fetched', {
        totalEq: response.data.data[0].totalEq
      });

      return {
        totalValue: parseFloat(response.data.data[0].totalEq),
        marginUsed: parseFloat(response.data.data[0].isoEq),
        marginAvailable: parseFloat(response.data.data[0].totalEq) - parseFloat(response.data.data[0].isoEq),
        currency: 'USD'
      };

    } catch (error) {
      logger.error('Failed to get OKX account balance', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 获取当前仓位
   */
  async getPositions(instType = 'FUTURES') {
    try {
      const method = 'GET';
      const requestPath = `/api/${this.apiVersion}/account/positions?instType=${instType}`;
      const headers = this._buildHeaders(method, requestPath);

      const response = await axios.get(`${this.baseUrl}${requestPath}`, {
        headers
      });

      logger.info('OKX positions fetched', {
        count: response.data.data.length
      });

      return response.data.data.map(pos => ({
        id: pos.posId,
        symbol: pos.instId,
        side: pos.posSide,  // 'long' or 'short'
        size: parseFloat(pos.pos),
        entry: parseFloat(pos.avgPx),
        leverage: parseFloat(pos.lever),
        markPrice: parseFloat(pos.markPx),
        pnl: parseFloat(pos.upl),
        pnlPercent: parseFloat(pos.uplRatio) * 100
      }));

    } catch (error) {
      logger.error('Failed to get OKX positions', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 下单
   */
  async placeOrder(params) {
    try {
      const {
        symbol,        // e.g., "BTC-USDT-SWAP"
        side,          // "buy" or "sell"
        size,
        type = 'market', // "market" or "limit"
        price = null,
        leverage = 1
      } = params;

      const method = 'POST';
      const requestPath = `/api/${this.apiVersion}/trade/order`;

      const body = {
        instId: symbol,
        tdMode: 'cross',  // 全仓模式
        side: side,
        ordType: type,
        sz: size.toString(),
        px: price ? price.toString() : undefined
      };

      // 移除 undefined 字段
      Object.keys(body).forEach(key => body[key] === undefined && delete body[key]);

      const bodyStr = JSON.stringify(body);
      const headers = this._buildHeaders(method, requestPath, bodyStr);

      const response = await axios.post(`${this.baseUrl}${requestPath}`, body, {
        headers
      });

      logger.info('Order placed on OKX', {
        orderId: response.data.data[0].ordId,
        symbol,
        side,
        size
      });

      return {
        orderId: response.data.data[0].ordId,
        symbol,
        side,
        size,
        type,
        price,
        status: 'pending'
      };

    } catch (error) {
      logger.error('Failed to place OKX order', {
        error: error.message,
        params
      });
      throw error;
    }
  }

  /**
   * 平仓
   */
  async closePosition(symbol, side) {
    try {
      const method = 'POST';
      const requestPath = `/api/${this.apiVersion}/trade/close-position`;

      const body = {
        instId: symbol,
        posSide: side,  // 'long' or 'short'
        mgnMode: 'cross'
      };

      const bodyStr = JSON.stringify(body);
      const headers = this._buildHeaders(method, requestPath, bodyStr);

      const response = await axios.post(`${this.baseUrl}${requestPath}`, body, {
        headers
      });

      logger.info('Position closed on OKX', {
        symbol,
        side
      });

      return {
        orderId: response.data.data[0].ordId,
        symbol,
        status: 'pending'
      };

    } catch (error) {
      logger.error('Failed to close OKX position', {
        error: error.message,
        symbol
      });
      throw error;
    }
  }

  /**
   * 获取订单状态
   */
  async getOrderStatus(orderId, symbol) {
    try {
      const method = 'GET';
      const requestPath = `/api/${this.apiVersion}/trade/orders-pending?instId=${symbol}`;
      const headers = this._buildHeaders(method, requestPath);

      const response = await axios.get(`${this.baseUrl}${requestPath}`, {
        headers
      });

      const order = response.data.data.find(o => o.ordId === orderId);

      if (!order) {
        return null;
      }

      return {
        orderId: order.ordId,
        status: order.state,  // 'live', 'partially_filled', 'filled'
        filled: parseFloat(order.filledSz),
        remaining: parseFloat(order.sz) - parseFloat(order.filledSz)
      };

    } catch (error) {
      logger.error('Failed to get OKX order status', {
        error: error.message,
        orderId
      });
      throw error;
    }
  }

  /**
   * 更新 TP/SL
   */
  async updateTPSL(symbol, tp, sl) {
    try {
      const method = 'POST';
      const requestPath = `/api/${this.apiVersion}/trade/set-tp-sl`;

      const body = {
        instId: symbol,
        tpTriggerPx: tp ? tp.toString() : undefined,
        slTriggerPx: sl ? sl.toString() : undefined,
        tpOrdPx: tp ? (tp * 0.99).toString() : undefined,  // TP 平仓价
        slOrdPx: sl ? (sl * 1.01).toString() : undefined   // SL 平仓价
      };

      // 移除 undefined 字段
      Object.keys(body).forEach(key => body[key] === undefined && delete body[key]);

      const bodyStr = JSON.stringify(body);
      const headers = this._buildHeaders(method, requestPath, bodyStr);

      const response = await axios.post(`${this.baseUrl}${requestPath}`, body, {
        headers
      });

      logger.info('TP/SL updated on OKX', {
        symbol,
        tp,
        sl
      });

      return {
        symbol,
        tp,
        sl,
        status: 'success'
      };

    } catch (error) {
      logger.error('Failed to update OKX TP/SL', {
        error: error.message,
        symbol
      });
      throw error;
    }
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      const method = 'GET';
      const requestPath = `/api/${this.apiVersion}/account/balance`;
      const headers = this._buildHeaders(method, requestPath);

      await axios.get(`${this.baseUrl}${requestPath}`, { headers });

      return {
        status: 'ok',
        exchange: 'okx',
        environment: this.environment
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }
}

module.exports = OKXAdapter;
