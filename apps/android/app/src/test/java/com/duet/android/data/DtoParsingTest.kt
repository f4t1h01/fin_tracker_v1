package com.duet.android.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class DtoParsingTest {
    private val moshi = NetworkModule.createMoshi()

    @Test
    fun parsesThemePreferenceResponseContract() {
        val parsed = moshi.adapter(ThemePreferenceResponse::class.java).fromJson("""{"isDark":true}""")

        requireNotNull(parsed)
        assertTrue(parsed.isDark)
    }

    @Test
    fun parsesVoiceDraftResponseWithTranscript() {
        val parsed = moshi.adapter(AiTransactionDraftResponse::class.java).fromJson(
            """
                {
                  "transcript": "Spent 45000 UZS on groceries",
                  "draft": {
                    "kind": "EXPENSE",
                    "amount": 45000,
                    "currency": "UZS",
                    "categoryId": "cat_food",
                    "categoryNameCandidate": null,
                    "note": "groceries",
                    "confidence": 0.91,
                    "missingFields": [],
                    "warnings": []
                  }
                }
            """.trimIndent()
        )

        requireNotNull(parsed)
        assertEquals("Spent 45000 UZS on groceries", parsed.transcript)
        assertEquals("EXPENSE", parsed.draft.kind)
        assertEquals(45000.0, parsed.draft.amount ?: 0.0, 0.0)
    }

    @Test
    fun parsesImageDraftResponseWithReceiptMetadata() {
        val parsed = moshi.adapter(AiTransactionDraftResponse::class.java).fromJson(
            """
                {
                  "extractedText": "TOTAL 125000",
                  "receiptMode": "MULTI_ITEM",
                  "productNames": ["Milk", "Bread"],
                  "qualityRating": "REVIEW",
                  "qualityIssues": ["LOW_CONTRAST", "INCOMPLETE_TOTAL"],
                  "documentType": "RECEIPT",
                  "extractionSource": "QR_WITH_IMAGE_FALLBACK",
                  "qrUrl": "https://ofd.soliq.uz/check?t=1",
                  "qrProvider": "SOLIQ_OFD",
                  "qrWarnings": ["QR receipt link was reachable, but structured receipt totals could not be parsed."],
                  "qrSummary": "2 QR codes found, but no usable data was fetched; image extraction was used.",
                  "qrCodes": [
                    {
                      "value": "https://ofd.soliq.uz/check?t=1",
                      "url": "https://ofd.soliq.uz/check?t=1",
                      "provider": "SOLIQ_OFD",
                      "status": "FOUND_NO_DATA",
                      "warning": "QR receipt link was reachable, but structured receipt totals could not be parsed.",
                      "usedForDraft": false
                    },
                    {
                      "value": "plain loyalty qr",
                      "url": null,
                      "provider": "UNKNOWN",
                      "status": "FOUND_NO_DATA",
                      "warning": "QR code link is not from a trusted fiscal receipt domain.",
                      "usedForDraft": false
                    }
                  ],
                  "draft": {
                    "kind": "EXPENSE",
                    "amount": 125000,
                    "currency": "UZS",
                    "categoryId": null,
                    "categoryNameCandidate": "Food",
                    "note": "Milk, Bread",
                    "confidence": 0.77,
                    "missingFields": ["category"],
                    "warnings": ["No exact category match for \"Food\""]
                  }
                }
            """.trimIndent()
        )

        requireNotNull(parsed)
        assertEquals("MULTI_ITEM", parsed.receiptMode)
        assertEquals("REVIEW", parsed.qualityRating)
        assertEquals("TOTAL 125000", parsed.extractedText)
        assertEquals(listOf("Milk", "Bread"), parsed.productNames)
        assertEquals(listOf("LOW_CONTRAST", "INCOMPLETE_TOTAL"), parsed.qualityIssues)
        assertEquals("Food", parsed.draft.categoryNameCandidate)
        assertEquals("2 QR codes found, but no usable data was fetched; image extraction was used.", parsed.qrSummary)
        assertEquals(2, parsed.qrCodes.size)
        assertEquals("FOUND_NO_DATA", parsed.qrCodes.first().status)
    }

    @Test
    fun parsesProfileSnapshotContract() {
        val json = """
            {
              "profile": {
                "user": {
                  "id": "user_1",
                  "telegramId": "-1",
                  "username": null,
                  "firstName": "Fatih",
                  "lastName": null,
                  "birthday": null,
                  "coupleCode": "ABCD"
                },
                "activeCouple": null,
                "dashboardRateCurrencies": ["UZS", "USD"],
                "bind": null,
                "hasPartnerConnection": false
              },
              "summary": {
                "month": 4,
                "year": 2026,
                "currency": "UZS",
                "totalIncome": 100000,
                "totalExpense": 25000,
                "balance": 75000,
                "personalIncome": 100000,
                "personalExpense": 25000,
                "personalBalance": 75000
              },
              "recent": [],
              "auth": {
                "id": "user_1",
                "telegramId": "-1",
                "lastTelegramChatId": null,
                "email": "you@example.com",
                "passwordSetAt": null,
                "hasPassword": true,
                "coupleCode": "ABCD",
                "username": null,
                "firstName": "Fatih",
                "lastName": null,
                "birthday": null,
                "photoUrl": null,
                "telegramPhone": null,
                "isAdmin": false,
                "isDark": true,
                "showSharedCategories": true,
                "weekStartsOn": "MONDAY"
              },
              "categories": {
                "preferences": {
                  "showSharedCategories": true,
                  "defaultIncomeCategoryId": null,
                  "defaultExpenseCategoryId": null
                },
                "byKind": {
                  "EXPENSE": {
                    "personal": [],
                    "shared": []
                  },
                  "INCOME": {
                    "personal": [],
                    "shared": []
                  }
                }
              }
            }
        """.trimIndent()

        val parsed = moshi.adapter(ProfileSnapshotResponse::class.java).fromJson(json)

        requireNotNull(parsed)
        assertEquals("Fatih", parsed.auth.firstName)
        assertTrue(parsed.auth.isDark)
        assertEquals(75000.0, parsed.summary.balance, 0.0)
    }
}
