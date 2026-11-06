"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@univault/ui/components/badge";
import { Button } from "@univault/ui/components/button";
import {
  Card,
  CardContent,
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
import { Skeleton } from "@univault/ui/components/skeleton";
import Link from "next/link";

import { useTRPC } from "@/utils/trpc";

const statusVariant = (status: string) => {
  switch (status) {
    case "Approved": {
      return "default" as const;
    }
    case "Rejected": {
      return "destructive" as const;
    }
    default: {
      return "secondary" as const;
    }
  }
};

const MyClaimsList = () => {
  const trpc = useTRPC();
  const myClaims = useQuery(trpc.claims.myClaims.queryOptions());

  if (myClaims.isPending) {
    return (
      <div aria-label="Loading your claims" className="grid gap-3">
        {Array.from({ length: 2 }, (_, index) => (
          <Skeleton className="h-36 w-full" key={index} />
        ))}
      </div>
    );
  }

  if (myClaims.isError) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>Could not load your claims</EmptyTitle>
          <EmptyDescription>{myClaims.error.message}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (myClaims.data.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>No claims yet</EmptyTitle>
          <EmptyDescription>
            Search found items and add a proof note to submit a claim.
          </EmptyDescription>
        </EmptyHeader>
        <Button render={<Link href="/items" />} variant="outline">
          Search found items
        </Button>
      </Empty>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {myClaims.data.map((claim) => (
        <li key={claim.id}>
          <Card className="h-full">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>{claim.itemTitle}</CardTitle>
                <Badge variant={statusVariant(claim.status)}>
                  {claim.status}
                </Badge>
              </div>
              <CardDescription>
                Item ID: <span className="font-mono">{claim.itemId}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <p className="text-sm whitespace-pre-wrap">{claim.proofNote}</p>
              <Button
                className="w-fit"
                render={<Link href={`/items/${claim.itemId}`} />}
                variant="outline"
              >
                View item
              </Button>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
};

export default MyClaimsList;
