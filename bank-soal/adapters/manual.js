'use strict';
// Adapter pembayaran "manual": pesanan dicatat, pembeli diarahkan konfirmasi ke admin.
// Pembayaran ditandai lunas lewat POST /bank-soal/api/webhook/payment (bertanda tangan HMAC).
// Untuk gateway lain (QRIS Mayar / Midtrans / TriPay) buat berkas adapters/<nama>.js dengan
// bentuk yang sama lalu set PAYMENT_ADAPTER=<nama>:
//   module.exports = { name, async create(order) { return { payment_gateway_ref, payment: { pay_url?, instructions? } }; } };
module.exports = {
  name: 'manual',
  async create(order) {
    const wa = (process.env.PAY_WA || '').replace(/\D/g, '');
    const rp = 'Rp' + Number(order.amount).toLocaleString('id-ID');
    const instructions = `Selesaikan pembayaran ${rp} lalu kirim bukti bayar beserta nomor pesanan ${order.order_id}` +
      (wa ? ` ke admin WhatsApp ${wa}.` : ' ke admin Catatan Akademik.') + ' Token akses dikirim setelah pembayaran terkonfirmasi.';
    return { payment_gateway_ref: 'manual-' + order.order_id, payment: { instructions, pay_url: wa ? `https://wa.me/${wa}?text=${encodeURIComponent('Halo admin, saya sudah membayar pesanan ' + order.order_id)}` : undefined } };
  },
};
