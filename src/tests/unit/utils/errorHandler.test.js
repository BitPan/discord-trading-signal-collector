/**
 * 错误处理中间件测试
 */

describe('ErrorHandler', () => {
  const { errorHandler, asyncHandler, notFoundHandler } = require('../../../utils/errorHandler');

  it('should export errorHandler function', () => {
    expect(typeof errorHandler).toBe('function');
  });

  it('should export asyncHandler function', () => {
    expect(typeof asyncHandler).toBe('function');
  });

  it('should export notFoundHandler function', () => {
    expect(typeof notFoundHandler).toBe('function');
  });

  it('asyncHandler should wrap async functions', () => {
    const asyncFn = async (req, res) => {
      res.send('ok');
    };

    const wrapped = asyncHandler(asyncFn);
    expect(typeof wrapped).toBe('function');
  });
});
