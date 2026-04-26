package com.duet.android.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class DtoParsingTest {
    private val moshi = NetworkModule.createMoshi()

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
