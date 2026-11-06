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

const MyPostsList = () => {
  const trpc = useTRPC();
  const posts = useQuery(trpc.items.myPosts.queryOptions());

  if (posts.isPending) {
    return (
      <div aria-label="Loading your posts" className="grid gap-3">
        {Array.from({ length: 2 }, (_, index) => (
          <Skeleton className="h-36 w-full" key={index} />
        ))}
      </div>
    );
  }

  if (posts.isError) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>Could not load your posts</EmptyTitle>
          <EmptyDescription>{posts.error.message}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (posts.data.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>No posts yet</EmptyTitle>
          <EmptyDescription>
            Your found item posts and their current status will appear here.
          </EmptyDescription>
        </EmptyHeader>
        <Button render={<Link href="/items/new" />} variant="outline">
          Post a found item
        </Button>
      </Empty>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {posts.data.map((post) => (
        <li key={post.id}>
          <Card className="h-full">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>{post.title}</CardTitle>
                <Badge variant="secondary">{post.status}</Badge>
              </div>
              <CardDescription>
                {post.category} · {post.placeFound} · Found {post.foundAt}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                render={<Link href={`/items/${post.id}`} />}
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

export default MyPostsList;
