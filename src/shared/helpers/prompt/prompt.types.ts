import { Option, TextOptions } from "@clack/prompts";

export interface SelectOption<T = string> {
  label: string;
  value: T;
  hint?: string;
}

export interface SelectPromptOptions<T = string> {
  message: string;
  options: Option<T>[];
  initialValue?: T;
}

export interface ConfirmPromptOptions {
  message: string;
  initialValue?: boolean;
}

export interface InputPromptOptions extends TextOptions {
  message: string;
  placeholder?: string;
  defaultValue?: string;
}

export interface MultiSelectPromptOptions<T = string> {
  /**
   * Prompt message displayed to the user.
   */
  message: string;

  /**
   * Available options.
   */
  options: Option<T>[];

  /**
   * Initially selected values.
   */
  initialValues?: T[];

  /**
   * Whether at least one option must be selected.
   *
   * Default: false
   */
  required?: boolean;
}
