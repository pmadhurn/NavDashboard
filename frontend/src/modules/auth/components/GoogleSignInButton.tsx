import { useEffect, useRef } from 'react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const GSI_SRC = 'https://accounts.google.com/gsi/client';

export const googleSignInEnabled = Boolean(GOOGLE_CLIENT_ID);

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: object) => void;
          renderButton: (el: HTMLElement, options: object) => void;
        };
      };
    };
  }
}

interface Props {
  onCredential: (credential: string) => void;
}

/**
 * Renders the official Google Identity Services button.
 * Renders nothing when VITE_GOOGLE_CLIENT_ID is not configured.
 */
export default function GoogleSignInButton({ onCredential }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  callbackRef.current = onCredential;

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !containerRef.current) return;

    const renderButton = () => {
      if (!window.google || !containerRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response: { credential: string }) => {
          callbackRef.current(response.credential);
        },
      });
      window.google.accounts.id.renderButton(containerRef.current, {
        theme: 'filled_black',
        size: 'large',
        width: 352,
        text: 'signin_with',
        shape: 'pill',
      });
    };

    if (window.google) {
      renderButton();
      return;
    }

    let script = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
    if (!script) {
      script = document.createElement('script');
      script.src = GSI_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener('load', renderButton);
    return () => script?.removeEventListener('load', renderButton);
  }, []);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div
      ref={containerRef}
      style={{ display: 'flex', justifyContent: 'center', minHeight: 44 }}
    />
  );
}
