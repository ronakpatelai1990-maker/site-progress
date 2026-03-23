import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, AlertTriangle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center max-w-sm">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl gradient-amber">
          <AlertTriangle className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-6xl font-black text-foreground mb-2">404</h1>
        <p className="text-lg text-muted-foreground mb-8">
          This page doesn't exist or has been moved.
        </p>
        <Button
          onClick={() => navigate('/')}
          className="min-h-[52px] gap-2 gradient-amber text-accent-foreground border-0 rounded-2xl text-base font-semibold px-8"
        >
          <Home className="h-5 w-5" />
          Go Home
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
