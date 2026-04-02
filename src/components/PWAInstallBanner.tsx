import { useEffect, useState } from "react";
import { X, Download, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa-install-dismissed";

function isIOS() {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !(window as unknown as { MSStream?: unknown }).MSStream
  );
}

function isInStandaloneMode() {
  return (
    "standalone" in window.navigator &&
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

export function PWAInstallBanner() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSBanner, setShowIOSBanner] = useState(false);

  useEffect(() => {
    // Don't show if already installed or already dismissed
    if (isInStandaloneMode()) return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    // iOS Safari — no beforeinstallprompt, show manual instructions
    if (isIOS()) {
      setShowIOSBanner(true);
      return;
    }

    // Android / Chrome — listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setInstallPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "true");
    setShowBanner(false);
    setShowIOSBanner(false);
  };

  // Android / Chrome install banner
  if (showBanner) {
    return (
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          background: "#1e293b",
          color: "#f8fafc",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          boxShadow: "0 -2px 12px rgba(0,0,0,0.15)",
        }}
      >
        {/* App icon placeholder */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: "#f97316",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontWeight: 600,
            fontSize: 14,
            color: "#fff",
          }}
        >
          SS
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 500,
              color: "#f8fafc",
            }}
          >
            Install Site Stock Sync
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>
            Offline access — works without internet
          </p>
        </div>

        <button
          onClick={handleInstall}
          style={{
            background: "#f97316",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexShrink: 0,
          }}
        >
          <Download style={{ width: 14, height: 14 }} />
          Install
        </button>

        <button
          onClick={handleDismiss}
          style={{
            background: "transparent",
            border: "none",
            color: "#94a3b8",
            cursor: "pointer",
            padding: 4,
            display: "flex",
            alignItems: "center",
            flexShrink: 0,
          }}
          aria-label="Dismiss"
        >
          <X style={{ width: 18, height: 18 }} />
        </button>
      </div>
    );
  }

  // iOS Safari manual instructions banner
  if (showIOSBanner) {
    return (
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          background: "#1e293b",
          color: "#f8fafc",
          padding: "14px 16px",
          boxShadow: "0 -2px 12px rgba(0,0,0,0.15)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <Share
              style={{ width: 18, height: 18, color: "#f97316", flexShrink: 0, marginTop: 2 }}
            />
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#f8fafc",
                }}
              >
                Install Site Stock Sync
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>
                Tap the{" "}
                <span style={{ color: "#f97316", fontWeight: 500 }}>
                  Share
                </span>{" "}
                button in Safari, then tap{" "}
                <span style={{ color: "#f97316", fontWeight: 500 }}>
                  "Add to Home Screen"
                </span>{" "}
                for offline access.
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: 4,
              flexShrink: 0,
            }}
            aria-label="Dismiss"
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
