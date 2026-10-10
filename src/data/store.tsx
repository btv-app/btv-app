import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { sampleEvents } from '@/data/sample-events';
import {
  COUNTY_CENTER,
  DEFAULT_CATEGORIES,
  DEFAULT_TOWNS,
  type BtvEvent,
  type Category,
  type EventStatus,
  type Role,
  type Town,
  type TownInfo,
} from '@/data/types';
import { base64ToBytes } from '@/lib/base64';
import { geocodeTown } from '@/lib/geocode';
import { supabase } from '@/lib/supabase';

/*
 * App state. With Supabase configured (see .env), events, saved events, submissions and
 * sign-in live in the database. Without it, the app runs on sample data with a demo sign-in,
 * so it still works for design reviews.
 */

/** A photo picked from the camera roll, not uploaded yet. */
export type Flyer = { uri: string; base64: string; width: number; height: number };

export type NewEvent = Pick<
  BtvEvent,
  'title' | 'town' | 'venue' | 'address' | 'date' | 'time' | 'categories' | 'description' | 'isFree' | 'price' | 'link' | 'latitude' | 'longitude'
> & {
  /** 24-hour "HH:MM" */
  startTime: string;
  endTime: string | null;
  /** A new photo, 'keep' for the flyer the event already has (when editing), or null for none. */
  flyer: Flyer | 'keep' | null;
};

const FLYER_BUCKET = 'flyers';

/** Every async action resolves to an error message for the person, or null on success. */
type Result = Promise<string | null>;

type Store = {
  backend: 'supabase' | 'demo';
  loading: boolean;
  loadError: string | null;
  role: Role;
  displayName: string;
  email: string | null;
  events: BtvEvent[];
  approved: BtvEvent[];
  pending: BtvEvent[];
  mySubmissions: BtvEvent[];
  savedIds: Set<string>;
  /** Categories people can pick, in display order. The owner can change them. */
  categories: Category[];
  /** Towns people can pick, in display order. The owner can change them. */
  towns: TownInfo[];
  /** A town's center, or the middle of the county for a town that's no longer listed. */
  townCenter: (town: Town) => { latitude: number; longitude: number };
  demoSignIn: (role: Exclude<Role, 'guest'>) => void;
  sendCode: (email: string) => Result;
  verifyCode: (email: string, code: string) => Result;
  signOut: () => void;
  toggleSaved: (id: string) => void;
  submitEvent: (event: NewEvent) => Result;
  review: (id: string, decision: 'approved' | 'declined') => Result;
  /** Owner only. */
  updateEvent: (id: string, event: NewEvent) => Result;
  setCancelled: (id: string, cancelled: boolean) => Result;
  deleteEvent: (id: string) => Result;
  addCategory: (name: string) => Result;
  removeCategory: (name: string) => Result;
  addTown: (name: string) => Result;
  removeTown: (name: string) => Result;
  refresh: () => Promise<void>;
};

type EventRow = {
  id: string;
  title: string;
  town: Town;
  venue: string;
  event_date: string;
  time_text: string;
  category: Category;
  categories: Category[] | null;
  description: string;
  is_free: boolean;
  price_text: string | null;
  link_url: string | null;
  address: string | null;
  flyer_path: string | null;
  start_time: string | null;
  end_time: string | null;
  cancelled: boolean | null;
  latitude: number | null;
  longitude: number | null;
  status: EventStatus;
  submitted_by: string | null;
  submitter: { display_name: string | null } | null;
};

const EVENT_COLUMNS = '*, submitter:profiles!events_submitted_by_fkey(display_name)';

/** "19:00:00" from the database as "19:00". */
const clock = (time: string | null) => time?.slice(0, 5) || undefined;

function fromRow(row: EventRow): BtvEvent {
  return {
    id: row.id,
    title: row.title,
    town: row.town,
    venue: row.venue,
    date: row.event_date,
    time: row.time_text,
    categories: row.categories?.length ? row.categories : [row.category],
    description: row.description,
    isFree: row.is_free,
    price: row.price_text ?? undefined,
    link: row.link_url ?? undefined,
    address: row.address ?? undefined,
    flyerUrl: row.flyer_path && supabase ? supabase.storage.from(FLYER_BUCKET).getPublicUrl(row.flyer_path).data.publicUrl : undefined,
    flyerPath: row.flyer_path ?? undefined,
    startTime: clock(row.start_time),
    endTime: clock(row.end_time),
    cancelled: Boolean(row.cancelled),
    latitude: row.latitude ?? COUNTY_CENTER.latitude,
    longitude: row.longitude ?? COUNTY_CENTER.longitude,
    status: row.status,
    submittedBy: row.submitter?.display_name ?? undefined,
    submittedById: row.submitted_by ?? undefined,
  };
}

/** The database columns for an event's details, shared by submitting and editing. */
function detailColumns(input: NewEvent) {
  return {
    title: input.title,
    town: input.town,
    venue: input.venue,
    address: input.address || null,
    event_date: input.date,
    time_text: input.time,
    start_time: input.startTime,
    end_time: input.endTime,
    category: input.categories[0],
    categories: input.categories,
    description: input.description,
    is_free: input.isFree,
    price_text: input.isFree ? null : input.price || null,
    link_url: input.link || null,
    latitude: input.latitude,
    longitude: input.longitude,
  };
}

/** Demo mode: an event's details as the app shows them, without a database. */
function demoEvent(input: NewEvent, currentFlyerUrl?: string) {
  // Copy only the detail fields: callers may pass a whole preview event, whose id and status
  // must not overwrite the real event's.
  const { title, town, venue, address, date, time, categories, description, isFree, price, link, latitude, longitude } = input;
  return {
    ...{ title, town, venue, address, date, time, categories, description, isFree, price, link, latitude, longitude },
    startTime: input.startTime,
    endTime: input.endTime ?? undefined,
    flyerUrl: input.flyer === 'keep' ? currentFlyerUrl : input.flyer?.uri,
  };
}

/** Owner-managed lists (categories, towns): trims, and refuses blanks, long names and repeats. */
function checkNewName(raw: string, existing: string[], kind: string): { name: string } | { error: string } {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (!name) return { error: `Type a name for the ${kind}.` };
  if (name.length > 30) return { error: `Keep ${kind} names to 30 characters or fewer.` };
  if (existing.some((e) => e.toLowerCase() === name.toLowerCase())) return { error: `${name} is already on the list.` };
  return { name };
}

const SAVED_KEY = 'btv:saved-event-ids';
const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>('guest');
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [events, setEvents] = useState<BtvEvent[]>(() => (supabase ? [] : sampleEvents()));
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<Category[]>([...DEFAULT_CATEGORIES]);
  const [towns, setTowns] = useState<TownInfo[]>(DEFAULT_TOWNS);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [loadError, setLoadError] = useState<string | null>(null);
  // Demo mode only: which local events this person submitted.
  const [demoMyIds, setDemoMyIds] = useState<string[]>([]);

  const loadEvents = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('events').select(EVENT_COLUMNS).order('event_date');
    if (error) setLoadError("Couldn't load events. Check your connection and try again.");
    else {
      setLoadError(null);
      setEvents((data as EventRow[]).map(fromRow));
    }
    setLoading(false);
  }, []);

  // Before these tables exist in the database, the built-in lists stay so the app still works.
  const loadLists = useCallback(async () => {
    if (!supabase) return;
    const [categoryResult, townResult] = await Promise.all([
      supabase.from('categories').select('name').order('sort_order').order('name'),
      supabase.from('towns').select('name, latitude, longitude').order('sort_order').order('name'),
    ]);
    if (!categoryResult.error && categoryResult.data) {
      setCategories(categoryResult.data.map((c: { name: string }) => c.name));
    }
    if (!townResult.error && townResult.data) setTowns(townResult.data as TownInfo[]);
  }, []);

  const loadAccount = useCallback(async (id: string | null) => {
    if (!supabase || !id) {
      setRole('guest');
      setProfileName(null);
      return;
    }
    const [{ data: profile }, { data: saved }] = await Promise.all([
      supabase.from('profiles').select('role, display_name').eq('id', id).maybeSingle(),
      supabase.from('saved_events').select('event_id'),
    ]);
    setRole(profile?.role === 'owner' ? 'owner' : 'resident');
    setProfileName(profile?.display_name ?? null);
    if (saved) setSavedIds(new Set(saved.map((s: { event_id: string }) => s.event_id)));
  }, []);

  // Saved events for people who aren't signed in stay on the device.
  useEffect(() => {
    if (userId) return;
    AsyncStorage.getItem(SAVED_KEY)
      .then((raw) => setSavedIds(new Set(raw ? (JSON.parse(raw) as string[]) : [])))
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user.id ?? null;
      setUserId(id);
      setEmail(session?.user.email ?? null);
      // Supabase advises against awaiting other calls inside this callback.
      setTimeout(() => {
        loadAccount(id);
        loadEvents();
        loadLists();
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  }, [loadAccount, loadEvents, loadLists]);

  /**
   * Uploads a newly picked flyer into the person's own folder (storage rules check this).
   * `path` is what the event should point to; `uploaded` is set when a new file went up,
   * so it can be removed again if saving the event fails.
   */
  const uploadFlyer = useCallback(
    async (flyer: NewEvent['flyer'], existingPath: string | null): Promise<{ path: string | null; uploaded?: string } | { error: string }> => {
      if (flyer === 'keep') return { path: existingPath };
      if (!flyer || !supabase || !userId) return { path: null };
      const path = `${userId}/${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from(FLYER_BUCKET)
        .upload(path, base64ToBytes(flyer.base64), { contentType: 'image/jpeg' });
      if (error) return { error: "Couldn't upload the flyer. Try again, or remove the photo and save without it." };
      return { path, uploaded: path };
    },
    [userId],
  );

  const store = useMemo<Store>(() => {
    const byDate = (a: BtvEvent, b: BtvEvent) => a.date.localeCompare(b.date);
    const fallbackName = email ? email.split('@')[0] : role === 'owner' ? 'BTV Owner' : 'Resident';

    return {
      backend: supabase ? 'supabase' : 'demo',
      loading,
      loadError,
      role,
      displayName: profileName ?? fallbackName,
      email,
      events,
      approved: events.filter((e) => e.status === 'approved').sort(byDate),
      pending: events.filter((e) => e.status === 'pending').sort(byDate),
      mySubmissions: supabase
        ? events.filter((e) => userId && e.submittedById === userId)
        : events.filter((e) => demoMyIds.includes(e.id)),
      savedIds,
      categories,
      towns,
      townCenter: (name) => towns.find((t) => t.name === name) ?? COUNTY_CENTER,

      demoSignIn: setRole,

      sendCode: async (address) => {
        if (!supabase) return 'Sign-in is not set up yet.';
        const { error } = await supabase.auth.signInWithOtp({ email: address.trim() });
        return error ? error.message : null;
      },

      verifyCode: async (address, code) => {
        if (!supabase) return 'Sign-in is not set up yet.';
        const { error } = await supabase.auth.verifyOtp({ email: address.trim(), token: code.trim(), type: 'email' });
        return error ? 'That code didn’t work. Check it, or send a new one.' : null;
      },

      signOut: () => {
        if (supabase) supabase.auth.signOut();
        else setRole('guest');
      },

      toggleSaved: (id) => {
        const wasSaved = savedIds.has(id);
        setSavedIds((prev) => {
          const next = new Set(prev);
          if (wasSaved) next.delete(id);
          else next.add(id);
          if (!userId) AsyncStorage.setItem(SAVED_KEY, JSON.stringify([...next])).catch(() => {});
          return next;
        });
        if (supabase && userId) {
          const request = wasSaved
            ? supabase.from('saved_events').delete().eq('user_id', userId).eq('event_id', id)
            : supabase.from('saved_events').insert({ user_id: userId, event_id: id });
          request.then(({ error }) => {
            // Put the heart back the way it was if the database refused.
            if (error) loadAccount(userId);
          });
        }
      },

      submitEvent: async (input) => {
        const status: EventStatus = role === 'owner' ? 'approved' : 'pending';
        if (!supabase) {
          const event: BtvEvent = {
            ...demoEvent(input),
            id: `local-${Date.now()}`,
            status,
            cancelled: false,
            submittedBy: 'You',
          };
          setEvents((prev) => [...prev, event]);
          if (role !== 'owner') setDemoMyIds((prev) => [...prev, event.id]);
          return null;
        }
        if (!userId) return 'Sign in to submit an event.';

        const flyer = await uploadFlyer(input.flyer, null);
        if ('error' in flyer) return flyer.error;
        const { error } = await supabase
          .from('events')
          .insert({ ...detailColumns(input), flyer_path: flyer.path, status, submitted_by: userId });
        if (error) {
          if (flyer.uploaded) supabase.storage.from(FLYER_BUCKET).remove([flyer.uploaded]);
          return "Couldn't send your event. Check your connection and try again.";
        }
        await loadEvents();
        return null;
      },

      updateEvent: async (id, input) => {
        const current = events.find((e) => e.id === id);
        if (!current) return 'That event is no longer listed.';
        if (!supabase) {
          setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...demoEvent(input, e.flyerUrl) } : e)));
          return null;
        }
        const flyer = await uploadFlyer(input.flyer, current.flyerPath ?? null);
        if ('error' in flyer) return flyer.error;
        const { error } = await supabase
          .from('events')
          .update({ ...detailColumns(input), flyer_path: flyer.path })
          .eq('id', id);
        if (error) {
          if (flyer.uploaded) supabase.storage.from(FLYER_BUCKET).remove([flyer.uploaded]);
          return "Couldn't save your changes. Check your connection and try again.";
        }
        // The old flyer is only removed once the event no longer points to it.
        if (current.flyerPath && current.flyerPath !== flyer.path) {
          supabase.storage.from(FLYER_BUCKET).remove([current.flyerPath]);
        }
        await loadEvents();
        return null;
      },

      setCancelled: async (id, cancelled) => {
        if (supabase) {
          const { error } = await supabase.from('events').update({ cancelled }).eq('id', id);
          if (error) return "Couldn't save that. Try again.";
          await loadEvents();
        } else {
          setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, cancelled } : e)));
        }
        return null;
      },

      deleteEvent: async (id) => {
        const flyerPath = events.find((e) => e.id === id)?.flyerPath;
        if (supabase) {
          const { error } = await supabase.from('events').delete().eq('id', id);
          if (error) return "Couldn't delete that event. Try again.";
          if (flyerPath) supabase.storage.from(FLYER_BUCKET).remove([flyerPath]);
          await loadEvents();
        } else {
          setEvents((prev) => prev.filter((e) => e.id !== id));
        }
        return null;
      },

      review: async (id, decision) => {
        if (!supabase) {
          setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, status: decision } : e)));
          return null;
        }
        const { error } = await supabase
          .from('events')
          .update({ status: decision, reviewed_by: userId, reviewed_at: new Date().toISOString() })
          .eq('id', id);
        if (error) return "Couldn't save that. Try again.";
        await loadEvents();
        return null;
      },

      addCategory: async (raw) => {
        const checked = checkNewName(raw, categories, 'category');
        if ('error' in checked) return checked.error;
        if (supabase) {
          const { error } = await supabase.from('categories').insert({ name: checked.name, sort_order: categories.length });
          if (error) return "Couldn't add that category. Try again.";
        }
        setCategories((prev) => [...prev, checked.name]);
        return null;
      },

      removeCategory: async (name) => {
        if (categories.length <= 1) return 'Keep at least one category.';
        if (supabase) {
          const { error } = await supabase.from('categories').delete().eq('name', name);
          if (error) return "Couldn't remove that category. Try again.";
        }
        setCategories((prev) => prev.filter((c) => c !== name));
        return null;
      },

      addTown: async (raw) => {
        const checked = checkNewName(raw, towns.map((t) => t.name), 'town');
        if ('error' in checked) return checked.error;
        // Events without a street address get a pin at the town's center.
        const town: TownInfo = { name: checked.name, ...((await geocodeTown(checked.name)) ?? COUNTY_CENTER) };
        if (supabase) {
          const { error } = await supabase.from('towns').insert({ ...town, sort_order: towns.length });
          if (error) return "Couldn't add that town. Try again.";
        }
        setTowns((prev) => [...prev, town]);
        return null;
      },

      removeTown: async (name) => {
        if (towns.length <= 1) return 'Keep at least one town.';
        if (supabase) {
          const { error } = await supabase.from('towns').delete().eq('name', name);
          if (error) return "Couldn't remove that town. Try again.";
        }
        setTowns((prev) => prev.filter((t) => t.name !== name));
        return null;
      },

      refresh: async () => {
        await Promise.all([loadEvents(), loadLists()]);
      },
    };
  }, [role, events, savedIds, categories, towns, demoMyIds, userId, email, profileName, loading, loadError, loadAccount, loadEvents, loadLists, uploadFlyer]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}

