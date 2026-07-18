import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";
import { cx } from "@/lib/cva";

export function Skeleton(props: ComponentProps<"div">) {
  const [, rest] = splitProps(props, ["class"]);
  return (
    <div class={cx("animate-pulse rounded-md bg-muted-foreground/20", props.class)} {...rest} />
  );
}
