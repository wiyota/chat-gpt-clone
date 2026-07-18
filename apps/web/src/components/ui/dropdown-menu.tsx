import type { ComponentProps, ValidComponent } from "solid-js";
import { mergeProps, splitProps } from "solid-js";
import { DropdownMenu as DropdownMenuPrimitive } from "@kobalte/core/dropdown-menu";

import { cx } from "@/lib/cva";

export const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

export type DropdownMenuProps = ComponentProps<typeof DropdownMenuPrimitive>;

export const DropdownMenu = (props: DropdownMenuProps) => {
  const merge = mergeProps<DropdownMenuProps[]>(
    {
      gutter: 4,
    },
    props,
  );

  return <DropdownMenuPrimitive data-slot="dropdown-menu" {...merge} />;
};

export type DropdownMenuTriggerProps<T extends ValidComponent = "div"> = ComponentProps<
  typeof DropdownMenuPrimitive.Trigger<T>
>;

export const DropdownMenuTrigger = <T extends ValidComponent = "div">(
  props: DropdownMenuTriggerProps<T>,
) => {
  return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
};

export type DropdownMenuContentProps<T extends ValidComponent = "div"> = ComponentProps<
  typeof DropdownMenuPrimitive.Content<T>
>;

export const DropdownMenuContent = <T extends ValidComponent = "div">(
  props: DropdownMenuContentProps<T>,
) => {
  const [, rest] = splitProps(props as DropdownMenuContentProps, ["class"]);

  return (
    <DropdownMenuPrimitive.Content
      data-slot="dropdown-menu-content"
      class={cx(
        "z-50 min-w-[8rem] overflow-x-hidden overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-none",
        props.class,
      )}
      {...rest}
    />
  );
};

export type DropdownMenuItemProps<T extends ValidComponent = "div"> = ComponentProps<
  typeof DropdownMenuPrimitive.Item<T>
> & {
  inset?: boolean;
};

export const DropdownMenuItem = <T extends ValidComponent = "div">(
  props: DropdownMenuItemProps<T>,
) => {
  const [, rest] = splitProps(props as DropdownMenuItemProps, ["class", "inset"]);

  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={props.inset}
      class={cx(
        "relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[inset]:pl-8",
        props.class,
      )}
      {...rest}
    />
  );
};

export type DropdownMenuSeparatorProps<T extends ValidComponent = "hr"> = ComponentProps<
  typeof DropdownMenuPrimitive.Separator<T>
>;

export const DropdownMenuSeparator = <T extends ValidComponent = "hr">(
  props: DropdownMenuSeparatorProps<T>,
) => {
  const [, rest] = splitProps(props as DropdownMenuSeparatorProps, ["class"]);

  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      class={cx("-mx-1 my-1 h-px bg-border", props.class)}
      {...rest}
    />
  );
};
