-- Fase 6.3: agregar whatsapp_id para integración con WhatsApp Business Cloud API.
-- El whatsapp_id es el número en formato E.164 sin '+' (ej: 59178001001).
-- En la mayoría de casos coincide con phone, pero los separo para tener flexibilidad
-- (algunos choferes pueden recibir notifs por un número distinto).

ALTER TABLE drivers
  ADD COLUMN whatsapp_id VARCHAR(30) DEFAULT NULL,
  ADD COLUMN active TINYINT(1) DEFAULT 1;
