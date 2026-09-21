import { FormEvent, useState } from "react";
import { Eye, EyeOff, Loader2, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";

type AuthMode = "login" | "signup";

type AuthModalProps = {
  open: boolean;
  onClose: () => void;
};

function friendlyError(error: unknown) {
  const code = (error as { code?: string })?.code || "";
  const messages: Record<string, string> = {
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/user-not-found": "No account exists with this email.",
    "auth/wrong-password": "Email or password is incorrect.",
    "auth/email-already-in-use": "An account already exists with this email.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/popup-closed-by-user": "Google sign-in was cancelled.",
    "auth/popup-blocked": "Your browser blocked the Google sign-in popup. Allow popups and try again.",
    "auth/operation-not-allowed": "This sign-in method is not enabled in Firebase Authentication.",
  };
  return messages[code] || "Something went wrong. Please try again.";
}

export default function AuthModal({ open, onClose }: AuthModalProps) {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (mode === "signup" && !name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        await signUp(name, email, password);
      } else {
        await signIn(email, password);
      }
      setName("");
      setEmail("");
      setPassword("");
      onClose();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  const googleLogin = async () => {
    setError("");
    setGoogleBusy(true);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setGoogleBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-black/55 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-[2rem] bg-cream p-7 shadow-2xl sm:p-8"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-forest">Café Bistro</p>
            <h2 id="auth-title" className="mt-2 font-display text-4xl">
              {mode === "login" ? "Welcome back." : "Create your account."}
            </h2>
            <p className="mt-2 text-sm text-ink/55">
              {mode === "login"
                ? "Sign in to manage your bookings and orders."
                : "Create an account to book tables and manage your visits."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-ink/60 hover:bg-black/5 hover:text-ink"
            aria-label="Close authentication dialog"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-7 grid grid-cols-2 rounded-full bg-white p-1">
          <button
            type="button"
            onClick={() => { setMode("login"); setError(""); }}
            className={`rounded-full py-2.5 text-sm font-semibold transition ${mode === "login" ? "bg-forest text-white" : "text-ink/55"}`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => { setMode("signup"); setError(""); }}
            className={`rounded-full py-2.5 text-sm font-semibold transition ${mode === "signup" ? "bg-forest text-white" : "text-ink/55"}`}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Full name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-forest"
                placeholder="Your name"
                autoComplete="name"
              />
            </label>
          )}

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Email</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-forest"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Password</span>
            <div className="relative">
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type={showPassword ? "text" : "password"}
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 pr-12 outline-none focus:border-forest"
                placeholder="At least 6 characters"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink/45 hover:text-ink"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || googleBusy}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-forest py-3.5 font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy && <Loader2 size={18} className="animate-spin" />}
            {mode === "login" ? "Login" : "Create account"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-black/10" />
          <span className="text-xs font-semibold uppercase tracking-wider text-ink/35">or</span>
          <span className="h-px flex-1 bg-black/10" />
        </div>

        <button
          type="button"
          onClick={googleLogin}
          disabled={busy || googleBusy}
          className="flex w-full items-center justify-center gap-3 rounded-full border border-black/10 bg-white py-3.5 font-semibold text-ink transition hover:border-forest disabled:cursor-not-allowed disabled:opacity-60"
        >
          {googleBusy ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <span className="grid h-5 w-5 place-items-center rounded-full border border-black/10 text-xs font-bold">G</span>
          )}
          Continue with Google
        </button>

        <p className="mt-5 text-center text-xs leading-5 text-ink/40">
          By continuing, you agree to use Café Bistro's account and booking services.
        </p>
      </div>
    </div>
  );
}
