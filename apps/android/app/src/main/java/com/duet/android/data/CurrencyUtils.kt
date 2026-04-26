package com.duet.android.data

import java.text.NumberFormat
import java.util.Locale

object CurrencyUtils {
    fun normalizeSelection(values: List<String>?): List<String> {
        if (values.isNullOrEmpty()) return listOf("UZS", "USD")
        val seen = values.map { it.trim().uppercase(Locale.US) }.toSet()
        val normalized = supportedCurrencies.filter { it in seen }
        return normalized.ifEmpty { listOf("UZS", "USD") }
    }

    fun clampCurrency(value: String?, preferred: List<String>): String {
        val normalized = value?.uppercase(Locale.US)
        return if (normalized != null && normalized in preferred) normalized else preferred.firstOrNull() ?: "UZS"
    }

    fun convertFromUzs(amountInUzs: Double, rate: Double): Double {
        if (rate <= 0.0) return 0.0
        return kotlin.math.round((amountInUzs / rate) * 100.0) / 100.0
    }

    fun formatAmount(value: Double, currency: String = "UZS"): String {
        val formatter = NumberFormat.getNumberInstance(Locale.US).apply {
            maximumFractionDigits = if (currency == "UZS") 0 else 2
            minimumFractionDigits = 0
        }
        return "${formatter.format(value)} $currency"
    }
}
