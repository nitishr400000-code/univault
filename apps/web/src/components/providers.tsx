"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "@univault/ui/components/sonner";
import { TooltipProvider } from "@univault/ui/components/tooltip";
import { useMemo } from "react";

import { getQueryClient, makeTRPCClient, TRPCProvider } from "@/utils/trpc";

import { ThemeProvider } from "./theme-provider";

const Providers = ({ children }: { children: React.ReactNode }) => {
  const queryClient = getQueryClient();
  const trpcClient = useMemo(() => makeTRPCClient(), []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider>
        <QueryClientProvider client={queryClient}>
          <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
            {children}
          </TRPCProvider>
          <ReactQueryDevtools />
        </QueryClientProvider>
        <Toaster richColors />
      </TooltipProvider>
    </ThemeProvider>
  );
};

export default Providers;
