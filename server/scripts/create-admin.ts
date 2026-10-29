/**
 * Tạo tài khoản ADMIN.
 *
 *   docker compose exec server npm run create-admin -- --email admin@bookstore.vn --name "Quản trị viên"
 *
 * Mật khẩu được hỏi khi chạy (không hiện ra màn hình, không lưu vào lịch sử lệnh).
 * Chạy không tương tác (CI): đặt biến môi trường ADMIN_PASSWORD.
 */
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { ZodError } from 'zod';
import { pool } from '../src/db/pool';
import * as userRepository from '../src/repositories/user.repository';
import { emailSchema, fullNameSchema, passwordSchema } from '../src/schemas/common.schema';
import { hashPassword } from '../src/utils/password';

function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    // Ẩn ký tự gõ vào
    (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => {
      if (s.includes(question)) process.stdout.write(s);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

async function main() {
  const { values } = parseArgs({
    options: {
      email: { type: 'string' },
      name: { type: 'string', default: 'Quản trị viên' },
    },
  });

  const email = emailSchema.parse(values.email);
  const fullName = fullNameSchema.parse(values.name);

  if (await userRepository.existsByEmail(email)) {
    throw new Error(`Email ${email} đã tồn tại`);
  }

  const password =
    process.env.ADMIN_PASSWORD ?? (await askHidden('Mật khẩu Admin (8–72 ký tự, có chữ và số): '));
  passwordSchema.parse(password);

  if (!process.env.ADMIN_PASSWORD) {
    const confirm = await askHidden('Nhập lại mật khẩu: ');
    if (confirm !== password) throw new Error('Mật khẩu nhập lại không khớp');
  }

  const admin = await userRepository.create({
    fullName,
    email,
    phone: null,
    passwordHash: await hashPassword(password),
    role: 'ADMIN',
  });

  console.log(`✅ Đã tạo Admin #${admin.id}: ${admin.email}`);
}

main()
  .catch((err) => {
    const message =
      err instanceof ZodError
        ? err.issues.map((issue) => issue.message).join(', ')
        : err instanceof Error
          ? err.message
          : String(err);
    console.error('❌', message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
  });
