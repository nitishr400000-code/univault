"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@univault/ui/components/badge";
import { Button } from "@univault/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { toast } from "sonner";

import { useTRPC } from "@/utils/trpc";

const ClaimReviewQueue = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const queue = useQuery(trpc.claims.reviewQueue.queryOptions());

  const invalidateQueue = async () => {
    await queryClient.invalidateQueries(trpc.claims.reviewQueue.queryFilter());
  };

  const approveClaim = useMutation(
    trpc.claims.approve.mutationOptions({
      onError: (error) => toast.error(error.message),
      onSuccess: async () => {
        toast.success("Claim approved.");
        await invalidateQueue();
      },
    })
  );

  const rejectClaim = useMutation(
    trpc.claims.reject.mutationOptions({
      onError: (error) => toast.error(error.message),
      onSuccess: async () => {
        toast.success("Claim rejected.");
        await invalidateQueue();
      },
    })
  );

  if (queue.isPending) {
    return (
      <div aria-label="Loading pending claims" className="grid gap-3">
        {Array.from({ length: 2 }, (_, index) => (
          <Skeleton className="h-64 w-full" key={index} />
        ))}
      </div>
    );
  }

  if (queue.isError) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>Could not load claim queue</EmptyTitle>
          <EmptyDescription>{queue.error.message}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (queue.data.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>No pending claims</EmptyTitle>
          <EmptyDescription>
            New claims will appear here when someone submits a proof note.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const isReviewing = approveClaim.isPending || rejectClaim.isPending;

  return (
    <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {queue.data.map((claim) => {
        const createdAt = new Date(String(claim.createdAt));
        return (
          <li key={claim.claimId}>
            <Card className="h-full">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle>{claim.itemTitle}</CardTitle>
                  <Badge variant="secondary">Pending</Badge>
                </div>
                <CardDescription>
                  Claimed by {claim.claimantEmail}
                </CardDescription>
                <CardDescription>
                  Submitted{" "}
                  <time dateTime={createdAt.toISOString()}>
                    {createdAt.toLocaleDateString()}
                  </time>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <h2 className="mb-2 text-sm font-medium">Proof note</h2>
                <p className="text-sm whitespace-pre-wrap">{claim.proofNote}</p>
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <Button
                  disabled={isReviewing}
                  onClick={() =>
                    approveClaim.mutate({ claimId: claim.claimId })
                  }
                >
                  {approveClaim.isPending ? "Approving..." : "Approve"}
                </Button>
                <Button
                  disabled={isReviewing}
                  onClick={() => rejectClaim.mutate({ claimId: claim.claimId })}
                  variant="destructive"
                >
                  {rejectClaim.isPending ? "Rejecting..." : "Reject"}
                </Button>
              </CardFooter>
            </Card>
          </li>
        );
      })}
    </ul>
  );
};

export default ClaimReviewQueue;
