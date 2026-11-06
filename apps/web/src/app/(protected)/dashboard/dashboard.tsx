"use client";

import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@/utils/trpc";

const Dashboard = () => {
  const trpc = useTRPC();
  const privateData = useQuery(trpc.privateData.queryOptions());

  return <p>API: {privateData.data?.message}</p>;
};

export default Dashboard;
