import type { NextApiRequest, NextApiResponse } from 'next';
import { sendTelegramTest } from '@/lib/telegramNotifier';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // Cek konfigurasi
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return res.status(400).json({
      ok: false,
      error: 'TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID belum di-set di .env.local',
      hint: {
        TELEGRAM_BOT_TOKEN: token  ? '✅ Set' : '❌ Belum di-set',
        TELEGRAM_CHAT_ID:   chatId ? '✅ Set' : '❌ Belum di-set',
      },
    });
  }

  try {
    await sendTelegramTest();
    return res.status(200).json({
      ok: true,
      message: 'Pesan tes berhasil dikirim ke Telegram',
      chatId,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      ok: false,
      error: errorMsg,
    });
  }
}