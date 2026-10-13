import type { Message } from '@vscar/decision-engine';
import type { I18n } from '@/i18n/use-i18n';

/**
 * Renderiza un mensaje de engine: texto principal + `details` como sublista (cada detalle con los suyos en
 * línea). Único punto de presentación de explicaciones del engine en la UI.
 */
export function MessageText({ msg, i18n }: { msg: Message; i18n: I18n }) {
  return (
    <>
      {i18n.m(msg)}
      {msg.details?.length ? (
        <ul className="msg-details">
          {msg.details.map((d, k) => (
            <li key={`${d.messageKey}-${k}`}>{i18n.mInline(d)}</li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
