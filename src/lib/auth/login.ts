import { z } from "zod";

const loginFormSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(1024),
});

export type LoginCredentials = z.infer<typeof loginFormSchema>;

export function parseLoginForm(formData: FormData) {
  return loginFormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
}
