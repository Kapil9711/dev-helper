import {
  cancel,
  confirm,
  isCancel,
  multiselect,
  select,
  text,
} from "@clack/prompts";

import {
  ConfirmPromptOptions,
  InputPromptOptions,
  MultiSelectPromptOptions,
  SelectPromptOptions,
} from "./prompt.types.ts";

class Prompt {
  private handleCancel(value: unknown): never | void {
    if (isCancel(value)) {
      cancel("Operation cancelled.");
      process.exit(0);
    }
  }

  private handleError(error: unknown): never {
    console.error("\n❌ An unexpected error occurred.");

    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }

    process.exit(1);
  }

  async select<T>(options: SelectPromptOptions<T>): Promise<T> {
    try {
      const value = await select({
        message: options.message,
        options: options.options,
        initialValue: options.initialValue,
      });

      this.handleCancel(value);

      return value as T;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async confirm(options: ConfirmPromptOptions): Promise<boolean> {
    try {
      const value = await confirm({
        message: options.message,
        initialValue: options.initialValue ?? true,
      });

      this.handleCancel(value);

      return value as boolean;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async input(options: InputPromptOptions): Promise<string> {
    try {
      const value = await text({
        message: options.message,
        placeholder: options.placeholder,
        defaultValue: options.defaultValue,
        validate: options.validate,
      });

      this.handleCancel(value);

      return value as string;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async multiselect<T>(options: MultiSelectPromptOptions<T>): Promise<T[]> {
    try {
      const value = await multiselect({
        message: options.message,
        options: options.options,
        initialValues: options.initialValues,
        required: options.required,
      });

      this.handleCancel(value);

      return value as T[];
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export const prompt = new Prompt();
