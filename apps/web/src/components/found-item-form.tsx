"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@univault/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@univault/ui/components/field";
import { Input } from "@univault/ui/components/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@univault/ui/components/select";
import { Textarea } from "@univault/ui/components/textarea";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";

import { useTRPC } from "@/utils/trpc";

const categories = [
  "Electronics",
  "ID/Card",
  "Keys",
  "Stationery",
  "Personal Gear",
  "Other",
] as const;
const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxFileSize = 5 * 1024 * 1024;

const formSchema = z.object({
  category: z.enum(categories),
  description: z.string().trim().min(1, "Enter a description."),
  foundAt: z.iso.date("Enter a valid date."),
  photos: z
    .array(z.instanceof(File))
    .min(1, "Choose at least one photo.")
    .max(5, "Choose no more than five photos.")
    .refine(
      (photos) => photos.every((photo) => photo.size <= maxFileSize),
      "Each photo must be 5 MB or smaller."
    )
    .refine(
      (photos) => photos.every((photo) => acceptedTypes.has(photo.type)),
      "Use JPEG, PNG, or WebP photos."
    ),
  placeFound: z.string().trim().min(1, "Enter where the item was found."),
  title: z.string().trim().min(1, "Enter a title."),
});

const fileToBase64 = async (file: File) => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const chunks: string[] = [];
  const chunkSize = 0x80_00;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    chunks.push(
      String.fromCodePoint(...bytes.subarray(offset, offset + chunkSize))
    );
  }
  return btoa(chunks.join(""));
};

const FoundItemForm = () => {
  const router = useRouter();
  const trpc = useTRPC();
  const createItem = useMutation(
    trpc.items.create.mutationOptions({
      onError: (error) => toast.error(error.message),
      onSuccess: () => {
        toast.success("Found item posted.");
        router.push("/dashboard");
      },
    })
  );

  const form = useForm({
    defaultValues: {
      category: "" as string,
      description: "",
      foundAt: "",
      photos: [] as File[],
      placeFound: "",
      title: "",
    },
    onSubmit: async ({ value }) => {
      const parsed = formSchema.parse(value);
      const photos = await Promise.all(
        parsed.photos.map(async (photo) => ({
          contentType: photo.type as "image/jpeg" | "image/png" | "image/webp",
          dataBase64: await fileToBase64(photo),
        }))
      );
      await createItem.mutateAsync({ ...parsed, photos });
    },
    validators: { onSubmit: formSchema },
  });

  return (
    <form
      className="max-w-xl"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        form.handleSubmit();
      }}
    >
      <FieldGroup>
        <form.Field name="title">
          {(field) => (
            <Field
              data-invalid={
                field.state.meta.isTouched && !field.state.meta.isValid
              }
            >
              <FieldLabel htmlFor={field.name}>Title</FieldLabel>
              <Input
                aria-invalid={
                  field.state.meta.isTouched && !field.state.meta.isValid
                }
                id={field.name}
                name={field.name}
                required
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
              />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>

        <form.Field name="description">
          {(field) => (
            <Field
              data-invalid={
                field.state.meta.isTouched && !field.state.meta.isValid
              }
            >
              <FieldLabel htmlFor={field.name}>Description</FieldLabel>
              <Textarea
                aria-invalid={
                  field.state.meta.isTouched && !field.state.meta.isValid
                }
                id={field.name}
                name={field.name}
                required
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
              />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>

        <form.Field name="category">
          {(field) => (
            <Field
              data-invalid={
                field.state.meta.isTouched && !field.state.meta.isValid
              }
            >
              <FieldLabel htmlFor={field.name}>Category</FieldLabel>
              <Select
                value={field.state.value}
                onValueChange={(value) => field.handleChange(value ?? "")}
              >
                <SelectTrigger
                  aria-invalid={
                    field.state.meta.isTouched && !field.state.meta.isValid
                  }
                  id={field.name}
                  onBlur={field.handleBlur}
                >
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>

        <form.Field name="placeFound">
          {(field) => (
            <Field
              data-invalid={
                field.state.meta.isTouched && !field.state.meta.isValid
              }
            >
              <FieldLabel htmlFor={field.name}>Place found</FieldLabel>
              <Input
                aria-invalid={
                  field.state.meta.isTouched && !field.state.meta.isValid
                }
                id={field.name}
                name={field.name}
                required
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
              />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>

        <form.Field name="foundAt">
          {(field) => (
            <Field
              data-invalid={
                field.state.meta.isTouched && !field.state.meta.isValid
              }
            >
              <FieldLabel htmlFor={field.name}>Date found</FieldLabel>
              <Input
                aria-invalid={
                  field.state.meta.isTouched && !field.state.meta.isValid
                }
                id={field.name}
                name={field.name}
                required
                type="date"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
              />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>

        <form.Field name="photos">
          {(field) => (
            <Field
              data-invalid={
                field.state.meta.isTouched && !field.state.meta.isValid
              }
            >
              <FieldLabel htmlFor={field.name}>Photos</FieldLabel>
              <Input
                accept="image/jpeg,image/png,image/webp"
                aria-invalid={
                  field.state.meta.isTouched && !field.state.meta.isValid
                }
                id={field.name}
                multiple
                name={field.name}
                required
                type="file"
                onBlur={field.handleBlur}
                onChange={(event) =>
                  field.handleChange([...(event.currentTarget.files ?? [])])
                }
              />
              <FieldDescription>
                Add 1–5 JPEG, PNG, or WebP photos. Each must be 5 MB or smaller.
              </FieldDescription>
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>

        <form.Subscribe
          selector={(state) => ({
            canSubmit: state.canSubmit,
            isSubmitting: state.isSubmitting,
          })}
        >
          {({ canSubmit, isSubmitting }) => (
            <Button
              disabled={!canSubmit || isSubmitting || createItem.isPending}
              type="submit"
            >
              {isSubmitting || createItem.isPending
                ? "Posting..."
                : "Post found item"}
            </Button>
          )}
        </form.Subscribe>
      </FieldGroup>
    </form>
  );
};

export default FoundItemForm;
