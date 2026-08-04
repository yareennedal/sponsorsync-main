import { describe, expect, it } from 'vitest';
import { createUserSchema, listUsersQuerySchema } from '../src/validators/userValidators.js';

// Regression: the client sends every filter on every request, so unset filters
// arrive as ''. The original `z.enum([...]).optional()` rejected '', which meant
// GET /api/users returned 400 on every page load.
describe('listUsersQuerySchema', () => {
  it('accepts the params the client sends when no filter is set', () => {
    const parsed = listUsersQuerySchema.parse({
      page: '1',
      pageSize: '20',
      search: '',
      role: '',
      status: '',
    });
    expect(parsed).toMatchObject({ page: 1, pageSize: 20 });
    expect(parsed.search).toBeUndefined();
    expect(parsed.role).toBeUndefined();
    expect(parsed.status).toBeUndefined();
  });

  it('accepts the disabled status the client sends', () => {
    expect(listUsersQuerySchema.parse({ status: 'disabled' }).status).toBe('disabled');
    expect(listUsersQuerySchema.parse({ status: 'active' }).status).toBe('active');
  });

  it('still rejects a status outside the vocabulary', () => {
    expect(listUsersQuerySchema.safeParse({ status: 'inactive' }).success).toBe(false);
  });

  it('trims search and rejects an over-long one', () => {
    expect(listUsersQuerySchema.parse({ search: '  ali  ' }).search).toBe('ali');
    expect(listUsersQuerySchema.safeParse({ search: 'a'.repeat(101) }).success).toBe(false);
  });
});

describe('createUserSchema', () => {
  const base = { fullName: 'Test User', email: 'test@example.com', role: 'MEMBER' };

  it('enforces the same password policy as self-service password changes', () => {
    expect(createUserSchema.safeParse({ ...base, temporaryPassword: 'a' }).success).toBe(false);
    expect(createUserSchema.safeParse({ ...base, temporaryPassword: 'alllowercase' }).success).toBe(
      false,
    );
    expect(createUserSchema.safeParse({ ...base, temporaryPassword: 'Password123!' }).success).toBe(
      true,
    );
  });
});
