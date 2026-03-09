package com.duet.android.data

data class StatCard(
    val label: String,
    val value: String,
    val accent: String
)

data class FeatureItem(
    val index: String,
    val title: String,
    val text: String,
    val symbol: String
)

data class AuthAction(
    val title: String,
    val subtitle: String,
    val button: String,
    val fields: List<String>
)

data class TransactionItem(
    val title: String,
    val meta: String,
    val amount: String,
    val positive: Boolean
)

data class MetricItem(
    val title: String,
    val value: String,
    val tone: MetricTone
)

enum class MetricTone {
    Income,
    Expense,
    Neutral
}

data class WorkspaceSnapshot(
    val greeting: String,
    val coupleCode: String,
    val workspaceName: String,
    val balance: String,
    val metrics: List<MetricItem>,
    val recent: List<TransactionItem>
)
