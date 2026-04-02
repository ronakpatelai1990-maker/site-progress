import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Wifi } from "lucide-react";

type Status = "online" | "offline" | "reconnected";

export function OfflineIndicator() {
  const [status, setStatus] = useState<Status>("online");

  useEffect(() => {
    // Set initial status
    if (!navigator.onLine) {
      setStatus("offline");
    }

    const handleOffline = () => {
      setStatus("offline");
    };

    const handleOnline = () => {
      setStatus("reconnected");
      // After 3 seconds hide the "back online" message
      setTimeout(() => {
        setStatus("online");
      }, 3000);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const isVisible = status === "offline" || status === "reconnected";

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key={status}
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          style={{
            position: "sticky",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9998,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "10px 16px",
            fontSize: 13,
            fontWeight: 500,
            color: "#fff",
            background: status === "offline" ? "#b45309" : "#15803d",
          }}
        >
          {status === "offline" ? (
            <>
              <WifiOff style={{ width: 15, height: 15 }} />
              You are offline — showing cached data
            </>
          ) : (
            <>
              <Wifi style={{ width: 15, height: 15 }} />
              Back online — syncing latest data...
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
