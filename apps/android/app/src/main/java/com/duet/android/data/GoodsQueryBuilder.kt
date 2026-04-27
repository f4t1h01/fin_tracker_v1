package com.duet.android.data

object GoodsQueryBuilder {
    fun build(query: GoodsListQuery): Map<String, String> {
        val params = linkedMapOf(
            "sort" to query.sort,
            "page" to query.page.toString(),
            "pageSize" to query.pageSize.toString()
        )

        if (query.placeId.isNotBlank()) params["placeId"] = query.placeId
        if (query.categoryId.isNotBlank()) params["categoryId"] = query.categoryId
        if (query.scope.isNotBlank()) params["scope"] = query.scope
        if (query.stockStatus.isNotBlank()) params["stockStatus"] = query.stockStatus
        if (query.expirationStatus.isNotBlank()) params["expirationStatus"] = query.expirationStatus
        if (query.lowOnly) params["lowOnly"] = "true"
        if (query.recentlyUpdatedOnly) params["recentlyUpdatedOnly"] = "true"
        if (query.autoConsumptionOnly) params["autoConsumptionOnly"] = "true"
        if (query.search.isNotBlank()) params["search"] = query.search.trim()

        return params
    }
}
