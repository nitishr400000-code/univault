"use client";

import { useForm } from "@tanstack/react-form";
import { Button } from "@univault/ui/components/button";
import { Input } from "@univault/ui/components/input";
import { Label } from "@univault/ui/components/label";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";

import { authClient } from "@/lib/auth-client";

const ProfileNameForm = ({ name }: { name: string }) => {
  const router = useRouter();
  const form = useForm({
    defaultValues: { name },
    onSubmit: async ({ value }) => {
      const result = await authClient.updateUser({ name: value.name.trim() });
      if (result.error) {
        toast.error(result.error.message || "Could not update your name.");
        return;
      }

      toast.success("Name updated");
      router.refresh();
    },
    validators: {
      onSubmit: z.object({
        name: z.string().trim().min(2, "Name must be at least 2 characters"),
      }),
    },
  });

  return (
    <form
      className="grid max-w-md gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        form.handleSubmit();
      }}
    >
      <form.Field name="name">
        {(field) => (
          <div className="grid gap-2">
            <Label htmlFor={field.name}>Name</Label>
            <Input
              autoComplete="name"
              id={field.name}
              name={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
            {field.state.meta.errors.map((error) => (
              <p key={error?.message} className="text-destructive text-sm">
                {error?.message}
              </p>
            ))}
          </div>
        )}
      </form.Field>
      <p className="text-muted-foreground text-sm">
        Campus email cannot be changed here.
      </p>
      <form.Subscribe
        selector={(state) => ({
          canSubmit: state.canSubmit,
          isSubmitting: state.isSubmitting,
        })}
      >
        {({ canSubmit, isSubmitting }) => (
          <Button disabled={!canSubmit || isSubmitting} type="submit">
            {isSubmitting ? "Saving..." : "Save name"}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
};

export default ProfileNameForm;
