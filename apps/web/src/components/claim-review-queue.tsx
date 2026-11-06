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
  const handoverQueue = useQuery(trpc.claims.approvedQueue.queryOptions());

  const invalidateQueues = () =>
    Promise.all([
      queryClient.invalidateQueries(trpc.claims.reviewQueue.queryFilter()),
      queryClient.invalidateQueries(trpc.claims.approvedQueue.queryFilter()),
    ]);

  const approveClaim = useMutation(
    trpc.claims.approve.mutationOptions({
      onError: (error) => toast.error(error.message),
      onSuccess: async () => {
        toast.success("Claim approved.");
        await invalidateQueues();
      },
    })
  );
  const rejectClaim = useMutation(
    trpc.claims.reject.mutationOptions({
      onError: (error) => toast.error(error.message),
      onSuccess: async () => {
        toast.success("Claim rejected.");
        await invalidateQueues();
      },
    })
  );
  const handoverItem = useMutation(
    trpc.claims.handover.mutationOptions({
      onError: (error) => toast.error(error.message),
      onSuccess: async () => {
        toast.success("Item marked as handed over.");
        await Promise.all([
          invalidateQueues(),
          queryClient.invalidateQueries(trpc.items.claimed.queryFilter()),
        ]);
      },
    })
  );

  if (queue.isPending || handoverQueue.isPending) {
    return (
      <div aria-label="Loading staff queues" className="grid gap-3">
        {Array.from({ length: 2 }, (_, index) => (
          <Skeleton className="h-64 w-full" key={index} />
        ))}
      </div>
    );
  }
  if (queue.isError || handoverQueue.isError) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>Could not load staff queues</EmptyTitle>
          <EmptyDescription>
            {queue.error?.message ?? handoverQueue.error?.message}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const reviewing = approveClaim.isPending || rejectClaim.isPending;
  return (
    <div className="grid gap-8">
      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">Pending claims</h2>
        {queue.data.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>No pending claims</EmptyTitle>
              <EmptyDescription>
                New claims with proof notes will appear here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
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
                      <h3 className="mb-2 text-sm font-medium">Proof note</h3>
                      <p className="text-sm whitespace-pre-wrap">
                        {claim.proofNote}
                      </p>
                    </CardContent>
                    <CardFooter className="flex flex-wrap gap-2">
                      <Button
                        disabled={reviewing}
                        onClick={() =>
                          approveClaim.mutate({ claimId: claim.claimId })
                        }
                      >
                        {approveClaim.isPending ? "Approving..." : "Approve"}
                      </Button>
                      <Button
                        disabled={reviewing}
                        onClick={() =>
                          rejectClaim.mutate({ claimId: claim.claimId })
                        }
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
        )}
      </section>
      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">
          Approved claims awaiting handover
        </h2>
        {handoverQueue.data.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>No items awaiting handover</EmptyTitle>
              <EmptyDescription>
                Approved claims appear here until staff hands the item over.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {handoverQueue.data.map((approved) => (
              <li key={approved.claimId}>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle>{approved.itemTitle}</CardTitle>
                      <Badge>Approved</Badge>
                    </div>
                    <CardDescription>
                      Claimed by {approved.claimantEmail}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button
                      disabled={handoverItem.isPending}
                      onClick={() =>
                        handoverItem.mutate({ itemId: approved.itemId })
                      }
                    >
                      {handoverItem.isPending
                        ? "Saving..."
                        : "Mark as handed over"}
                    </Button>
                  </CardFooter>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default ClaimReviewQueue;
