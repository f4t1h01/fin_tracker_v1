package com.duet.android.data

object DashboardQueryBuilder {
    fun build(params: DashboardQuery): Map<String, String> {
        val query = linkedMapOf(
            "viewMode" to params.viewMode,
            "page" to params.page.toString(),
            "pageSize" to params.pageSize.toString(),
            "rangePreset" to params.selectedPreset
        )

        if (params.selectedPreset == "CUSTOM") {
            if (params.draftFrom.isNotBlank()) query["from"] = params.draftFrom
            if (params.draftTo.isNotBlank()) query["to"] = params.draftTo
        }

        if (params.selectedPreset == "SPECIFIC_MONTH" && params.draftMonthKey.isNotBlank()) {
            query["monthKey"] = params.draftMonthKey
        }

        if (params.kind != "ALL") query["kind"] = params.kind
        if (params.categoryId.isNotBlank()) query["categoryId"] = params.categoryId
        if (params.actor != "EVERYONE") query["actor"] = params.actor
        if (params.search.isNotBlank()) query["search"] = params.search.trim()

        return query
    }
}
