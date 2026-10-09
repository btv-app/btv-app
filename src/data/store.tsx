import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { sampleEvents } from '@/data/sample-events';
import { TOWN_COORDS, type BtvEvent, type Role } from '@/data/types';

/**
 * In-memory app state backed by sample data. This is the seam where Supabase plugs in:
 * swap the useState calls for queries and the actions for inserts/updates.
 */
type NewEvent = Omit<BtvEvent, 'id' | 'status' | 'latitude' | 'longitude' | 'submittedBy'>;

type Store = {
  role: Role;
  displayName: string;
  events: BtvEvent[];
  approved: BtvEvent[];
  pending: BtvEvent[];
  mySubmissions: BtvEvent[];
  savedIds: Set<string>;
  signIn: (role: Exclude<Role, 'guest'>) => void;
  signOut: () => void;
  toggleSaved: (id: string) => void;
  submitEvent: (event: NewEvent) => BtvEvent;
  review: (id: string, decision: 'approved' | 'declined') => void;
};

const SAVED_KEY = 'btv:saved-event-ids';
const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>('guest');
  const [events, setEvents] = useState<BtvEvent[]>(sampleEvents);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [myIds, setMyIds] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(SAVED_KEY)
      .then((raw) => raw && setSavedIds(new Set(JSON.parse(raw) as string[])))
      .catch(() => {});
  }, []);

  const store = useMemo<Store>(() => {
    const byDate = (a: BtvEvent, b: BtvEvent) => a.date.localeCompare(b.date);
    return {
      role,
      displayName: role === 'owner' ? 'BTV Owner' : 'Resident',
      events,
      approved: events.filter((e) => e.status === 'approved').sort(byDate),
      pending: events.filter((e) => e.status === 'pending').sort(byDate),
      mySubmissions: events.filter((e) => myIds.includes(e.id)),
      savedIds,
      signIn: setRole,
      signOut: () => setRole('guest'),
      toggleSaved: (id) => {
        setSavedIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          AsyncStorage.setItem(SAVED_KEY, JSON.stringify([...next])).catch(() => {});
          return next;
        });
      },
      submitEvent: (input) => {
        const event: BtvEvent = {
          ...input,
          id: `local-${Date.now()}`,
          ...TOWN_COORDS[input.town],
          // The owner's own events skip review.
          status: role === 'owner' ? 'approved' : 'pending',
          submittedBy: role === 'owner' ? undefined : 'You',
        };
        setEvents((prev) => [...prev, event]);
        if (role !== 'owner') setMyIds((prev) => [...prev, event.id]);
        return event;
      },
      review: (id, decision) => {
        setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, status: decision } : e)));
      },
    };
  }, [role, events, savedIds, myIds]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}
