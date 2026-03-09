package com.duet.android.data

object SampleData {
    val heroStats = listOf(
        StatCard("Shared Source", "1x", "gold"),
        StatCard("Always Available", "24s", "blush"),
        StatCard("People Aligned", "2 hearts", "sage"),
        StatCard("Long-Term Clarity", "infinity", "ink")
    )

    val features = listOf(
        FeatureItem("01", "Instant Entry", "Step in from Telegram or the app without losing the rhythm of the day.", "*"),
        FeatureItem("02", "Partner Sync", "Both partners look at one shared source of truth instead of scattered notes.", "oo"),
        FeatureItem("03", "Live Balance", "Income, expense, and shared balance stay visible in one calm workspace.", "+"),
        FeatureItem("04", "Shared Goals", "Money tracking feels closer to a journal than a cold spreadsheet.", "<3")
    )

    val authActions = listOf(
        AuthAction(
            title = "Sign in with email",
            subtitle = "Use this when your Duet account already exists.",
            button = "Sign in",
            fields = listOf("Email", "Password")
        ),
        AuthAction(
            title = "Create account",
            subtitle = "Create your Duet account directly from Android.",
            button = "Create account",
            fields = listOf("Name", "Email", "Password", "Confirm password")
        )
    )

    val profile = WorkspaceSnapshot(
        greeting = "Good evening, Fatih.",
        coupleCode = "DUE-T42",
        workspaceName = "Personal workspace",
        balance = "18.4M UZS",
        metrics = listOf(
            MetricItem("My balance", "9.7M UZS", MetricTone.Neutral),
            MetricItem("This month income", "+6.2M UZS", MetricTone.Income),
            MetricItem("This month expense", "-1.8M UZS", MetricTone.Expense)
        ),
        recent = listOf(
            TransactionItem("Groceries", "Today - Shared - note: weekly restock", "-145K UZS", false),
            TransactionItem("Salary", "Today - Fatih - payroll", "+6.2M UZS", true),
            TransactionItem("Cafe", "Yesterday - Both - quick coffee stop", "-90K UZS", false)
        )
    )

    val dashboardMetrics = listOf(
        MetricItem("Income", "6,200.00 USD", MetricTone.Income),
        MetricItem("Expense", "1,980.00 USD", MetricTone.Expense),
        MetricItem("Balance", "4,220.00 USD", MetricTone.Neutral)
    )
}
