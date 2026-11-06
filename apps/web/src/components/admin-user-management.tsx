"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@univault/ui/components/badge";
import { Button } from "@univault/ui/components/button";
import { Input } from "@univault/ui/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@univault/ui/components/table";
import { useState } from "react";
import { toast } from "sonner";

import { useTRPC } from "@/utils/trpc";

const onError = (error: { message: string }) => {
  toast.error(error.message);
};

const AdminUserManagement = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const users = useQuery(
    trpc.admin.listUsers.queryOptions({ search: search || undefined })
  );
  const refreshUsers = async () => {
    await queryClient.invalidateQueries({
      queryKey: trpc.admin.listUsers.queryKey(),
    });
  };
  const grantStaff = useMutation(
    trpc.admin.grantStaff.mutationOptions({
      onError,
      onSuccess: refreshUsers,
    })
  );
  const removeStaff = useMutation(
    trpc.admin.removeStaff.mutationOptions({
      onError,
      onSuccess: refreshUsers,
    })
  );
  const deactivateUser = useMutation(
    trpc.admin.deactivateUser.mutationOptions({
      onError,
      onSuccess: refreshUsers,
    })
  );
  const reactivateUser = useMutation(
    trpc.admin.reactivateUser.mutationOptions({
      onError,
      onSuccess: refreshUsers,
    })
  );
  const isUpdating =
    grantStaff.isPending ||
    removeStaff.isPending ||
    deactivateUser.isPending ||
    reactivateUser.isPending;

  return (
    <section className="grid gap-4">
      <form
        className="flex max-w-xl gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setSearch(searchText.trim());
        }}
      >
        <Input
          aria-label="Search by name or campus email"
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="Name or campus email"
          value={searchText}
        />
        <Button type="submit">Search</Button>
      </form>

      {users.isLoading ? (
        <p className="text-muted-foreground text-sm">Loading users…</p>
      ) : null}
      {users.error ? (
        <p className="text-destructive text-sm" role="alert">
          {users.error.message}
        </p>
      ) : null}
      {users.data && users.data.length === 0 ? (
        <p className="text-muted-foreground text-sm">No users found.</p>
      ) : null}

      {users.data && users.data.length > 0 ? (
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Campus email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.data.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role.replaceAll("_", " ")}</TableCell>
                  <TableCell>
                    <Badge variant={user.banned ? "destructive" : "secondary"}>
                      {user.banned ? "Deactivated" : "Active"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {user.role === "system_admin" ? (
                      <span className="text-muted-foreground text-sm">
                        Admin account
                      </span>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <Button
                          disabled={isUpdating || user.banned}
                          onClick={() =>
                            (user.role === "staff"
                              ? removeStaff
                              : grantStaff
                            ).mutate(
                              { userId: user.id },
                              {
                                onSuccess: () =>
                                  toast.success(
                                    user.role === "staff"
                                      ? "Staff access removed"
                                      : "Staff access granted"
                                  ),
                              }
                            )
                          }
                          size="sm"
                          variant="outline"
                        >
                          {user.role === "staff"
                            ? "Remove staff"
                            : "Grant staff"}
                        </Button>
                        <Button
                          disabled={isUpdating}
                          onClick={() =>
                            (user.banned
                              ? reactivateUser
                              : deactivateUser
                            ).mutate(
                              { userId: user.id },
                              {
                                onSuccess: () =>
                                  toast.success(
                                    user.banned
                                      ? "Account reactivated"
                                      : "Account deactivated"
                                  ),
                              }
                            )
                          }
                          size="sm"
                          variant={user.banned ? "outline" : "destructive"}
                        >
                          {user.banned ? "Reactivate" : "Deactivate"}
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </section>
  );
};

export default AdminUserManagement;
