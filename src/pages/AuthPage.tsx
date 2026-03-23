import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import logoImg from '/logo-512.png';

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) toast.error(error.message);
      else toast.success('Check your email to confirm your account');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <img src={logoImg} alt="Site Stock Sync" className="mx-auto h-20 w-20 rounded-2xl" />
          <h1 className="mt-5 text-2xl font-bold text-foreground">Site Stock Sync</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {isSignUp ? 'Create your account' : 'Sign in to continue'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div className="relative">
              <Input
                placeholder=" "
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="min-h-[52px] rounded-xl peer pt-5 pb-2"
                id="name"
              />
              <label htmlFor="name" className="absolute left-3 top-1.5 text-[10px] font-medium text-muted-foreground">
                Full Name
              </label>
            </div>
          )}
          <div className="relative">
            <Input
              type="email"
              placeholder=" "
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="min-h-[52px] rounded-xl pt-5 pb-2"
              id="email"
            />
            <label htmlFor="email" className="absolute left-3 top-1.5 text-[10px] font-medium text-muted-foreground">
              Email
            </label>
          </div>
          <div className="relative">
            <Input
              type="password"
              placeholder=" "
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="min-h-[52px] rounded-xl pt-5 pb-2"
              id="password"
            />
            <label htmlFor="password" className="absolute left-3 top-1.5 text-[10px] font-medium text-muted-foreground">
              Password
            </label>
          </div>
          <Button
            type="submit"
            className="min-h-[52px] w-full rounded-xl gradient-amber text-accent-foreground border-0 text-base font-bold"
            disabled={loading}
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent-foreground border-t-transparent" />
            ) : isSignUp ? 'Sign Up' : 'Sign In'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="font-semibold text-accent underline-offset-2 hover:underline"
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
}
