import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "./context/AuthContext";
import AuthModal from "./components/AuthModal";
import AdminDashboard from "./components/AdminDashboard";
import { addDoc, collection, getDocs, query, where, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { db } from "./lib/firebase";
import {
  ArrowRight, CalendarDays, ChevronDown, Coffee, Instagram, MapPin,
  Menu as MenuIcon, ShoppingBag, Star, Utensils, X, UserRound, CalendarCheck, LogOut, Loader2, Clock3, CircleCheck, CircleX
} from "lucide-react";

const menu = [
  { name: "Cappuccino", desc: "Double espresso, silky steamed milk", price: "₹180", cat: "Coffee", img: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=900&q=80" },
  { name: "Avocado Toast", desc: "Sourdough, avocado, herbs, poached egg", price: "₹320", cat: "Brunch", img: "https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?auto=format&fit=crop&w=900&q=80" },
  { name: "Truffle Pasta", desc: "Creamy parmesan sauce, herbs, truffle oil", price: "₹420", cat: "Kitchen", img: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=900&q=80" },
  { name: "Chocolate Tart", desc: "Dark chocolate ganache, sea salt", price: "₹240", cat: "Dessert", img: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=80" }
];

const gallery = [
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80"
];

function App() {
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState(0);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const { user, loading, logout } = useAuth();
  const [bookingForm, setBookingForm] = useState({ name: "", phone: "", date: "", guests: "2", specialRequest: "" });
  const [bookingSaving, setBookingSaving] = useState(false);
  const [bookingMessage, setBookingMessage] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [route, setRoute] = useState(() => window.location.pathname);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingActionId, setBookingActionId] = useState<string | null>(null);
  const [dashboardError, setDashboardError] = useState("");

  useEffect(() => {
    const handlePopState = () => setRoute(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, "", path);
    setRoute(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    if (route === "/dashboard" && user) {
      void loadMyBookings();
    }
  }, [route, user]);

  const addToCart = () => setCart(v => v + 1);

  const loadMyBookings = async () => {
    if (!user) return;
    setBookingsLoading(true);
    setDashboardError("");
    try {
      const snapshot = await getDocs(
        query(collection(db, "tableBookings"), where("userId", "==", user.uid))
      );
      const bookings = snapshot.docs
        .map(item => ({ id: item.id, ...item.data() }))
        .sort((a: any, b: any) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return bTime - aTime;
        });
      setMyBookings(bookings);
    } catch (error) {
      console.error("Could not load bookings:", error);
      setDashboardError("We couldn't load your bookings. Please try again.");
    } finally {
      setBookingsLoading(false);
    }
  };

  const openDashboard = async () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    navigate("/dashboard");
    await loadMyBookings();
  };

  const cancelBooking = async (bookingId: string) => {
    if (!user) return;
    const confirmed = window.confirm("Cancel this reservation request?");
    if (!confirmed) return;
    setBookingActionId(bookingId);
    setDashboardError("");
    try {
      await updateDoc(doc(db, "tableBookings", bookingId), {
        status: "cancelled",
        updatedAt: serverTimestamp(),
      });
      await loadMyBookings();
    } catch (error) {
      console.error("Could not cancel booking:", error);
      setDashboardError("We couldn't cancel this booking. Please try again.");
    } finally {
      setBookingActionId(null);
    }
  };

  const submitBooking = async (event: FormEvent) => {
    event.preventDefault();
    setBookingMessage("");
    setBookingError("");

    if (!user) {
      setBookingError("Please login or sign up before requesting a reservation.");
      setAuthOpen(true);
      return;
    }

    if (!bookingForm.name.trim() || !bookingForm.phone.trim() || !bookingForm.date) {
      setBookingError("Please enter your name, phone number and preferred date.");
      return;
    }

    setBookingSaving(true);
    try {
      await addDoc(collection(db, "tableBookings"), {
        userId: user.uid,
        name: bookingForm.name.trim(),
        phone: bookingForm.phone.trim(),
        date: bookingForm.date,
        guests: Number(bookingForm.guests),
        specialRequest: bookingForm.specialRequest.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setBookingForm({ name: user.displayName || "", phone: "", date: "", guests: "2", specialRequest: "" });
      setBookingMessage("Reservation request submitted successfully.");
    } catch (error) {
      console.error("Table booking failed:", error);
      setBookingError("We couldn't save your reservation. Please try again.");
    } finally {
      setBookingSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream">
      {route !== "/dashboard" && <>
      <header className="sticky top-0 z-50 border-b border-black/5 bg-cream/95 backdrop-blur">
        <div className="container-page flex h-20 items-center justify-between">
          <a href="#home" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-forest text-cream"><Coffee size={20}/></span>
            <span className="font-display text-2xl font-bold tracking-tight">Café Bistro</span>
          </a>
          <nav className="hidden items-center gap-8 md:flex">
            {["Home","Menu","About","Gallery","Events","Contact"].map(x =>
              <a key={x} href={"#" + x.toLowerCase()} className="text-sm font-medium text-ink/70 transition hover:text-forest">{x}</a>
            )}
            {!loading && user ? (
              <div className="flex items-center gap-3">
                <button onClick={openDashboard} className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold hover:border-forest">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-forest text-xs text-white">{(user.displayName || user.email || "U").charAt(0).toUpperCase()}</span>
                  <span className="max-w-28 truncate">{user.displayName || user.email}</span>
                </button>
                <button onClick={logout} className="text-sm font-semibold text-ink/55 hover:text-forest">Logout</button>
              </div>
            ) : (
              <button onClick={() => setAuthOpen(true)} className="rounded-full border border-forest/20 bg-white px-5 py-3 text-sm font-semibold text-forest transition hover:border-forest">Login</button>
            )}
            <button onClick={() => setBookingOpen(true)} className="rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink">Book a Table</button>
          </nav>
          <button className="relative md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">
            {open ? <X/> : <MenuIcon/>}
          </button>
          {cart > 0 && <span className="absolute right-16 top-7 grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1 text-xs font-bold md:right-40">{cart}</span>}
        </div>
        {open && <div className="border-t border-black/5 px-5 py-5 md:hidden">
          {["Home","Menu","About","Gallery","Events","Contact"].map(x => <a onClick={() => setOpen(false)} key={x} href={"#" + x.toLowerCase()} className="block py-3 text-lg">{x}</a>)}
          {!loading && user ? <button onClick={() => { setOpen(false); void openDashboard(); }} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-forest/20 bg-white py-3 font-semibold text-forest"><UserRound size={17}/> Dashboard</button> : <button onClick={() => {setOpen(false);setAuthOpen(true)}} className="mt-3 w-full rounded-full border border-forest/20 bg-white py-3 font-semibold text-forest">Login / Sign up</button>}
          <button onClick={() => {setOpen(false);setBookingOpen(true)}} className="mt-3 w-full rounded-full bg-forest py-3 font-semibold text-white">Book a Table</button>
        </div>}
      </header>

      <main id="home">
        <section className="container-page grid min-h-[680px] items-center gap-10 py-16 lg:grid-cols-[1.02fr_.98fr]">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-forest/15 bg-white/50 px-4 py-2 text-xs font-semibold uppercase tracking-[.18em] text-forest"><span className="h-2 w-2 rounded-full bg-forest"/> Open daily · 8 AM — 11 PM</div>
            <h1 className="font-display text-6xl leading-[.96] tracking-tight sm:text-7xl lg:text-8xl">Good Food.<br/><span className="text-forest">Warm Stays.</span><br/>Memorable Moments.</h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-ink/65">A neighbourhood café, restaurant and boutique stay made for slow mornings, meaningful conversations and food worth coming back for.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a href="#menu" className="inline-flex items-center gap-2 rounded-full bg-forest px-6 py-3.5 font-semibold text-white hover:bg-ink">Explore Menu <ArrowRight size={17}/></a>
              <button onClick={() => setBookingOpen(true)} className="rounded-full border border-ink/15 bg-white/40 px-6 py-3.5 font-semibold hover:border-forest hover:text-forest">Book a Table</button>
            </div>
            <div className="mt-10 flex items-center gap-8 text-sm text-ink/55"><span><b className="text-ink">4.9/5</b> guest rating</span><span><b className="text-ink">7 days</b> a week</span></div>
          </div>
          <div className="relative">
            <div className="overflow-hidden rounded-[2rem]"><img className="h-[560px] w-full object-cover" src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1400&q=85" alt="Warm café interior"/></div>
            <div className="absolute -bottom-5 -left-5 max-w-[250px] rounded-2xl bg-white p-5 shadow-xl">
              <div className="mb-2 flex text-gold">{[1,2,3,4,5].map(i=><Star key={i} size={15} fill="currentColor"/>)}</div>
              <p className="font-display text-xl">“The kind of place you lose track of time.”</p>
            </div>
          </div>
        </section>

        <section className="border-y border-black/5 bg-white/50 py-20">
          <div className="container-page">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-forest">What we offer</p>
            <h2 className="mt-3 max-w-2xl font-display text-4xl leading-tight sm:text-5xl">Everything you need for a good day.</h2>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                [Coffee,"Specialty Coffee","Thoughtfully brewed coffee, from first sip to last."],
                [Utensils,"Café & Kitchen","Comforting brunches, Italian favourites and seasonal plates."],
                [ShoppingBag,"Fresh Bakery","Baked throughout the day, while it lasts."],
                [Star,"Desserts","Little indulgences made for sharing — or not."],
                [CalendarDays,"Stay & Unwind","A boutique stay for travellers who like their mornings slow."],
                [MapPin,"Work & Relax","Good Wi‑Fi, calm corners and coffee that keeps up."]
              ].map(([Icon,title,desc]) => <div key={String(title)} className="rounded-3xl border border-black/5 bg-cream p-7 transition hover:-translate-y-1 hover:shadow-lg"><Icon size={25} className="text-forest"/><h3 className="mt-7 font-display text-2xl">{String(title)}</h3><p className="mt-2 leading-7 text-ink/60">{String(desc)}</p></div>)}
            </div>
          </div>
        </section>

        <section id="menu" className="container-page py-24">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div><p className="text-xs font-bold uppercase tracking-[.2em] text-forest">From our kitchen</p><h2 className="mt-3 font-display text-5xl">Favourites worth sharing.</h2></div>
            <a href="#menu" className="font-semibold text-forest">View full menu →</a>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {menu.map(item => <article key={item.name} className="group overflow-hidden rounded-3xl border border-black/5 bg-white">
              <img src={item.img} alt={item.name} className="h-64 w-full object-cover transition duration-500 group-hover:scale-105"/>
              <div className="p-5"><div className="flex justify-between gap-3"><h3 className="font-display text-2xl">{item.name}</h3><span className="font-semibold text-forest">{item.price}</span></div><p className="mt-2 text-sm leading-6 text-ink/55">{item.desc}</p><button onClick={addToCart} className="mt-5 w-full rounded-full border border-forest/20 py-2.5 text-sm font-semibold text-forest hover:bg-forest hover:text-white">Add to order</button></div>
            </article>)}
          </div>
        </section>

        <section id="about" className="bg-forest py-24 text-white">
          <div className="container-page grid items-center gap-14 lg:grid-cols-2">
            <img className="h-[520px] w-full rounded-[2rem] object-cover" src="https://images.unsplash.com/photo-1493857671505-72967e2e2760?auto=format&fit=crop&w=1200&q=85" alt="People enjoying a café"/>
            <div><p className="text-xs font-bold uppercase tracking-[.2em] text-sage">More than a café</p><h2 className="mt-4 font-display text-5xl leading-tight sm:text-6xl">Come for the coffee. Stay for the feeling.</h2><p className="mt-7 max-w-xl text-lg leading-8 text-white/70">Café Bistro is designed around the simple idea that the best places give you a reason to stay a little longer. Meet a friend, finish your work, celebrate something, or simply enjoy your own company.</p><div className="mt-9 grid grid-cols-2 gap-5 border-t border-white/15 pt-7 text-sm"><div><b className="block text-2xl text-white">8 AM</b><span className="text-white/55">Doors open</span></div><div><b className="block text-2xl text-white">11 PM</b><span className="text-white/55">Last coffee</span></div></div></div>
          </div>
        </section>

        <section id="gallery" className="container-page py-24">
          <div className="flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-forest">Inside Café Bistro</p><h2 className="mt-3 font-display text-5xl">A place to linger.</h2></div><Instagram className="hidden sm:block text-forest"/></div>
          <div className="mt-10 grid auto-rows-[220px] grid-cols-2 gap-4 md:grid-cols-3">{gallery.map((src,i)=><img key={src} src={src} alt={"Café Bistro gallery "+(i+1)} className={"h-full w-full rounded-3xl object-cover "+(i===0||i===3?"md:row-span-2":"")}/>)}</div>
        </section>

        <section id="events" className="bg-white py-24">
          <div className="container-page grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
            <div><p className="text-xs font-bold uppercase tracking-[.2em] text-forest">Made for moments</p><h2 className="mt-3 font-display text-5xl">Celebrate here.</h2><p className="mt-5 leading-7 text-ink/60">From intimate dinners to birthdays, team evenings and private gatherings, our space can be shaped around your occasion.</p><button onClick={() => setBookingOpen(true)} className="mt-7 rounded-full bg-forest px-6 py-3 font-semibold text-white">Plan an event</button></div>
            <div className="grid gap-4 sm:grid-cols-3">{["Private dining","Birthdays","Work events"].map((x,i)=><div key={x} className="rounded-3xl bg-cream p-6"><div className="text-4xl font-display text-forest">0{i+1}</div><h3 className="mt-12 font-display text-2xl">{x}</h3><p className="mt-2 text-sm text-ink/55">Flexible menus and a warm space for your people.</p></div>)}</div>
          </div>
        </section>

        <section id="contact" className="container-page py-24">
          <div className="rounded-[2rem] bg-sage p-8 sm:p-14">
            <div className="grid gap-10 lg:grid-cols-2">
              <div><p className="text-xs font-bold uppercase tracking-[.2em] text-forest">Find us</p><h2 className="mt-3 font-display text-5xl">Your next favourite corner is waiting.</h2><div className="mt-8 space-y-4 text-ink/70"><p className="flex gap-3"><MapPin className="shrink-0 text-forest"/> Civil Lines, Muzaffarpur, Bihar</p><p className="flex gap-3"><Coffee className="shrink-0 text-forest"/> Coffee · Brunch · Dinner · Stay</p></div></div>
              <div className="rounded-3xl bg-white/70 p-7"><h3 className="font-display text-3xl">Opening hours</h3><div className="mt-6 space-y-3 text-sm"><div className="flex justify-between border-b border-black/10 pb-3"><span>Mon — Fri</span><b>8:00 AM — 11:00 PM</b></div><div className="flex justify-between border-b border-black/10 pb-3"><span>Sat — Sun</span><b>8:00 AM — 11:30 PM</b></div></div><button onClick={() => setBookingOpen(true)} className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-forest py-3 font-semibold text-white">Reserve a table <ArrowRight size={16}/></button></div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-ink py-14 text-white">
        <div className="container-page flex flex-col justify-between gap-10 sm:flex-row">
          <div><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-white text-forest"><Coffee size={20}/></span><span className="font-display text-2xl">Café Bistro</span></div><p className="mt-4 max-w-sm text-sm leading-6 text-white/50">Good food. Warm stays. Memorable moments.</p></div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-sm text-white/60"><a href="#menu">Menu</a><a href="#about">About</a><a href="#gallery">Gallery</a><a href="#events">Events</a><a href="#contact">Contact</a><a href="#home">Back to top</a></div>
        </div>
        <div className="container-page mt-12 border-t border-white/10 pt-6 text-xs text-white/35">© 2026 Café Bistro. Built for the next phase: Firebase, bookings, auth and admin.</div>
      </footer>

      </>}

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

      {route === "/admin" && (
        <AdminDashboard onBackToSite={() => navigate("/")} />
      )}

      {route === "/dashboard" && (
        <div className="min-h-screen bg-[#f6f3ea]">
          <div className="flex min-h-screen">
            <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-black/5 bg-ink text-white lg:flex">
              <div className="flex h-24 items-center gap-3 border-b border-white/10 px-7">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-forest text-cream"><Coffee size={21}/></span>
                <div>
                  <div className="font-display text-xl font-bold">Café Bistro</div>
                  <div className="text-[11px] uppercase tracking-[.18em] text-white/40">Guest portal</div>
                </div>
              </div>
              <nav className="flex-1 space-y-2 px-4 py-7">
                <button className="flex w-full items-center gap-3 rounded-2xl bg-white/10 px-4 py-3.5 text-left text-sm font-semibold text-white"><CalendarCheck size={18}/> Dashboard</button>
                <button onClick={() => { void loadMyBookings(); }} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-sm font-semibold text-white/55 hover:bg-white/5 hover:text-white"><CalendarDays size={18}/> My Bookings</button>
                <button onClick={() => window.scrollTo({ top: 0 })} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-sm font-semibold text-white/55 hover:bg-white/5 hover:text-white"><UserRound size={18}/> My Profile</button>
              </nav>
              <div className="border-t border-white/10 p-5">
                <button onClick={() => navigate("/")} className="mb-2 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-white/65 hover:bg-white/5 hover:text-white"><ArrowRight className="rotate-180" size={17}/> Back to site</button>
                <button onClick={logout} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-white/65 hover:bg-white/5 hover:text-white"><LogOut size={17}/> Logout</button>
              </div>
            </aside>

            <div className="min-w-0 flex-1">
              <header className="sticky top-0 z-30 border-b border-black/5 bg-[#f6f3ea]/90 backdrop-blur">
                <div className="flex h-20 items-center justify-between px-5 sm:px-8 lg:px-10">
                  <div className="flex items-center gap-3">
                    <button onClick={() => navigate("/")} className="grid h-10 w-10 place-items-center rounded-full bg-forest text-cream lg:hidden"><Coffee size={19}/></button>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[.18em] text-forest">Guest dashboard</p>
                      <h1 className="font-display text-xl font-bold sm:text-2xl">Welcome back, {user?.displayName?.split(" ")[0] || "Guest"}</h1>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => navigate("/")} className="hidden rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold hover:border-forest sm:block">Back to site</button>
                    {user ? <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-forest text-sm font-bold text-white">{user.photoURL ? <img src={user.photoURL} alt="" className="h-full w-full object-cover"/> : (user.displayName || user.email || "U").charAt(0).toUpperCase()}</div> : null}
                  </div>
                </div>
              </header>

              <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
                {!user ? (
                  <section className="grid min-h-[60vh] place-items-center">
                    <div className="max-w-md rounded-[2rem] border border-black/5 bg-white p-8 text-center shadow-sm">
                      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-sage text-forest"><UserRound size={25}/></div>
                      <h2 className="mt-5 font-display text-3xl">Sign in to your dashboard</h2>
                      <p className="mt-3 text-sm leading-6 text-ink/55">Your bookings and account details are available after you sign in.</p>
                      <button onClick={() => setAuthOpen(true)} className="mt-6 rounded-full bg-forest px-6 py-3 font-semibold text-white">Login / Sign up</button>
                    </div>
                  </section>
                ) : (
                  <>
                    <div className="mb-8 flex items-end justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[.2em] text-forest">Overview</p>
                        <h2 className="mt-2 font-display text-4xl sm:text-5xl">Your Café Bistro account.</h2>
                      </div>
                      <button onClick={loadMyBookings} disabled={bookingsLoading} className="hidden rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold hover:border-forest disabled:opacity-50 sm:block">{bookingsLoading ? "Refreshing..." : "Refresh"}</button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      <div className="rounded-3xl bg-forest p-6 text-white">
                        <div className="flex items-center justify-between"><span className="text-sm text-white/60">Total reservations</span><CalendarCheck size={20}/></div>
                        <div className="mt-8 font-display text-5xl">{myBookings.length}</div>
                        <p className="mt-2 text-sm text-white/55">All table requests on this account</p>
                      </div>
                      <div className="rounded-3xl border border-black/5 bg-white p-6">
                        <div className="flex items-center justify-between"><span className="text-sm text-ink/55">Pending</span><Clock3 className="text-gold" size={20}/></div>
                        <div className="mt-8 font-display text-5xl">{myBookings.filter((b: any) => String(b.status || "pending").toLowerCase() === "pending").length}</div>
                        <p className="mt-2 text-sm text-ink/45">Awaiting confirmation</p>
                      </div>
                      <div className="rounded-3xl border border-black/5 bg-white p-6 sm:col-span-2 xl:col-span-1">
                        <div className="flex items-center justify-between"><span className="text-sm text-ink/55">Account</span><UserRound className="text-forest" size={20}/></div>
                        <div className="mt-6 truncate font-semibold">{user.email}</div>
                        <p className="mt-2 text-sm text-ink/45">Signed in securely with Firebase</p>
                      </div>
                    </div>

                    <div className="mt-8 rounded-[2rem] border border-black/5 bg-white p-6 sm:p-8">
                      <div className="flex items-start justify-between gap-4">
                        <div><p className="text-xs font-bold uppercase tracking-[.2em] text-forest">Reservations</p><h2 className="mt-2 font-display text-3xl sm:text-4xl">My bookings</h2></div>
                        <button onClick={loadMyBookings} disabled={bookingsLoading} className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold hover:border-forest disabled:opacity-50 sm:hidden">{bookingsLoading ? "..." : "Refresh"}</button>
                      </div>
                      {dashboardError && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{dashboardError}</div>}
                      {bookingsLoading ? (
                        <div className="grid min-h-56 place-items-center text-ink/40"><Loader2 className="animate-spin" size={28}/></div>
                      ) : myBookings.length === 0 ? (
                        <div className="mt-7 rounded-3xl bg-[#f6f3ea] p-8 text-center">
                          <CalendarCheck className="mx-auto text-forest" size={38}/>
                          <h3 className="mt-4 font-display text-2xl">No reservations yet.</h3>
                          <p className="mt-2 text-sm text-ink/55">Your table reservations will appear here after you submit a request.</p>
                          <button onClick={() => { navigate("/"); setBookingOpen(true); }} className="mt-5 rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white">Book a table</button>
                        </div>
                      ) : (
                        <div className="mt-7 space-y-4">
                          {myBookings.map((booking: any) => {
                            const status = String(booking.status || "pending").toLowerCase();
                            const cancelled = status === "cancelled";
                            const confirmed = status === "confirmed";
                            return <article key={booking.id} className="rounded-2xl border border-black/5 bg-[#f6f3ea] p-5">
                              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                                <div>
                                  <div className="flex items-center gap-2">{confirmed ? <CircleCheck className="text-green-700" size={19}/> : cancelled ? <CircleX className="text-red-600" size={19}/> : <Clock3 className="text-gold" size={19}/>}<span className="text-xs font-bold uppercase tracking-wider text-ink/45">Table reservation</span></div>
                                  <h3 className="mt-2 font-display text-2xl">{booking.date}</h3>
                                  <p className="mt-1 text-sm text-ink/60">{booking.guests} {Number(booking.guests) === 1 ? "guest" : "guests"} · {booking.phone}</p>
                                </div>
                                <span className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize ${confirmed ? "bg-green-100 text-green-800" : cancelled ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>{status}</span>
                              </div>
                              {booking.specialRequest && <p className="mt-4 rounded-xl bg-white px-4 py-3 text-sm text-ink/60"><b>Request:</b> {booking.specialRequest}</p>}
                              {!cancelled && <button onClick={() => cancelBooking(booking.id)} disabled={bookingActionId === booking.id} className="mt-4 rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">{bookingActionId === booking.id ? "Cancelling..." : "Cancel reservation"}</button>}
                            </article>;
                          })}
                        </div>
                      )}
                    </div>

                    <div className="mt-8 grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
                      <section className="rounded-[2rem] border border-black/5 bg-white p-6 sm:p-8">
                        <p className="text-xs font-bold uppercase tracking-[.2em] text-forest">Profile</p>
                        <h2 className="mt-2 font-display text-3xl">Account details</h2>
                        <div className="mt-6 grid gap-4 sm:grid-cols-2">
                          <div className="rounded-2xl bg-[#f6f3ea] p-4"><span className="text-xs uppercase tracking-wider text-ink/40">Name</span><p className="mt-2 font-semibold">{user.displayName || "Not set"}</p></div>
                          <div className="rounded-2xl bg-[#f6f3ea] p-4"><span className="text-xs uppercase tracking-wider text-ink/40">Email</span><p className="mt-2 truncate font-semibold">{user.email}</p></div>
                        </div>
                      </section>
                      <section className="rounded-[2rem] bg-sage p-6 sm:p-8">
                        <p className="text-xs font-bold uppercase tracking-[.2em] text-forest">Need something?</p>
                        <h2 className="mt-2 font-display text-3xl">Plan your next visit.</h2>
                        <p className="mt-3 text-sm leading-6 text-ink/60">Reserve a table or return to the café to explore the menu and events.</p>
                        <button onClick={() => { navigate("/"); setBookingOpen(true); }} className="mt-6 rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white">Book a table</button>
                      </section>
                    </div>
                  </>
                )}
              </main>
            </div>
          </div>
        </div>
      )}

      {bookingOpen && <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4" onClick={() => setBookingOpen(false)}>
        <div className="w-full max-w-lg rounded-3xl bg-cream p-7 shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between"><div><h2 className="font-display text-3xl">Book a table</h2><p className="mt-1 text-sm text-ink/50">Request a reservation in a few seconds.</p></div><button onClick={() => setBookingOpen(false)}><X/></button></div>
          {!user && <div className="mt-5 rounded-xl border border-forest/15 bg-sage/50 px-4 py-3 text-sm text-ink/70">Please login or sign up before requesting a reservation.</div>}
          <form onSubmit={submitBooking}>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <input value={bookingForm.name} onChange={e => setBookingForm(v => ({...v, name: e.target.value}))} className="rounded-xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-forest" placeholder="Your name" required />
              <input value={bookingForm.phone} onChange={e => setBookingForm(v => ({...v, phone: e.target.value}))} type="tel" className="rounded-xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-forest" placeholder="Phone number" required />
              <input value={bookingForm.date} onChange={e => setBookingForm(v => ({...v, date: e.target.value}))} type="date" min={new Date().toISOString().split("T")[0]} className="rounded-xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-forest" required />
              <select value={bookingForm.guests} onChange={e => setBookingForm(v => ({...v, guests: e.target.value}))} className="rounded-xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-forest">
                <option value="2">2 guests</option><option value="3">3 guests</option><option value="4">4 guests</option><option value="5">5+ guests</option>
              </select>
            </div>
            <textarea value={bookingForm.specialRequest} onChange={e => setBookingForm(v => ({...v, specialRequest: e.target.value}))} className="mt-4 min-h-28 w-full rounded-xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-forest" placeholder="Any special request?" />
            {bookingError && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{bookingError}</div>}
            {bookingMessage && <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{bookingMessage}</div>}
            <button type="submit" disabled={bookingSaving} className="mt-4 w-full rounded-full bg-forest py-3.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{bookingSaving ? "Saving reservation..." : "Request reservation"}</button>
          </form>
          <p className="mt-3 text-center text-xs text-ink/45">Your request is saved securely to your Firebase account.</p>
        </div>
      </div>}
    </div>
  );
}

export default App;