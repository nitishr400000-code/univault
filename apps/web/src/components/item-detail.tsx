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
import { Skeleton } from "@univault/ui/components/skeleton";
import Image from "next/image";
import Link from "next/link";

import { useTRPC } from "@/utils/trpc";

const ItemPhoto = ({
  itemTitle,
  photoId,
  position,
}: {
  itemTitle: string;
  photoId: string;
  position: number;
}) => {
  const trpc = useTRPC();
  const photo = useQuery(trpc.items.photo.queryOptions({ photoId }));

  if (photo.isPending) {
    return <Skeleton aria-label="Loading photo" className="h-48 w-full" />;
  }

  if (photo.isError) {
    return (
      <div
        aria-label={`Photo ${position + 1} unavailable`}
        className="text-muted-foreground flex h-48 items-center justify-center border text-sm"
      >
        Photo unavailable
      </div>
    );
  }

  return (
    <Image
      alt={`Photo ${position + 1} of ${itemTitle}`}
      className="h-48 w-full border object-contain"
      height={480}
      src={`data:${photo.data.contentType};base64,${photo.data.dataBase64}`}
      unoptimized
      width={640}
    />
  );
};

const ItemDetail = ({ id }: { id: string }) => {
  const trpc = useTRPC();
  const detail = useQuery(trpc.items.byId.queryOptions({ id }));

  if (detail.isPending) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </CardHeader>
        <CardContent className="grid gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (detail.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {detail.error.data?.code === "NOT_FOUND"
              ? "Item not found"
              : "Could not load this item"}
          </CardTitle>
          <CardDescription>{detail.error.message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link href="/items" />} variant="outline">
            Back to search
          </Button>
        </CardContent>
      </Card>
    );
  }

  const item = detail.data;

  return (
    <article className="grid gap-4">
      <Button
        className="w-fit"
        render={<Link href="/items" />}
        variant="outline"
      >
        Back to search
      </Button>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{item.category}</Badge>
            <Badge
              variant={item.status === "PendingClaim" ? "secondary" : "default"}
            >
              {item.status === "PendingClaim" ? "Pending claim" : item.status}
            </Badge>
          </div>
          <CardTitle className="text-xl">{item.title}</CardTitle>
          <CardDescription className="grid gap-1 sm:grid-cols-2">
            <span>Found at {item.placeFound}</span>
            <span>
              <time dateTime={item.foundAt}>Found on {item.foundAt}</time>
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <p className="text-sm whitespace-pre-wrap">{item.description}</p>
          <div
            aria-label="Item photos"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            {item.photos.map((photo) => (
              <ItemPhoto
                itemTitle={item.title}
                key={photo.id}
                photoId={photo.id}
                position={photo.position}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </article>
  );
};

export default ItemDetail;
