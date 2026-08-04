import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('GET /api/health', () => {
  it('responds with the documented success or error shape', async () => {
    const res = await request(createApp()).get('/api/health');
    expect([200, 503]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ok');
    } else {
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    }
  });
});
