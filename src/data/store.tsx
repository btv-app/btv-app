import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { sampleEvents } from '@/data/sample-events';
import { DEFAULT_CATEGORIES, TOWN_COORDS, type BtvEvent, type Category, type EventStatus, type Role, type Town } from '@/data/types';
import { base64ToBytes } from '@/lib/base64';
import { supabase } from '@/lib/supabase';

/**
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
  flyer: Flyer | null;
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
  demoSignIn: (role: Exclude<Role, 'guest'>) => void;
  sendCode: (email: string) => Result;
  verifyCode: (email: string, code: string) => Result;
  signOut: () => void;
  toggleSaved: (id: string) => void;
  submitEvent: (event: NewEvent) => Result;
  review: (id: string, decision: 'approved' | 'declined') => Result;
  addCategory: (name: string) => Result;
  removeCategory: (name: string) => Result;
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
  latitude: number | null;
  longitude: number | null;
  status: EventStatus;
  submitted_by: string | null;
  submitter: { display_name: string | null } | null;
};

const EVENT_COLUMNS = '*, submitter:profiles!events_submitted_by_fkey(display_name)';

function fromRow(row: EventRow): BtvEvent {
  const fallback = TOWN_COORDS[row.town] ?? TOWN_COORDS['Ashland City'];
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
    latitude: row.latitude ?? fallback.latitude,
    longitude: row.longitude ?? fallback.longitude,
    status: row.status,
    submittedBy: row.submitter?.display_name ?? undefined,
    submittedById: row.submitted_by ?? undefined,
  };
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

  const loadCategories = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('categories').select('name').order('sort_order').order('name');
    // Before the categories table exists, keep the built-in list so the app still works.
    if (!error && data) setCategories(data.map((c: { name: string }) => c.name));
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
        loadCategories();
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  }, [loadAccount, loadEvents, loadCategories]);

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

      submitEvent: async ({ flyer, startTime, endTime, ...input }) => {
        const status: EventStatus = role === 'owner' ? 'approved' : 'pending';
        if (!supabase) {
          const event: BtvEvent = { ...input, flyerUrl: flyer?.uri, id: `local-${Date.now()}`, status, submittedBy: 'You' };
          setEvents((prev) => [...prev, event]);
          if (role !== 'owner') setDemoMyIds((prev) => [...prev, event.id]);
          return null;
        }
        if (!userId) return 'Sign in to submit an event.';

        let flyerPath: string | null = null;
        if (flyer) {
          // Each person uploads into a folder named after their user id; storage rules check this.
          flyerPath = `${userId}/${Date.now()}.jpg`;
          const { error } = await supabase.storage
            .from(FLYER_BUCKET)
            .upload(flyerPath, base64ToBytes(flyer.base64), { contentType: 'image/jpeg' });
          if (error) return "Couldn't upload the flyer. Try again, or remove the photo and send the event without it.";
        }

        const { error } = await supabase.from('events').insert({
          title: input.title,
          town: input.town,
          venue: input.venue,
          address: input.address || null,
          event_date: input.date,
          time_text: input.time,
          start_time: startTime,
          end_time: endTime,
          category: input.categories[0],
          categories: input.categories,
          description: input.description,
          is_free: input.isFree,
          price_text: input.isFree ? null : input.price || null,
          link_url: input.link || null,
          flyer_path: flyerPath,
          latitude: input.latitude,
          longitude: input.longitude,
          status,
          submitted_by: userId,
        });
        if (error) {
          if (flyerPath) supabase.storage.from(FLYER_BUCKET).remove([flyerPath]);
          return "Couldn't send your event. Check your connection and try again.";
        }
        await loadEvents();
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
        const name = raw.trim().replace(/\s+/g, ' ');
        if (!name) return 'Type a name for the category.';
        if (name.length > 30) return 'Keep category names to 30 characters or fewer.';
        if (categories.some((c) => c.toLowerCase() === name.toLowerCase())) return `${name} is already a category.`;
        if (supabase) {
          const { error } = await supabase.from('categories').insert({ name, sort_order: categories.length });
          if (error) return "Couldn't add that category. Try again.";
        }
        setCategories((prev) => [...prev, name]);
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

      refresh: async () => {
        await Promise.all([loadEvents(), loadCategories()]);
      },
    };
  }, [role, events, savedIds, categories, demoMyIds, userId, email, profileName, loading, loadError, loadAccount, loadEvents, loadCategories]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}

