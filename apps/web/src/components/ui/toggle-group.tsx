import { splitProps, type ComponentProps, type ValidComponent } from "solid-js";
import { ToggleGroup as ToggleGroupPrimitive } from "@kobalte/core/toggle-group";

import { cx } from "@/lib/cva";

export type ToggleGroupProps<T extends ValidComponent = "div"> = ComponentProps<
  typeof ToggleGroupPrimitive<T>
>;

export const ToggleGroup = <T extends ValidComponent = "div">(props: ToggleGroupProps<T>) => {
  const [, rest] = splitProps(props as ToggleGroupProps, ["class"]);

  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      class={cx(
        "flex w-full flex-row items-stretch justify-center rounded-md bg-muted p-1",
        props.class,
      )}
      {...rest}
    />
  );
};

export type ToggleGroupItemProps<T extends ValidComponent = "button"> = ComponentProps<
  typeof ToggleGroupPrimitive.Item<T>
>;

export const ToggleGroupItem = <T extends ValidComponent = "button">(
  props: ToggleGroupItemProps<T>,
) => {
  const [, rest] = splitProps(props as ToggleGroupItemProps, ["class"]);

  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      class={cx(
        "inline-flex flex-1 items-center justify-center rounded-sm px-3 text-sm font-medium transition-colors",
        "data-[selected]:bg-muted-foreground/30 data-[selected]:text-foreground aria-pressed:bg-muted-foreground/30 aria-pressed:text-foreground",
        "hover:bg-muted-foreground/10 hover:text-foreground",
        props.class,
      )}
      {...rest}
    />
  );
};
