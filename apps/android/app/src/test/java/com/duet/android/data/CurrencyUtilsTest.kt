package com.duet.android.data

import org.junit.Assert.assertEquals
import org.junit.Test

class CurrencyUtilsTest {
    @Test
    fun normalizesCurrencySelectionInSupportedOrder() {
        val result = CurrencyUtils.normalizeSelection(listOf("usd", "bad", "UZS", "usd", "eur"))

        assertEquals(listOf("UZS", "USD", "EUR"), result)
    }

    @Test
    fun fallsBackWhenSelectionIsEmptyOrInvalid() {
        assertEquals(listOf("UZS", "USD"), CurrencyUtils.normalizeSelection(emptyList()))
        assertEquals(listOf("UZS", "USD"), CurrencyUtils.normalizeSelection(listOf("bad")))
    }

    @Test
    fun convertsFromUzsUsingRate() {
        assertEquals(10.0, CurrencyUtils.convertFromUzs(125_000.0, 12_500.0), 0.0)
    }

    @Test
    fun clampsUnavailableCurrencyToPreferredFirst() {
        assertEquals("USD", CurrencyUtils.clampCurrency("EUR", listOf("USD", "UZS")))
        assertEquals("UZS", CurrencyUtils.clampCurrency("UZS", listOf("USD", "UZS")))
    }
}
