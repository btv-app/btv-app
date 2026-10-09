import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { sampleEvents } from '@/data/sample-events';
import { TOWN_COORDS, type BtvEvent, type Category, type EventStatus, type Role, type Town } from '@/data/types';
import { supabase } from '@/lib/supabase';

/**
 * App state. With Supabase configured (see .env), events, saved events, submissions and
 * sign-in live in the database. Without it, the app runs on sample data with a demo sign-in,
 * so it still works for design reviews.
 */
type NewEvent = Omit<BtvEvent, 'id' | 'status' | 'latitude' | 'longitude' | 'submittedBy' | 'submittedById'>;

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
  demoSignIn: (role: Exclude<Role, 'guest'>) => void;
  sendCode: (email: string) => Result;
  verifyCode: (email: string, code: string) => Result;
  signOut: () => void;
  toggleSaved: (id: string) => void;
  submitEvent: (event: NewEvent) => Result;
  review: (id: string, decision: 'approved' | 'declined') => Result;
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
  description: string;
  is_free: boolean;
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
    category: row.category,
    description: row.description,
    isFree: row.is_free,
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
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  }, [loadAccount, loadEvents]);

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
        const coords = TOWN_COORDS[input.town];
        if (!supabase) {
          const event: BtvEvent = { ...input, ...coords, id: `local-${Date.now()}`, status, submittedBy: 'You' };
          setEvents((prev) => [...prev, event]);
          if (role !== 'owner') setDemoMyIds((prev) => [...prev, event.id]);
          return null;
        }
        if (!userId) return 'Sign in to submit an event.';
        const { error } = await supabase.from('events').insert({
          title: input.title,
          town: input.town,
          venue: input.venue,
          event_date: input.date,
          time_text: input.time,
          category: input.category,
          description: input.description,
          is_free: input.isFree,
          latitude: coords.latitude,
          longitude: coords.longitude,
          status,
          submitted_by: userId,
        });
        if (error) return "Couldn't send your event. Check your connection and try again.";
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

      refresh: loadEvents,
    };
  }, [role, events, savedIds, demoMyIds, userId, email, profileName, loading, loadError, loadAccount, loadEvents]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}

