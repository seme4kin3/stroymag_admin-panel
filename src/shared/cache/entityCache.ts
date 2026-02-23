import { useSyncExternalStore } from 'react';

export type EntityCacheState<T> = {
  items: T[];
  isLoading: boolean;
  error: string | null;
  loadedAt: number | null;
};

type Listener = () => void;

export type CreateEntityCacheOptions<T> = {
  key: string; // уникальный ключ кэша
  getId: (entity: T) => string;
  fetchList: () => Promise<T[]>;
  ttlMs?: number;
};

export type EntityCacheApi<T> = EntityCacheState<T> & {
  ensureLoaded: (opts?: { force?: boolean }) => Promise<void>;
  reload: () => Promise<void>;
  invalidate: () => void;
  getById: (id: string) => T | undefined;
  setItems: (items: T[]) => void;
  upsert: (entity: T) => void;
  remove: (id: string) => void;
};

type RequiredOptions<T> = Required<CreateEntityCacheOptions<T>>;

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return 'Ошибка загрузки данных';
  }
}

class EntityCache<T> {
  private state: EntityCacheState<T>;
  private byId: Map<string, T>;
  private listeners: Set<Listener>;
  private inFlight: Promise<void> | null;
  private opts: RequiredOptions<T>;

  constructor(opts: RequiredOptions<T>) {
    this.opts = opts;
    this.state = {
      items: [],
      isLoading: false,
      error: null,
      loadedAt: null,
    };
    this.byId = new Map<string, T>();
    this.listeners = new Set<Listener>();
    this.inFlight = null;

    // bind методов, чтобы их можно было передавать как коллбэки
    this.getSnapshot = this.getSnapshot.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.ensureLoaded = this.ensureLoaded.bind(this);
    this.reload = this.reload.bind(this);
    this.invalidate = this.invalidate.bind(this);
    this.getById = this.getById.bind(this);
    this.setItems = this.setItems.bind(this);
    this.upsert = this.upsert.bind(this);
    this.remove = this.remove.bind(this);
  }

  getSnapshot(): EntityCacheState<T> {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    for (const l of this.listeners) l();
  }

  private isFresh(): boolean {
    const loadedAt = this.state.loadedAt;
    if (loadedAt === null) return false;
    return Date.now() - loadedAt < this.opts.ttlMs;
  }

  getById(id: string): T | undefined {
    return this.byId.get(id);
  }

  setItems(items: T[]): void {
    this.byId.clear();
    for (const x of items) {
      this.byId.set(this.opts.getId(x), x);
    }

    this.state = {
      ...this.state,
      items,
      loadedAt: Date.now(),
      isLoading: false,
      error: null,
    };
    this.emit();
  }

  upsert(entity: T): void {
    const id = this.opts.getId(entity);
    this.byId.set(id, entity);

    const items = this.state.items.slice();
    const idx = items.findIndex((x) => this.opts.getId(x) === id);
    if (idx >= 0) items[idx] = entity;
    else items.unshift(entity);

    this.state = { ...this.state, items };
    this.emit();
  }

  remove(id: string): void {
    this.byId.delete(id);
    this.state = {
      ...this.state,
      items: this.state.items.filter((x) => this.opts.getId(x) !== id),
    };
    this.emit();
  }

  invalidate(): void {
    this.state = { ...this.state, loadedAt: null };
    this.emit();
  }

  ensureLoaded(opts?: { force?: boolean }): Promise<void> {
    const force = opts?.force === true;

    if (!force && this.isFresh() && this.state.items.length > 0) {
      return Promise.resolve();
    }

    if (this.inFlight) return this.inFlight;

    this.state = { ...this.state, isLoading: true, error: null };
    this.emit();

    this.inFlight = (async () => {
      try {
        const items = await this.opts.fetchList();
        this.setItems(items);
      } catch (err: unknown) {
        this.state = {
          ...this.state,
          isLoading: false,
          error: toErrorMessage(err),
        };
        this.emit();
      } finally {
        this.inFlight = null;
      }
    })();

    return this.inFlight;
  }

  async reload(): Promise<void> {
    this.invalidate();
    await this.ensureLoaded({ force: true });
  }
}

// Реестр синглтонов без any: храним как unknown
const registry: Map<string, EntityCache<unknown>> = new Map<string, EntityCache<unknown>>();

export function createEntityCache<T>(options: CreateEntityCacheOptions<T>): EntityCache<T> {
  const opts: RequiredOptions<T> = {
    ttlMs: 5 * 60 * 1000,
    ...options,
  };

  const existing = registry.get(opts.key);
  if (existing) {
    return existing as unknown as EntityCache<T>;
  }

  const cache = new EntityCache<T>(opts);
  registry.set(opts.key, cache as unknown as EntityCache<unknown>);
  return cache;
}

export function useEntityCache<T>(cache: EntityCache<T>): EntityCacheApi<T> {
  const snapshot = useSyncExternalStore(cache.subscribe, cache.getSnapshot, cache.getSnapshot);

  return {
    ...snapshot,
    ensureLoaded: cache.ensureLoaded,
    reload: cache.reload,
    invalidate: cache.invalidate,
    getById: cache.getById,
    setItems: cache.setItems,
    upsert: cache.upsert,
    remove: cache.remove,
  };
}
