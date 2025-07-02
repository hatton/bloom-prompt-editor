import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { Session } from "@supabase/supabase-js";

interface AuthWrapperProps {
  children: React.ReactNode;
}

export const AuthWrapper = ({ children }: AuthWrapperProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen bg-gray-500 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="h-screen bg-gray-500 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Bloom Prompt Editor
            </h1>
            <p className="text-gray-600 mt-2">Sign in to continue</p>
          </div>
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              style: {
                button: {
                  borderRadius: "6px",
                },
                input: {
                  borderRadius: "6px",
                },
              },
            }}
            providers={[]}
            showLinks={true}
          />
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
