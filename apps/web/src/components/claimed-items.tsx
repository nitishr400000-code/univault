"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@univault/ui/components/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@univault/ui/components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@univault/ui/components/empty";
import Link from "next/link";

import { useTRPC } from "@/utils/trpc";

const ClaimedItems = () => {
  const trpc = useTRPC();
  const items = useQuery(trpc.items.claimed.queryOptions());

  if (items.isPending) {
    return <p aria-live="polite">Loading claimed items...</p>;
  }
  if (items.isError) {
    return (
      <p role="alert">Could not load claimed items: {items.error.message}</p>
    );
  }
  if (items.data.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>No items have been handed over</EmptyTitle>
          <EmptyDescription>
            Items marked as handed over will remain visible to staff here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {items.data.map((item) => (
        <li key={item.id}>
          <Link className="block" href={`/items/${item.id}`}>
            <Card className="hover:bg-muted/50 h-full transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>{item.title}</CardTitle>
                  <Badge>Claimed</Badge>
                </div>
                <CardDescription>
                  {item.category} · {item.placeFound} · Found {item.foundAt}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
};

export default ClaimedItems;
