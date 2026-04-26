package com.duet.android.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

class DashboardQueryBuilderTest {
    @Test
    fun buildsDefaultQueryWithoutOptionalFilters() {
        val query = DashboardQueryBuilder.build(DashboardQuery())

        assertEquals("PERSONAL", query["viewMode"])
        assertEquals("1", query["page"])
        assertEquals("20", query["pageSize"])
        assertEquals("THIS_WEEK", query["rangePreset"])
        assertFalse(query.containsKey("kind"))
        assertFalse(query.containsKey("categoryId"))
        assertFalse(query.containsKey("search"))
    }

    @Test
    fun includesOnlyActiveOptionalFilters() {
        val query = DashboardQueryBuilder.build(
            DashboardQuery(
                viewMode = "COUPLE",
                page = 3,
                selectedPreset = "CUSTOM",
                draftFrom = "2026-04-01",
                draftTo = "2026-04-25",
                kind = "EXPENSE",
                categoryId = "cat_12345",
                actor = "ME",
                search = " groceries "
            )
        )

        assertEquals("COUPLE", query["viewMode"])
        assertEquals("3", query["page"])
        assertEquals("CUSTOM", query["rangePreset"])
        assertEquals("2026-04-01", query["from"])
        assertEquals("2026-04-25", query["to"])
        assertEquals("EXPENSE", query["kind"])
        assertEquals("cat_12345", query["categoryId"])
        assertEquals("ME", query["actor"])
        assertEquals("groceries", query["search"])
    }

    @Test
    fun includesMonthKeyForSpecificMonthOnly() {
        val query = DashboardQueryBuilder.build(
            DashboardQuery(
                selectedPreset = "SPECIFIC_MONTH",
                draftMonthKey = "2026-04"
            )
        )

        assertEquals("2026-04", query["monthKey"])
        assertFalse(query.containsKey("from"))
        assertFalse(query.containsKey("to"))
    }
}
