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
import { Field, FieldGroup, FieldLabel } from "@univault/ui/components/field";
import { Input } from "@univault/ui/components/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@univault/ui/components/select";
import Link from "next/link";
import { useState } from "react";

import { useTRPC } from "@/utils/trpc";

const categories = [
  "Electronics",
  "ID/Card",
  "Keys",
  "Stationery",
  "Personal Gear",
  "Other",
] as const;

type ItemCategory = (typeof categories)[number];

const ItemSearch = () => {
  const trpc = useTRPC();
  const [searchText, setSearchText] = useState("");
  const [keyword, setKeyword] = useState<string | undefined>();
  const [category, setCategory] = useState<ItemCategory | undefined>();
  const results = useQuery(
    trpc.items.search.queryOptions({
      category,
      keyword,
    })
  );
  const renderResults = () => {
    if (results.isPending) {
      return (
        <p aria-live="polite" className="text-muted-foreground text-sm">
          Loading found items…
        </p>
      );
    }
    if (results.isError) {
      return (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Could not load found items</EmptyTitle>
            <EmptyDescription>{results.error.message}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      );
    }
    if (results.data.length === 0) {
      return (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>No items found</EmptyTitle>
            <EmptyDescription>
              Try another keyword or category.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      );
    }

    return (
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {results.data.map((item) => (
          <li key={item.id}>
            <Link
              aria-label={`View ${item.title}`}
              className="focus-visible:outline-ring block h-full rounded-none focus-visible:outline-2"
              href={`/items/${item.id}`}
            >
              <Card className="hover:bg-muted/40 h-full transition-colors">
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{item.category}</Badge>
                    <Badge
                      variant={
                        item.status === "PendingClaim" ? "secondary" : "default"
                      }
                    >
                      {item.status === "PendingClaim"
                        ? "Pending claim"
                        : "Active"}
                    </Badge>
                  </div>
                  <CardTitle className="line-clamp-2 text-base">
                    {item.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {item.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">Place: </span>
                    {item.placeFound}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Found: </span>
                    <time dateTime={item.foundAt}>{item.foundAt}</time>
                  </p>
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="grid gap-6">
      <form
        className="grid gap-4 rounded-none border p-4 sm:grid-cols-[minmax(0,1fr)_16rem_auto] sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          setKeyword(searchText.trim() || undefined);
        }}
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="item-keyword">Keyword</FieldLabel>
            <Input
              autoComplete="off"
              id="item-keyword"
              name="keyword"
              placeholder="Title, description, or place"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
          </Field>
        </FieldGroup>
        <Field>
          <FieldLabel htmlFor="item-category">Category</FieldLabel>
          <Select
            value={category ?? "all"}
            onValueChange={(value) =>
              setCategory(
                value === "all" || value === null
                  ? undefined
                  : (value as ItemCategory)
              )
            }
          >
            <SelectTrigger id="item-category">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((itemCategory) => (
                  <SelectItem key={itemCategory} value={itemCategory}>
                    {itemCategory}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Button disabled={results.isFetching} type="submit">
          Search
        </Button>
      </form>

      {renderResults()}
    </div>
  );
};

export default ItemSearch;
