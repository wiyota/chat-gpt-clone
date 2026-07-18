import type { ComponentProps, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";
import { TextField as TextFieldPrimitive } from "@kobalte/core/text-field";

import { cx } from "@/lib/cva";

export type TextFieldProps<T extends ValidComponent = "div"> = ComponentProps<
  typeof TextFieldPrimitive<T>
>;

export const TextField = <T extends ValidComponent = "div">(props: TextFieldProps<T>) => {
  const [, rest] = splitProps(props as TextFieldProps, ["class"]);

  return (
    <TextFieldPrimitive
      data-slot="text-field"
      class={cx("grid w-full gap-2", props.class)}
      {...rest}
    />
  );
};

export type TextFieldInputProps<T extends ValidComponent = "input"> = ComponentProps<
  typeof TextFieldPrimitive.Input<T>
>;

export const TextFieldInput = <T extends ValidComponent = "input">(
  props: TextFieldInputProps<T>,
) => {
  const [, rest] = splitProps(props as TextFieldInputProps, ["class"]);

  return (
    <TextFieldPrimitive.Input
      data-slot="text-field-input"
      class={cx(
        "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        "file:text-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        props.class,
      )}
      {...rest}
    />
  );
};

export type TextFieldTextAreaProps<T extends ValidComponent = "textarea"> = ComponentProps<
  typeof TextFieldPrimitive.TextArea<T>
>;

export const TextFieldTextArea = <T extends ValidComponent = "textarea">(
  props: TextFieldTextAreaProps<T>,
) => {
  const [, rest] = splitProps(props as TextFieldTextAreaProps, ["class"]);

  return (
    <TextFieldPrimitive.TextArea
      data-slot="text-field-textarea"
      class={cx(
        "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input field-sizing-content flex min-h-9 max-h-60 w-full rounded-full border bg-transparent px-4 py-2 pr-11 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        props.class,
      )}
      {...rest}
    />
  );
};
