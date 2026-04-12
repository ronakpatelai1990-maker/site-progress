import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import logoImg from '/logo-512.png';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Check for recovery event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });
    // Also check hash for type=recovery
    if (window.location.hash.includes('type=recovery')) {
      setReady(true);
    }
    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Password updated');
      navigate('/');
    }
    setLoading(false);
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Verifying reset link…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <img src={logoImg} alt="Site Stock Sync" className="mx-auto h-20 w-20 rounded-2xl" />
          <h1 className="mt-5 text-2xl font-bold text-foreground">Set New Password</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Enter your new password below</p>
        </div>
        <form onSubmit={handleReset} className="space-y-4">
          <div className="relative">
            <Input
              type="password"
              placeholder=" "
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              className="min-h-[52px] rounded-xl pt-5 pb-2"
              id="new-password"
            />
            <label htmlFor="new-password" className="absolute left-3 top-1.5 text-[10px] font-medium text-muted-foreground">
              New Password
            </label>
          </div>
          <div className="relative">
            <Input
              type="password"
              placeholder=" "
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              minLength={8}
              className="min-h-[52px] rounded-xl pt-5 pb-2"
              id="confirm-password"
            />
            <label htmlFor="confirm-password" className="absolute left-3 top-1.5 text-[10px] font-medium text-muted-foreground">
              Confirm Password
            </label>
          </div>
          <Button
            type="submit"
            className="min-h-[52px] w-full rounded-xl gradient-amber text-accent-foreground border-0 text-base font-bold"
            disabled={loading}
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent-foreground border-t-transparent" />
            ) : 'Update Password'}
          </Button>
        </form>
      </div>
    </div>
  );
}
