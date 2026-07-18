import { Dialog as DialogPrimitive } from "@kobalte/core/dialog";
import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";
import { cx } from "@/lib/cva";

export const Dialog = DialogPrimitive;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.CloseButton;

export type DialogContentProps = ComponentProps<typeof DialogPrimitive.Content>;

export function DialogContent(props: DialogContentProps) {
  const [, rest] = splitProps(props, ["class", "children"]);

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        class={cx(
          "fixed inset-0 z-50 bg-black/50 data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:animate-in data-[expanded]:fade-in-0",
        )}
      />
      <DialogPrimitive.Content
        class={cx(
          "fixed top-[50%] left-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:zoom-out-95 data-[closed]:slide-out-to-left-1/2 data-[closed]:slide-out-to-top-[48%] data-[expanded]:animate-in data-[expanded]:fade-in-0 data-[expanded]:zoom-in-95 data-[expanded]:slide-in-from-left-1/2 data-[expanded]:slide-in-from-top-[48%] sm:rounded-lg",
          props.class,
        )}
        {...rest}
      >
        {props.children}
        <DialogPrimitive.CloseButton class="absolute top-4 right-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none disabled:pointer-events-none data-[expanded]:bg-accent data-[expanded]:text-muted-foreground">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="size-4"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
          <span class="sr-only">Close</span>
        </DialogPrimitive.CloseButton>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export type DialogHeaderProps = ComponentProps<"div">;

export function DialogHeader(props: DialogHeaderProps) {
  const [, rest] = splitProps(props, ["class"]);

  return (
    <div class={cx("flex flex-col space-y-1.5 text-center sm:text-left", props.class)} {...rest}>
      {props.children}
    </div>
  );
}

export type DialogFooterProps = ComponentProps<"div">;

export function DialogFooter(props: DialogFooterProps) {
  const [, rest] = splitProps(props, ["class"]);

  return (
    <div
      class={cx("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", props.class)}
      {...rest}
    >
      {props.children}
    </div>
  );
}

export type DialogTitleProps = ComponentProps<typeof DialogPrimitive.Title>;

export function DialogTitle(props: DialogTitleProps) {
  const [, rest] = splitProps(props, ["class"]);

  return (
    <DialogPrimitive.Title
      class={cx("text-lg leading-none font-semibold tracking-tight", props.class)}
      {...rest}
    />
  );
}

export type DialogDescriptionProps = ComponentProps<typeof DialogPrimitive.Description>;

export function DialogDescription(props: DialogDescriptionProps) {
  const [, rest] = splitProps(props, ["class"]);

  return (
    <DialogPrimitive.Description
      class={cx("text-sm text-muted-foreground", props.class)}
      {...rest}
    />
  );
}
