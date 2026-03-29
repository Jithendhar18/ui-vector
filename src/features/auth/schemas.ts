import { z } from "zod";

export const LoginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const RegisterSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  full_name: z.string().optional(),
});

export type LoginForm = z.infer<typeof LoginSchema>;
export type RegisterForm = z.infer<typeof RegisterSchema>;
