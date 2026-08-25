package com.bhojanos.customer.data.checkout

import com.bhojanos.customer.domain.checkout.CheckoutQuote

/**
 * Maps the backend `POST /api/marketplace/quote` `BillQuote` payload into the
 * native [CheckoutQuote]. This mapper performs NO financial calculation — it
 * copies server-supplied values verbatim. It only derives two *presentation*
 * flags from already-server values:
 *  - [CheckoutQuote.quoteId]: a client-local correlation handle (not a price).
 *  - [CheckoutQuote.isFreeDelivery]: derived from server `freeDeliveryApplied`
 *    (falling back to the server `deliveryFee == 0`), never computed.
 *  - [CheckoutQuote.etaMinutes]: read from server `deliveryDecision.eta` only;
 *    if the server omits it we surface 0 rather than inventing an ETA.
 */
object CheckoutQuoteMapper {

    fun fromServer(json: Map<*, *>): CheckoutQuote? {
        val subtotal = number(json, "subtotal") ?: return null
        val gstAmount = number(json, "gstAmount") ?: 0.0
        val packagingFee = number(json, "packagingFee") ?: 0.0
        val deliveryFee = number(json, "deliveryFee") ?: 0.0
        val discountAmount = number(json, "discountAmount") ?: 0.0
        val grandTotal = number(json, "grandTotal") ?: return null

        val freeDeliveryApplied = json["freeDeliveryApplied"] as? Boolean
            ?: (deliveryFee == 0.0)

        val decision = json["deliveryDecision"] as? Map<*, *>
        val eta = decision?.get("eta") as? Map<*, *>
        val etaMinutes = intNumber(eta?.get("minMinutes")) ?: 0

        return CheckoutQuote(
            quoteId = "quote_${System.nanoTime()}",
            itemSubtotal = subtotal,
            deliveryFee = deliveryFee,
            packingFee = packagingFee,
            taxes = gstAmount,
            discount = discountAmount,
            isFreeDelivery = freeDeliveryApplied,
            freeDeliveryThreshold = null,
            etaMinutes = etaMinutes,
            grandTotal = grandTotal
        )
    }

    private fun number(json: Map<*, *>, key: String): Double? {
        val v = json[key] ?: return null
        return when (v) {
            is Number -> v.toDouble()
            is String -> v.toDoubleOrNull()
            else -> null
        }
    }

    private fun intNumber(v: Any?): Int? {
        return when (v) {
            is Number -> v.toInt()
            is String -> v.toIntOrNull()
            else -> null
        }
    }
}
