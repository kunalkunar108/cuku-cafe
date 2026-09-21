import { useEffect, useState } from "react";
import { getIdTokenResult } from "firebase/auth";
import { collection, doc, getDocs, orderBy, query, updateDoc } from "firebase/firestore";
import { ArrowRight, CalendarCheck, CheckCircle2, Clock3, Coffee, Loader2, LogOut, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";

type Booking = {
  id: string;
  name?: string;
  phone?: string;
  date?: string;
  guests?: number;
  specialRequest?: string;
  status?: string;
};

export default function AdminDashboard({ onBackToSite }: { onBackToSite: () => void }) {
  const { user, loading: authLoading, logout } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const checkAdmin = async () => {
    setCheckingAccess(true);
    setError("");
    try {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      const token = await getIdTokenResult(user, true);
      setIsAdmin(token.claims.admin === true);
    } catch (err) {
      console.error("Admin claim check failed:", err);
      setIsAdmin(false);
      setError("We couldn't verify your admin permissions.");
    } finally {
      setCheckingAccess(false);
    }
  };

  const loadBookings = async () => {
    if (!isAdmin) return;
    setLoadingBookings(true);
    setError("");
    try {
      const snapshot = await getDocs(query(collection(db, "tableBookings"), orderBy("createdAt", "desc")));
      setBookings(snapshot.docs.map(item => ({ id: item.id, ...item.data() })) as Booking[]);
    } catch (err) {
      console.error("Could not load admin bookings:", err);
      setError("We couldn't load bookings. If this is your first admin login, verify the admin custom claim and Firestore rules.");
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    if (!authLoading) void checkAdmin();
  }, [authLoading, user]);

  useEffect(() => {
    if (isAdmin) void loadBookings();
  }, [isAdmin]);

  const updateStatus = async (bookingId: string, status: "confirmed" | "cancelled") => {
    setActionId(bookingId);
    setError("");
    try {
      await updateDoc(doc(db, "tableBookings", bookingId), { status, updatedAt: new Date() });
      await loadBookings();
    } catch (err) {
      console.error("Could not update booking:", err);
      setError("Could not update this booking. Check your admin claim and Firestore rules.");
    } finally {
      setActionId(null);
    }
  };

  if (authLoading || checkingAccess) {
    return <div className="grid min-h-screen place-items-center bg-[#f6f3ea]"><Loader2 className="animate-spin text-forest" size={32}/></div>;
  }

  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f6f3ea] p-6">
        <div className="max-w-md rounded-[2rem] bg-white p-9 text-center shadow-sm">
          <ShieldCheck className="mx-auto text-forest" size={42}/>
          <h1 className="mt-5 font-display text-3xl">Admin sign-in required</h1>
          <p className="mt-3 text-sm leading-6 text-ink/55">Sign in with the Firebase account that has the admin custom claim, then open /admin again.</p>
          <button onClick={onBackToSite} className="mt-6 rounded-full bg-forest px-6 py-3 font-semibold text-white">Back to site</button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f6f3ea] p-6">
        <div className="max-w-md rounded-[2rem] border border-red-100 bg-white p-9 text-center shadow-sm">
          <ShieldCheck className="mx-auto text-red-500" size={42}/>
          <h1 className="mt-5 font-display text-3xl">Access denied</h1>
          <p className="mt-3 text-sm leading-6 text-ink/55">This Firebase account does not have the <b>admin</b> custom claim.</p>
          <p className="mt-2 text-xs leading-5 text-ink/40">For security, the admin role cannot be created from this website.</p>
          <div className="mt-6 flex justify-center gap-3">
            <button onClick={onBackToSite} className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold">Back to site</button>
            <button onClick={() => { void logout(); }} className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white">Logout</button>
          </div>
        </div>
      </div>
    );
  }

  const pending = bookings.filter(b => String(b.status || "pending") === "pending").length;
  const confirmed = bookings.filter(b => b.status === "confirmed").length;
  const cancelled = bookings.filter(b => b.status === "cancelled").length;

  return (
    <div className="min-h-screen bg-[#f6f3ea]">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col bg-ink text-white lg:flex">
          <div className="flex h-24 items-center gap-3 border-b border-white/10 px-7">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-forest text-cream"><Coffee size={21}/></span>
            <div><div className="font-display text-xl font-bold">Café Bistro</div><div className="text-[11px] uppercase tracking-[.18em] text-white/40">Admin portal</div></div>
          </div>
          <nav className="flex-1 px-4 py-7">
            <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3.5 text-sm font-semibold"><CalendarCheck size={18}/> Dashboard</div>
          </nav>
          <div className="border-t border-white/10 p-5">
            <button onClick={onBackToSite} className="mb-2 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-white/65 hover:bg-white/5 hover:text-white"><ArrowRight className="rotate-180" size={17}/> Back to site</button>
            <button onClick={() => { void logout(); }} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-white/65 hover:bg-white/5 hover:text-white"><LogOut size={17}/> Logout</button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-black/5 bg-[#f6f3ea]/90 backdrop-blur">
            <div className="flex min-h-20 items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
              <div><p className="text-xs font-bold uppercase tracking-[.18em] text-forest">Admin dashboard</p><h1 className="font-display text-2xl font-bold">Café Bistro management</h1></div>
              <div className="flex items-center gap-3">
                <button onClick={() => void loadBookings()} disabled={loadingBookings} className="rounded-full border border-black/10 bg-white p-2.5 hover:border-forest disabled:opacity-50" aria-label="Refresh"><RefreshCw size={17} className={loadingBookings ? "animate-spin" : ""}/></button>
                <div className="hidden text-right sm:block"><div className="text-sm font-semibold">{user.displayName || "Admin"}</div><div className="text-xs text-ink/45">{user.email}</div></div>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
            {error && <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl bg-forest p-6 text-white"><p className="text-sm text-white/60">Total bookings</p><div className="mt-7 font-display text-5xl">{bookings.length}</div></div>
              <div className="rounded-3xl border border-black/5 bg-white p-6"><p className="text-sm text-ink/55">Pending</p><div className="mt-7 font-display text-5xl">{pending}</div></div>
              <div className="rounded-3xl border border-black/5 bg-white p-6"><p className="text-sm text-ink/55">Confirmed</p><div className="mt-7 font-display text-5xl">{confirmed}</div></div>
              <div className="rounded-3xl border border-black/5 bg-white p-6"><p className="text-sm text-ink/55">Cancelled</p><div className="mt-7 font-display text-5xl">{cancelled}</div></div>
            </div>

            <section className="mt-8 rounded-[2rem] border border-black/5 bg-white p-6 sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <div><p className="text-xs font-bold uppercase tracking-[.2em] text-forest">Reservations</p><h2 className="mt-2 font-display text-3xl sm:text-4xl">All table bookings</h2></div>
                <button onClick={() => void loadBookings()} className="hidden rounded-full border border-black/10 px-4 py-2 text-sm font-semibold hover:border-forest sm:block">Refresh</button>
              </div>

              {loadingBookings ? (
                <div className="grid min-h-56 place-items-center"><Loader2 className="animate-spin text-forest" size={28}/></div>
              ) : bookings.length === 0 ? (
                <div className="grid min-h-56 place-items-center text-center text-ink/45"><div><CalendarCheck className="mx-auto text-forest" size={38}/><p className="mt-4">No table bookings yet.</p></div></div>
              ) : (
                <div className="mt-7 overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left text-sm">
                    <thead><tr className="border-b border-black/10 text-xs uppercase tracking-wider text-ink/40"><th className="px-4 py-3">Guest</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Guests</th><th className="px-4 py-3">Request</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead>
                    <tbody>
                      {bookings.map(booking => {
                        const status = String(booking.status || "pending");
                        return <tr key={booking.id} className="border-b border-black/5 align-top last:border-0">
                          <td className="px-4 py-5"><div className="font-semibold">{booking.name || "Guest"}</div><div className="mt-1 text-xs text-ink/45">{booking.phone || "No phone"}</div></td>
                          <td className="px-4 py-5 font-medium">{booking.date || "—"}</td>
                          <td className="px-4 py-5">{booking.guests || "—"}</td>
                          <td className="max-w-56 px-4 py-5 text-ink/55">{booking.specialRequest || "—"}</td>
                          <td className="px-4 py-5"><span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold capitalize ${status === "confirmed" ? "bg-green-100 text-green-800" : status === "cancelled" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>{status}</span></td>
                          <td className="px-4 py-5">
                            <div className="flex gap-2">
                              {status !== "confirmed" && <button onClick={() => void updateStatus(booking.id, "confirmed")} disabled={actionId === booking.id} className="rounded-full bg-forest px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><CheckCircle2 size={14}/></button>}
                              {status !== "cancelled" && <button onClick={() => void updateStatus(booking.id, "cancelled")} disabled={actionId === booking.id} className="rounded-full border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-50"><XCircle size={14}/></button>}
                            </div>
                          </td>
                        </tr>;
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
