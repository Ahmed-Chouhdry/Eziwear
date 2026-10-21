import { env } from '../../config/env.js';
import { RETURN_WINDOW_DAYS } from '../../utils/policy.js';
import { FREE_SHIPPING_THRESHOLD } from '../../utils/pricing.js';
import type { OrderDto } from '../orders/order.dto.js';
import type { MailMessage } from './mailer.js';

const ORANGE = '#FF6A00';
const INK = '#0B0B0D';

const rs = (n: number): string => `Rs ${n.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function shell(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:${INK}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="background:${INK};padding:20px 28px;font-size:24px;font-weight:700;color:#fff">EZi<span style="color:${ORANGE}">Wear</span></td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 12px;font-size:22px">${esc(title)}</h1>
${body}
</td></tr>
<tr><td style="padding:18px 28px;background:#fafafa;font-size:12px;color:#71717a">
You received this email because of activity on your EZiWear order or account.
</td></tr>
</table></td></tr></table></body></html>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:24px 0"><a href="${esc(href)}" style="background:${ORANGE};color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;display:inline-block">${esc(label)}</a></p>`;
}

export interface OrderMailExtras {
  /** % granted by admin to the customer (0 for guests / none). */
  customerDiscountPercent: number;
  /** Amount taken off by that % on this order. */
  customerDiscountAmount: number;
  trackUrl: string;
}

export function orderConfirmationMail(
  to: string,
  order: OrderDto,
  x: OrderMailExtras,
): MailMessage {
  const couponAmount = Math.max(0, order.discount - x.customerDiscountAmount);
  const saved = order.discount;

  const rows = order.items
    .map(
      (i) => `<tr>
<td style="padding:10px 0;border-bottom:1px solid #eee">${esc(i.productName)}<br><span style="color:#71717a;font-size:12px">${esc(i.size)} · ${esc(i.color)} × ${i.quantity}</span></td>
<td align="right" style="padding:10px 0;border-bottom:1px solid #eee;white-space:nowrap">${rs(i.subtotal)}</td></tr>`,
    )
    .join('');

  const line = (label: string, value: string, color = INK): string =>
    `<tr><td style="padding:4px 0;color:${color}">${label}</td><td align="right" style="padding:4px 0;color:${color}">${value}</td></tr>`;

  const totals = [
    line('Subtotal', rs(order.subtotal)),
    x.customerDiscountAmount > 0
      ? line(`Your discount (${x.customerDiscountPercent}%)`, `−${rs(x.customerDiscountAmount)}`, '#15803d')
      : '',
    couponAmount > 0
      ? line(`Coupon${order.couponCode ? ` (${esc(order.couponCode)})` : ''}`, `−${rs(couponAmount)}`, '#15803d')
      : '',
    line('Shipping', order.shippingFee === 0 ? 'Free' : rs(order.shippingFee)),
    `<tr><td style="padding:10px 0 0;font-weight:700;font-size:16px">Total (Cash on Delivery)</td><td align="right" style="padding:10px 0 0;font-weight:700;font-size:16px">${rs(order.total)}</td></tr>`,
  ].join('');

  const offer =
    x.customerDiscountPercent > 0
      ? `<div style="margin-top:24px;padding:16px;border-radius:10px;background:#FFF4EA;border:1px solid #FFD9B8">
<strong style="color:${ORANGE}">${saved > 0 ? `You saved ${rs(saved)} on this order! ` : ''}</strong>
Your EZiWear account has a standing <strong>${x.customerDiscountPercent}% discount</strong> — it is applied automatically to every order you place while signed in.</div>`
      : `<div style="margin-top:24px;padding:16px;border-radius:10px;background:#FFF4EA;border:1px solid #FFD9B8">
${saved > 0 ? `<strong style="color:${ORANGE}">You saved ${rs(saved)} on this order.</strong><br>` : ''}
<strong>Offer:</strong> free delivery on every order over ${rs(FREE_SHIPPING_THRESHOLD)}. Create an account to track your orders and unlock customer rewards.</div>`;

  const body = `
<p style="margin:0 0 16px">Hi ${esc(order.ship.name)}, thank you for shopping with EZiWear! We've received your order and it is <strong>confirmed</strong>. We'll email you again at every step.</p>
<p style="margin:0 0 20px;padding:12px 14px;background:#f4f4f5;border-radius:8px">Order number: <strong>${esc(order.orderNumber)}</strong></p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px">${totals}</table>
<h3 style="margin:24px 0 6px;font-size:15px">Delivering to</h3>
<p style="margin:0;color:#3f3f46">${esc(order.ship.name)}<br>${esc(order.ship.address)}, ${esc(order.ship.city)}<br>${esc(order.ship.phone)}</p>
<p style="margin:12px 0 0;color:#71717a;font-size:13px">Estimated delivery: 2–5 working days. Please keep ${rs(order.total)} ready for the courier.</p>
${offer}
${button(x.trackUrl, 'Track your order')}`;

  const text = [
    `Hi ${order.ship.name}, your EZiWear order ${order.orderNumber} is confirmed.`,
    '',
    ...order.items.map((i) => `- ${i.productName} (${i.size}, ${i.color}) x${i.quantity}  ${rs(i.subtotal)}`),
    '',
    `Subtotal: ${rs(order.subtotal)}`,
    x.customerDiscountAmount > 0 ? `Your discount (${x.customerDiscountPercent}%): -${rs(x.customerDiscountAmount)}` : '',
    couponAmount > 0 ? `Coupon: -${rs(couponAmount)}` : '',
    `Shipping: ${order.shippingFee === 0 ? 'Free' : rs(order.shippingFee)}`,
    `Total (Cash on Delivery): ${rs(order.total)}`,
    '',
    `Track your order: ${x.trackUrl}`,
  ]
    .filter((l, i, a) => l !== '' || a[i - 1] !== '')
    .join('\n');

  return { to, subject: `Thank you! Order ${order.orderNumber} is confirmed`, html: shell('Thank you for your order!', body), text };
}

function returnPolicyBlock(): string {
  return `<div style="margin-top:20px;padding:16px;border-radius:10px;background:#f4f4f5">
<strong>Return policy</strong>
<ul style="margin:8px 0 0;padding-left:18px;color:#3f3f46;font-size:14px;line-height:1.6">
<li>You can request a return within <strong>${RETURN_WINDOW_DAYS} days</strong> of delivery.</li>
<li>Items should be unused and in their original condition.</li>
<li>Open <em>My Account → Orders</em>, choose the order and tap <strong>Return items</strong>.</li>
<li>Once we approve and receive the items, we inspect them and confirm your refund.</li>
</ul></div>`;
}

const RETURN_POLICY_TEXT = [
  'Return policy:',
  `- Request a return within ${RETURN_WINDOW_DAYS} days of delivery.`,
  '- Items should be unused and in original condition.',
  '- My Account > Orders > choose the order > Return items.',
  '- After we receive and inspect the items, we confirm your refund.',
].join('\n');

interface StatusCopy {
  subject: string;
  title: string;
  message: string;
  extraHtml?: () => string;
  extraText?: string;
}

const STATUS_COPY: Record<string, StatusCopy | undefined> = {
  confirmed: {
    subject: 'is confirmed',
    title: 'Your order is confirmed',
    message: 'Good news — we have confirmed your order and are getting it ready.',
  },
  processing: {
    subject: 'is being prepared',
    title: 'We are preparing your order',
    message:
      'Your order is now being processed — our team is checking and packing your items, and it will be handed to the courier soon.',
  },
  shipped: {
    subject: 'has been shipped',
    title: 'Your order is on its way',
    message:
      'Your order has been shipped and is on its way to you. Please keep the Cash-on-Delivery amount ready for the courier.',
  },
  delivered: {
    subject: 'was delivered — thank you!',
    title: 'Delivered — thank you!',
    message:
      'Your order has been delivered. Thank you for choosing EZiWear — we truly appreciate your trust and hope you love your new pieces! If you enjoyed them, a quick review on the product page helps other shoppers.',
    extraHtml: returnPolicyBlock,
    extraText: RETURN_POLICY_TEXT,
  },
  cancelled: {
    subject: 'was cancelled',
    title: 'Your order was cancelled',
    message: 'Your order has been cancelled. If this is unexpected, please contact us and we will help.',
  },
  returned: {
    subject: 'was returned',
    title: 'Your order was marked as returned',
    message:
      'Your order has been marked as returned. Any refund due will be handled according to our return policy below.',
    extraHtml: returnPolicyBlock,
    extraText: RETURN_POLICY_TEXT,
  },
};

export function orderStatusMail(
  to: string,
  order: { orderNumber: string; name: string; total: number; status: string; trackUrl: string },
): MailMessage | null {
  const copy = STATUS_COPY[order.status];
  if (!copy) return null;
  const body = `
<p style="margin:0 0 16px">Hi ${esc(order.name)},</p>
<p style="margin:0 0 16px">${esc(copy.message)}</p>
<p style="margin:0 0 8px;padding:12px 14px;background:#f4f4f5;border-radius:8px">Order number: <strong>${esc(order.orderNumber)}</strong><br>Total: <strong>${rs(order.total)}</strong> (Cash on Delivery)</p>
${copy.extraHtml ? copy.extraHtml() : ''}
${button(order.trackUrl, 'Track your order')}`;
  return {
    to,
    subject: `Your order ${order.orderNumber} ${copy.subject}`,
    html: shell(copy.title, body),
    text: [
      `Hi ${order.name}, ${copy.message}`,
      `Order: ${order.orderNumber}`,
      `Total: ${rs(order.total)}`,
      copy.extraText ?? '',
      `Track: ${order.trackUrl}`,
    ]
      .filter(Boolean)
      .join('\n\n'),
  };
}

export function customerDiscountMail(
  to: string,
  name: string,
  percent: number,
  totalSpent = 0,
  orderCount = 0,
  amount = 0,
): MailMessage {
  const shopUrl = `${env.APP_URL}/shop`;
  // Either a percentage or a flat Rs amount off every order.
  const flat = percent <= 0 && amount > 0;
  const off = flat ? rs(amount) : `${percent}%`;

  if (percent <= 0 && amount <= 0) {
    return {
      to,
      subject: 'Your EZiWear discount was updated',
      html: shell(
        'Discount updated',
        `<p style="margin:0 0 16px">Hi ${esc(name)}, your EZiWear customer discount has been removed.</p>${button(shopUrl, 'Visit the shop')}`,
      ),
      text: `Hi ${name}, your EZiWear customer discount has been removed.`,
    };
  }

  const example = 5000;
  const saved = flat ? Math.min(amount, example) : Math.round((example * percent) / 100);
  const loyalty =
    orderCount > 0
      ? `<p style="margin:0 0 16px">You've placed <strong>${orderCount}</strong> order${orderCount === 1 ? '' : 's'} with us (<strong>${rs(totalSpent)}</strong> in total) — this discount is our way of saying <strong>thank you</strong> for being a loyal customer.</p>`
      : `<p style="margin:0 0 16px">As a thank-you for being part of EZiWear, we've unlocked a special discount on your account.</p>`;

  const body = `
<p style="margin:0 0 16px">Hi ${esc(name)},</p>
${loyalty}
<div style="margin:0 0 20px;padding:20px;border-radius:12px;background:${INK};color:#fff;text-align:center">
<div style="font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#d4d4d8">Your personal discount</div>
<div style="font-size:44px;font-weight:700;color:${ORANGE};line-height:1.2">${off} OFF</div>
<div style="font-size:13px;color:#d4d4d8">on every EZiWear order</div>
</div>
<h3 style="margin:0 0 8px;font-size:15px">How it works</h3>
<ul style="margin:0 0 16px;padding-left:18px;color:#3f3f46;font-size:14px;line-height:1.7">
<li><strong>Sign in</strong> to your EZiWear account and shop as usual.</li>
<li>Your <strong>${off}</strong> is taken off your cart <strong>automatically</strong> — no code needed. You'll see it as "Your discount" at checkout.</li>
<li>It <strong>stacks with coupon codes</strong>, so you can save even more.</li>
<li>Delivery is <strong>free over ${rs(FREE_SHIPPING_THRESHOLD)}</strong> (calculated after your discount).</li>
<li>It applies to <strong>every order</strong> you place while signed in — it doesn't expire.</li>
</ul>
<p style="margin:0 0 4px;padding:12px 14px;background:#FFF4EA;border:1px solid #FFD9B8;border-radius:8px;font-size:14px">
Example: on a <strong>${rs(example)}</strong> order you save <strong style="color:${ORANGE}">${rs(saved)}</strong>.</p>
${button(shopUrl, 'Start shopping')}`;

  return {
    to,
    subject: `You've unlocked ${off} off every EZiWear order`,
    html: shell(`You've unlocked ${off} off`, body),
    text: [
      `Hi ${name},`,
      orderCount > 0
        ? `Thank you for being a loyal customer (${orderCount} orders, ${rs(totalSpent)}).`
        : 'Thank you for being part of EZiWear.',
      `Your account now has a ${off} discount on every order, applied automatically at checkout when you're signed in.`,
      'It stacks with coupon codes. Delivery is free over ' + rs(FREE_SHIPPING_THRESHOLD) + ' (after discount).',
      `Example: on ${rs(example)} you save ${rs(saved)}.`,
      `Shop: ${shopUrl}`,
    ].join('\n\n'),
  };
}

export interface OfferMailInput {
  to: string;
  name: string;
  subject: string;
  headline: string;
  message: string;
  couponCode?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  unsubscribeUrl: string;
}

export function offerMail(o: OfferMailInput): MailMessage {
  const ctaUrl = o.ctaUrl || `${env.APP_URL}/shop`;
  const paragraphs = o.message
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;line-height:1.6">${esc(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
  const coupon = o.couponCode
    ? `<div style="margin:8px 0 20px;padding:18px;border:2px dashed ${ORANGE};border-radius:12px;text-align:center">
<div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#71717a">Use code at checkout</div>
<div style="font-size:28px;font-weight:700;letter-spacing:3px;color:${ORANGE}">${esc(o.couponCode)}</div></div>`
    : '';

  const html = shell(
    o.headline,
    `<p style="margin:0 0 14px">Hi ${esc(o.name)},</p>${paragraphs}${coupon}${button(ctaUrl, o.ctaLabel || 'Shop now')}
<p style="margin:24px 0 0;font-size:12px;color:#71717a">Don't want offer emails? <a href="${esc(o.unsubscribeUrl)}" style="color:#71717a">Unsubscribe</a>.</p>`,
  );
  return {
    to: o.to,
    subject: o.subject,
    html,
    text: [
      `Hi ${o.name},`,
      o.headline,
      o.message,
      o.couponCode ? `Use code ${o.couponCode} at checkout.` : '',
      `${o.ctaLabel || 'Shop now'}: ${ctaUrl}`,
      `Unsubscribe: ${o.unsubscribeUrl}`,
    ]
      .filter(Boolean)
      .join('\n\n'),
  };
}
