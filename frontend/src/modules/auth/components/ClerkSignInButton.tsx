import { useEffect, useRef } from 'react';
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  SignInButton,
  useAuth as useClerkAuth,
  useClerk,
} from '@clerk/clerk-react';
import { colors } from '@/styles/theme';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

/** Nothing renders and no Clerk code runs when the key is absent. */
export const clerkSignInEnabled = Boolean(PUBLISHABLE_KEY);

interface Props {
  /** Receives the Clerk session JWT, to be exchanged at POST /auth/clerk. */
  onSessionToken: (token: string) => void;
  disabled?: boolean;
}

const buttonStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 16px',
  borderRadius: 8,
  border: `1px solid ${colors.border}`,
  background: 'transparent',
  color: colors.text.primary,
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
};

/**
 * Once Clerk reports a session, hand the JWT up so it can be traded for one of
 * this app's own tokens. Clerk establishes *identity*; role, permissions and
 * the PENDING-approval gate stay server-side in the users table.
 */
function ExchangeOnSignIn({ onSessionToken }: { onSessionToken: (t: string) => void }) {
  const { getToken, isSignedIn } = useClerkAuth();
  const { signOut } = useClerk();
  // The exchange must fire once per Clerk session, not on every render — and
  // not again after the parent re-renders from the resulting auth state change.
  const exchanged = useRef(false);

  useEffect(() => {
    if (!isSignedIn || exchanged.current) return;
    exchanged.current = true;
    (async () => {
      try {
        const token = await getToken();
        if (token) onSessionToken(token);
        else await signOut();
      } catch {
        // Leave the app's own login form usable if Clerk misbehaves.
        exchanged.current = false;
      }
    })();
  }, [isSignedIn, getToken, onSessionToken, signOut]);

  return null;
}

export default function ClerkSignInButton({ onSessionToken, disabled }: Props) {
  if (!PUBLISHABLE_KEY) return null;

  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/login">
      <SignedOut>
        <SignInButton mode="modal">
          <button type="button" style={buttonStyle} disabled={disabled}>
            Continue with Clerk
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <ExchangeOnSignIn onSessionToken={onSessionToken} />
        <div style={{ color: colors.text.muted, fontSize: 13, textAlign: 'center' }}>
          Signing you in…
        </div>
      </SignedIn>
    </ClerkProvider>
  );
}
