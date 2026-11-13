import { toTypedSchema } from '@vee-validate/zod';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { getDefaultsForSchema } from 'zod-defaults';

import {
  getBaseRules,
  getDefaultValueInZodStack,
} from '../src/form-render/helper';

describe('patched Zod form compatibility', () => {
  it('keeps defaults and wrapped rule helpers on the existing v3 API', () => {
    const name = z.string().default('fixture').optional();
    expect(getBaseRules(name)).toBeInstanceOf(z.ZodString);
    expect(getDefaultValueInZodStack(name)).toBe('fixture');
    expect(
      getDefaultsForSchema(
        z.object({
          name: z.string().default('fixture'),
          count: z.number().default(3),
          items: z.array(z.string()).default([]),
        }),
      ),
    ).toEqual({ name: 'fixture', count: 3, items: [] });
  });

  it('preserves actual vee-validate defaults, optional values and nested error paths', async () => {
    const schema = toTypedSchema(
      z.object({
        profile: z.object({
          name: z.string().min(1).default('fixture'),
          note: z.string().nullable().optional(),
        }),
      }),
    );
    const normal = await schema.parse({ profile: { note: null } });
    expect(normal.errors).toEqual([]);
    expect(normal.value).toEqual({ profile: { name: 'fixture', note: null } });
    const invalid = await schema.parse({ profile: { name: '' } });
    expect(invalid.errors.map((error) => error.path)).toContain('profile.name');
  });

  it('stops oversized async form arrays before child validation without changing valid input', async () => {
    let visits = 0;
    const schema = toTypedSchema(
      z.object({
        items: z
          .array(
            z.preprocess(async (value) => {
              visits++;
              return value;
            }, z.string()),
          )
          .max(1),
      }),
    );
    const invalid = await schema.parse({ items: ['a', 'b'] });
    expect(invalid.errors.map((error) => error.path)).toEqual(['items']);
    expect(visits).toBe(0);
    const valid = await schema.parse({ items: ['a'] });
    expect(valid.errors).toEqual([]);
    expect(valid.value).toEqual({ items: ['a'] });
    expect(visits).toBe(1);
  });
});
