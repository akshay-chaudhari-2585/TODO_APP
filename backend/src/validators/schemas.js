import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$/;

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address").openapi({ example: 'admin@gmail.com' }),
    password: z.string().min(1, "Password is required").openapi({ example: 'Admin@123' })
  }).openapi('LoginRequest')
});

export const registerSchema = z.object({
  body: z.object({
    firstName: z.string().min(2, "First name must be at least 2 characters").openapi({ example: 'John' }),
    lastName: z.string().min(2, "Last name must be at least 2 characters").openapi({ example: 'Doe' }),
    email: z.string().email("Invalid email address").openapi({ example: 'john@example.com' }),
    password: z.string().regex(passwordRegex, "Password must be at least 8 characters long, include an uppercase letter and a number").openapi({ example: 'Secret@123' })
  }).openapi('RegisterRequest')
});

export const createTodoSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Title is required").max(100, "Title is too long").openapi({ example: 'Buy groceries' }),
    description: z.string().optional().openapi({ example: 'Milk, Eggs, Bread' })
  }).openapi('CreateTodoRequest')
});

export const updateTodoSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Title is required").max(100).optional().openapi({ example: 'Buy groceries' }),
    description: z.string().optional().openapi({ example: 'Milk, Eggs, Bread' }),
    isCompleted: z.boolean().optional().openapi({ example: true })
  }).openapi('UpdateTodoRequest'),
  params: z.object({
    id: z.string().regex(/^\d+$/, "ID must be a number").openapi({ example: '1' })
  })
});
