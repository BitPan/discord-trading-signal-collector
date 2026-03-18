/**
 * 数据库 Schema 测试
 */

describe('Database Schema', () => {
  const fs = require('fs');
  const path = require('path');

  it('should have schema.sql file', () => {
    const schemaPath = path.join(__dirname, '../../../modules/database/schema.sql');
    expect(fs.existsSync(schemaPath)).toBe(true);
  });

  it('should contain CREATE TABLE statements', () => {
    const schemaPath = path.join(__dirname, '../../../modules/database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    const tables = ['messages', 'signals', 'positions', 'traders', 'events'];
    tables.forEach(table => {
      expect(schema).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    });
  });

  it('should contain CREATE INDEX statements', () => {
    const schemaPath = path.join(__dirname, '../../../modules/database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    expect(schema).toContain('CREATE INDEX');
  });

  it('should contain trigger definitions', () => {
    const schemaPath = path.join(__dirname, '../../../modules/database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    expect(schema).toContain('CREATE TRIGGER');
    expect(schema).toContain('update_updated_at_column');
  });
});
