// Util para mandar notificaciones WhatsApp Business a choferes.
//
// Activación: requiere WHATSAPP_PHONE_NUMBER_ID y WHATSAPP_ACCESS_TOKEN en env.
// Si faltan, log warning una sola vez y la función se vuelve no-op.
//
// La idea es que esto NO bloquee el commit del pedido — siempre llamar con
// .catch() o async fire-and-forget.

let warned = false;

function isConfigured() {
  return !!(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);
}

function buildMessage(order) {
  const total = Number(order.total).toFixed(2);
  const addr = order.client_addr || order.clientAddr || '';
  const name = order.client_name || order.clientName || '';
  const lines = [
    `📦 Pedido ${order.id} listo para entregar.`,
    `Cliente: ${name}`,
    addr ? `Dirección: ${addr}` : '',
    `Total: Bs ${total}`,
  ].filter(Boolean);
  return lines.join('\n');
}

export async function notifyDriver(driver, order, log = console) {
  if (!isConfigured()) {
    if (!warned) {
      log?.warn?.('WhatsApp no configurado (falta WHATSAPP_PHONE_NUMBER_ID o WHATSAPP_ACCESS_TOKEN); notifyDriver no-op');
      warned = true;
    }
    return false;
  }
  if (!driver?.whatsapp_id && !driver?.whatsappId) {
    log?.warn?.(`Driver ${driver?.id} sin whatsapp_id; salto notificación`);
    return false;
  }

  const to = (driver.whatsapp_id || driver.whatsappId).replace(/[^\d]/g, '');
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: buildMessage(order) },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      log?.warn?.(`WhatsApp API ${res.status}: ${text.slice(0, 200)}`);
      return false;
    }
    return true;
  } catch (err) {
    log?.warn?.(`WhatsApp fetch error: ${err.message}`);
    return false;
  }
}
