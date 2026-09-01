import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://wldifxcwobyeqbvwatgr.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsZGlmeGN3b2J5ZXFidndhdGdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNjczMjIsImV4cCI6MjEwMzg0MzMyMn0.RG6CnZP9TRAdclSXp0FeixhbakR3Dq-vittH427X9ZM"
  },
  allowedDevOrigins: ['172.16.0.24'],
};

export default nextConfig;
