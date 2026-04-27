package com.duet.android.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

class GoodsQueryBuilderTest {
    @Test
    fun buildsDefaultGoodsQuery() {
        val query = GoodsQueryBuilder.build(GoodsListQuery())

        assertEquals("RECENTLY_UPDATED", query["sort"])
        assertEquals("1", query["page"])
        assertEquals("20", query["pageSize"])
        assertFalse(query.containsKey("placeId"))
        assertFalse(query.containsKey("lowOnly"))
    }

    @Test
    fun includesOnlyActiveGoodsFilters() {
        val query = GoodsQueryBuilder.build(
            GoodsListQuery(
                placeId = "place_12345",
                categoryId = "cat_12345",
                scope = "PERSONAL",
                stockStatus = "LOW",
                expirationStatus = "EXPIRING_SOON",
                lowOnly = true,
                recentlyUpdatedOnly = true,
                autoConsumptionOnly = false,
                search = " rice ",
                sort = "NAME",
                page = 2
            )
        )

        assertEquals("place_12345", query["placeId"])
        assertEquals("cat_12345", query["categoryId"])
        assertEquals("PERSONAL", query["scope"])
        assertEquals("LOW", query["stockStatus"])
        assertEquals("EXPIRING_SOON", query["expirationStatus"])
        assertEquals("true", query["lowOnly"])
        assertEquals("true", query["recentlyUpdatedOnly"])
        assertFalse(query.containsKey("autoConsumptionOnly"))
        assertEquals("rice", query["search"])
        assertEquals("NAME", query["sort"])
        assertEquals("2", query["page"])
    }
}
