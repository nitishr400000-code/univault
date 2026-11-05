import {
  environmentManager,
  QueryCache,
  QueryClient,
} from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import type { AppRouter } from "@univault/api/routers/index";
import { toast } from "sonner";

const getServerUrl = (url: string) => {
  const processEnv = typeof process === "undefined" ? undefined : process.env;
  if (typeof window === "undefined" && processEnv?.SERVER_URL) {
    return processEnv.SERVER_URL.endsWith("/")
      ? processEnv.SERVER_URL.slice(0, -1)
      : processEnv.SERVER_URL;
  }

  return url.endsWith("/") ? url.slice(0, -1) : url;
};

export const { TRPCProvider, useTRPC, useTRPCClient } =
  createTRPCContext<AppRouter>();

const makeQueryClient = () =>
  new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        toast.error(error.message, {
          action: {
            label: "retry",
            onClick: () => {
              query.invalidate();
            },
          },
        });
      },
    }),
  });

let browserQueryClient: QueryClient | undefined;

export const getQueryClient = () => {
  if (environmentManager.isServer()) {
    return makeQueryClient();
  }

  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
};

export const makeTRPCClient = () => {
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
  if (!serverUrl) {
    throw new Error("NEXT_PUBLIC_SERVER_URL is not set.");
  }

  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        fetch(url, options) {
          return fetch(url, {
            ...options,
            credentials: "include",
          });
        },
        url: `${getServerUrl(serverUrl)}/trpc`,
      }),
    ],
  });
};
