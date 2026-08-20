/**
 * Mock factories for Supabase and the Edge-Function API layer.
 * Import these inside jest.mock factories in test files.
 */

import type { Session } from '@supabase/supabase-js';

/* eslint-disable @typescript-eslint/no-explicit-any */

export type AnyRow = Record<string, any>;

export function createApiMock() {
  return {
    apiCall: jest.fn(async (): Promise<{ data: any; error: any }> => ({ data: null, error: null })),
    apiUploadFile: jest.fn(async (): Promise<{ data: any; error: any }> => ({ data: null, error: null })),
    fetchFileArrayBuffer: jest.fn(async () => new ArrayBuffer(8)),
    ErrorCodes: {
      INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS',
      NOT_FOUND: 'NOT_FOUND',
      UNAUTHORIZED: 'UNAUTHORIZED',
      RATE_LIMITED: 'RATE_LIMITED',
      VALIDATION_ERROR: 'VALIDATION_ERROR',
      INTERNAL_ERROR: 'INTERNAL_ERROR',
    },
  };
}

export function createSupabaseMock(initialTables: Record<string, AnyRow[]> = {}) {
  const tables: Record<string, AnyRow[]> = {};
  Object.entries(initialTables).forEach(([name, rows]) => {
    tables[name] = JSON.parse(JSON.stringify(rows));
  });

  const queryBuilders: any[] = [];

  const createQuery = (table: string, seedRows?: AnyRow[]) => {
    let rows: AnyRow[] = seedRows ? [...seedRows] : [...(tables[table] ?? [])];
    const builder: any = {};

    builder.select = jest.fn(function () {
      return this;
    });
    builder.eq = jest.fn(function (col: string, val: any) {
      rows = rows.filter((r) => r[col] === val);
      return this;
    });
    builder.neq = jest.fn(function () {
      return this;
    });
    builder.in = jest.fn(function (col: string, vals: any[]) {
      rows = rows.filter((r) => vals.includes(r[col]));
      return this;
    });
    builder.like = jest.fn(function () {
      return this;
    });
    builder.ilike = jest.fn(function () {
      return this;
    });
    builder.gte = jest.fn(function () {
      return this;
    });
    builder.lte = jest.fn(function () {
      return this;
    });
    builder.gt = jest.fn(function () {
      return this;
    });
    builder.lt = jest.fn(function () {
      return this;
    });
    builder.is = jest.fn(function () {
      return this;
    });
    builder.contains = jest.fn(function () {
      return this;
    });
    builder.containedBy = jest.fn(function () {
      return this;
    });
    builder.overlaps = jest.fn(function () {
      return this;
    });
    builder.order = jest.fn(function (col: string, opts?: { ascending?: boolean }) {
      const asc = opts?.ascending !== false;
      rows = [...rows].sort((a, b) => {
        const va = a[col];
        const vb = b[col];
        if (va == null) return 1;
        if (vb == null) return -1;
        if (va < vb) return asc ? -1 : 1;
        if (va > vb) return asc ? 1 : -1;
        return 0;
      });
      return this;
    });
    builder.limit = jest.fn(function (n: number) {
      rows = rows.slice(0, n);
      return this;
    });
    builder.range = jest.fn(function () {
      return this;
    });
    builder.single = jest.fn(async () => ({
      data: rows[0] ?? null,
      error:
        rows.length === 0
          ? { message: 'No rows found', details: '', hint: '', code: 'PGRST116' }
          : null,
    }));
    builder.maybeSingle = jest.fn(async () => ({ data: rows[0] ?? null, error: null }));
    builder.insert = jest.fn((values: any) => {
      const arr = Array.isArray(values) ? values : [values];
      tables[table] = [...(tables[table] ?? []), ...arr];
      return createQuery(table, arr);
    });
    builder.upsert = jest.fn((values: any) => {
      const arr = Array.isArray(values) ? values : [values];
      tables[table] = [...(tables[table] ?? []), ...arr];
      return createQuery(table, arr);
    });
    builder.update = jest.fn((values: any) => {
      return createQuery(table, rows);
    });
    builder.delete = jest.fn(() => {
      return createQuery(table, rows);
    });
    builder.returns = jest.fn(function () {
      return this;
    });
    builder.throwOnError = jest.fn(function () {
      return this;
    });
    // Supabase query builders are thenables — some code awaits the builder
    // directly (e.g. useRecentActivitiesQuery awaits Promise.all of builders).
    builder.then = (resolve: (v: any) => void) => {
      resolve({ data: rows, error: null });
    };

    builder._rows = () => rows;
    builder._setRows = (newRows: AnyRow[]) => {
      rows = [...newRows];
    };

    queryBuilders.push(builder);
    return builder;
  };

  const channelBuilder: any = {
    _listeners: [],
    _emitters: [],
    on: jest.fn(function (type: string, cfg: any, cb?: any) {
      this._listeners.push({ type, cfg, cb: typeof cfg === 'function' ? cfg : cb });
      return this;
    }),
    subscribe: jest.fn(async () => ({ status: 'SUBSCRIBED' })),
    unsubscribe: jest.fn(),
    send: jest.fn(async () => ({ error: null })),
    _emit: (event: string, payload?: any) => {
      channelBuilder._listeners.forEach((l: any) => {
        if (l.type === event) {
          l.cb(payload);
        } else if (l.type === 'broadcast' && (!l.cfg || !l.cfg.event || l.cfg.event === event)) {
          l.cb(payload);
        } else if (l.type === 'postgres_changes') {
          // postgres_changes listeners fire on DB events; only fire if matching event
        }
      });
    },
    _clearListeners: () => {
      channelBuilder._listeners = [];
    },
  };

  const supabase: any = {
    auth: {
      getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
      getUser: jest.fn(async () => ({ data: { user: null }, error: null })),
      getSessionForExternalAuth: jest.fn(async () => ({ data: { session: null }, error: null })),
      onAuthStateChange: jest.fn((cb: any) => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      signInWithPassword: jest.fn(async () => ({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      })),
      signUp: jest.fn(async () => ({
        data: { user: null, session: null },
        error: { message: 'User already registered' },
      })),
      signOut: jest.fn(async () => ({ error: null })),
      signInWithOAuth: jest.fn(async () => ({
        data: { url: 'https://mock.supabase.co/auth/v1/authorize', provider: 'google' },
        error: null,
      })),
      exchangeCodeForSession: jest.fn(async () => ({ data: { session: null }, error: null })),
      refreshSession: jest.fn(async () => ({ data: { session: null }, error: null })),
      updateUser: jest.fn(async (attrs: any) => ({
        data: { user: { id: 'test-user-id', email: 'test@example.com', user_metadata: attrs?.data ?? {} } },
        error: null,
      })),
      resetPasswordForEmail: jest.fn(async () => ({ data: {}, error: null })),
      linkIdentity: jest.fn(async () => ({ data: {}, error: null })),
      unlinkIdentity: jest.fn(async () => ({ data: {}, error: null })),
      getUserIdentities: jest.fn(async () => ({ data: { identities: [] }, error: null })),
      getLinksForCurrentUser: jest.fn(async () => ({ data: [], error: null })),
      signInWithIdToken: jest.fn(async () => ({ data: { user: null, session: null }, error: null })),
    },
    from: jest.fn((table: string) => createQuery(table)),
    channel: jest.fn(() => channelBuilder),
    removeChannel: jest.fn(),
    getChannels: jest.fn(() => []),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(async () => ({
          data: { path: 'mock/path', id: 'mock-id', fullPath: 'mock/path' },
          error: null,
        })),
        getPublicUrl: jest.fn(() => ({
          data: { publicUrl: 'https://mock.supabase.co/storage/v1/object/public/mock' },
        })),
        download: jest.fn(async () => ({
          data: new Blob(['mock'], { type: 'text/plain' } as any),
          error: null,
        })),
        remove: jest.fn(async () => ({ data: {}, error: null })),
        list: jest.fn(async () => ({ data: [], error: null })),
        createSignedUrl: jest.fn(async () => ({
          data: { signedUrl: 'https://mock/signed' },
          error: null,
        })),
        createSignedUrls: jest.fn(async () => ({ data: [], error: null })),
      })),
    },
    rpc: jest.fn(async () => ({ data: null, error: null })),
    functions: {
      invoke: jest.fn(async () => ({ data: {}, error: null })),
    },
    realtime: {
      channel: jest.fn(() => channelBuilder),
      removeChannel: jest.fn(),
    },
    postgrest: {},
    rest: {},
  };

  const initialTablesSnapshot = JSON.parse(JSON.stringify(initialTables));

  function reset() {
    supabase.from.mockClear();
    supabase.channel.mockClear();
    supabase.removeChannel.mockClear();
    supabase.getChannels.mockClear();
    supabase.rpc.mockClear();
    supabase.storage.from.mockClear();
    supabase.functions.invoke.mockClear();
    Object.keys(supabase.auth).forEach((key) => {
      if (typeof supabase.auth[key]?.mockClear === 'function') supabase.auth[key].mockClear();
    });
    channelBuilder._listeners = [];
    queryBuilders.length = 0;
    // restore initial table data
    Object.keys(tables).forEach((k) => delete tables[k]);
    Object.assign(tables, JSON.parse(JSON.stringify(initialTablesSnapshot)));
  }

  return { supabase, tables, channelBuilder, queryBuilders, reset };
}

export type SupabaseMock = ReturnType<typeof createSupabaseMock>;

/** Builds a fake session object usable across tests. */
export function buildSession(overrides: Record<string, any> = {}): Session {
  return {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: 'test-user-id',
      aud: 'authenticated',
      email: 'test@example.com',
      app_metadata: { provider: 'email' },
      user_metadata: {
        first_name: 'Test',
        last_name: 'User',
        onboarding_completed: true,
        ...(overrides.user_metadata ?? {}),
      },
      identities: [],
      created_at: new Date().toISOString(),
      ...overrides.user,
    },
    ...overrides,
  } as unknown as Session;
}
