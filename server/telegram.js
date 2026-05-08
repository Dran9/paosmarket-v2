// Notificación a Telegram para la admin.
//
// Lee TELEGRAM_BOT_TOKEN y TELEGRAM_ADMIN_CHAT_ID del entorno. Si alguno
// falta, logea un warning y no falla — los handlers que llamen a esto
// nunca deben quedar bloqueados por la integración.
//
// Para configurar:
//   1. Hablale a @BotFather, /newbot, copiar el token → TELEGRAM_BOT_TOKEN
//   2. La admin le envía /start al bot recién creado.
//   3. Visitar https://api.telegram.org/bot<TOKEN>/getUpdates para ver
//      el chat.id de la admin → TELEGRAM_ADMIN_CHAT_ID

const ENDPOINT = 'https://api.telegram.org/bot';

let warned = false;

export async function notifyAdmin(text, log = console) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

  if (!token || !chatId) {
    if (!warned) {
      log?.warn?.(
        'Telegram no configurado (faltan TELEGRAM_BOT_TOKEN o TELEGRAM_ADMIN_CHAT_ID). Notificaciones críticas se loguean local.'
      );
      warned = true;
    }
    log?.info?.(`[telegram-skip] ${text}`);
    return { ok: false, skipped: true };
  }

  try {
    const res = await fetch(`${ENDPOINT}${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      log?.warn?.(`Telegram respondió ${res.status}: ${errText.slice(0, 200)}`);
      return { ok: false, skipped: false, status: res.status };
    }
    return { ok: true };
  } catch (err) {
    log?.warn?.(`Telegram falló: ${err.message}`);
    return { ok: false, skipped: false, error: err.message };
  }
}
