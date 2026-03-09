package com.duet.android.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.weight
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.duet.android.data.AuthAction
import com.duet.android.data.FeatureItem
import com.duet.android.data.MetricItem
import com.duet.android.data.MetricTone
import com.duet.android.data.SampleData
import com.duet.android.data.StatCard
import com.duet.android.data.TransactionItem
import com.duet.android.ui.theme.AccentBlush
import com.duet.android.ui.theme.AccentGold
import com.duet.android.ui.theme.CardSurface
import com.duet.android.ui.theme.DeepInk
import com.duet.android.ui.theme.MutedInk
import com.duet.android.ui.theme.PhoneSurface
import com.duet.android.ui.theme.PositiveTone
import com.duet.android.ui.theme.NegativeTone

@Composable
fun HomeScreen(onPrimaryAction: () -> Unit) {
    ScreenColumn {
        BrandHeader(eyebrow = "Couple Finance Tracker", title = "A warmer way to see your money together.")
        Text(
            text = "Duet keeps one shared financial picture across Telegram, web, and now Android without changing the backend.",
            style = MaterialTheme.typography.bodyLarge,
            color = MutedInk
        )
        Spacer(modifier = Modifier.height(18.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Button(onClick = onPrimaryAction) { Text("Open your workspace") }
            OutlinedButton(onClick = {}) { Text("Explore the system") }
        }
        Spacer(modifier = Modifier.height(28.dp))
        PhonePreviewCard()
        Spacer(modifier = Modifier.height(24.dp))
        HorizontalStatRow(items = SampleData.heroStats)
        Spacer(modifier = Modifier.height(24.dp))
        SectionTitle("What carries over quickly")
        SampleData.features.forEach { FeatureCard(it) }
    }
}

@Composable
fun ProfileGatewayScreen(onContinue: () -> Unit) {
    ScreenColumn {
        BrandHeader(eyebrow = "Profile access", title = "Sign in or create your account here.")
        Text(
            text = "This mirrors the existing Duet gateway while leaving the database and API untouched.",
            style = MaterialTheme.typography.bodyLarge,
            color = MutedInk
        )
        Spacer(modifier = Modifier.height(20.dp))
        SampleData.authActions.forEachIndexed { index, action ->
            AuthCard(action = action, onContinue = if (index == 0) onContinue else onContinue)
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@Composable
fun ProfileScreen(onOpenDashboard: () -> Unit) {
    val snapshot = SampleData.profile
    ScreenColumn {
        BrandHeader(eyebrow = "Profile workspace", title = snapshot.greeting)
        Text(
            text = "Your code: ${snapshot.coupleCode}",
            style = MaterialTheme.typography.labelLarge,
            color = AccentGold
        )
        Spacer(modifier = Modifier.height(18.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedButton(onClick = onOpenDashboard) { Text("View dashboard") }
            OutlinedButton(onClick = {}) { Text("Profile management") }
        }
        Spacer(modifier = Modifier.height(24.dp))
        LargeBalanceCard(snapshot.balance, snapshot.workspaceName)
        Spacer(modifier = Modifier.height(20.dp))
        snapshot.metrics.forEach { MetricCard(it) }
        Spacer(modifier = Modifier.height(20.dp))
        TransactionEntryCard()
        Spacer(modifier = Modifier.height(20.dp))
        RecentActivityCard(items = snapshot.recent)
    }
}

@Composable
fun DashboardScreen(onBackProfile: () -> Unit) {
    ScreenColumn {
        BrandHeader(eyebrow = "Dashboard", title = "Current month in any supported currency.")
        Text(
            text = "Workspace: Personal workspace - Code: ${SampleData.profile.coupleCode}",
            style = MaterialTheme.typography.bodyMedium,
            color = MutedInk
        )
        Spacer(modifier = Modifier.height(18.dp))
        OutlinedButton(onClick = onBackProfile) { Text("Back to profile") }
        Spacer(modifier = Modifier.height(20.dp))
        SampleData.dashboardMetrics.forEach { MetricCard(it) }
        Spacer(modifier = Modifier.height(20.dp))
        RecentActivityCard(items = SampleData.profile.recent, title = "Recent activity", subtitle = "Original and converted amounts can be shown here once API wiring is added.")
    }
}

@Composable
private fun ScreenColumn(content: @Composable ColumnScope.() -> Unit) {
    Column(
        modifier = Modifier
            .verticalScroll(rememberScrollState())
            .windowInsetsPadding(WindowInsets.safeDrawing)
            .windowInsetsPadding(WindowInsets.navigationBars)
            .padding(horizontal = 20.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(0.dp),
        content = content
    )
}

@Composable
private fun BrandHeader(eyebrow: String, title: String) {
    Spacer(modifier = Modifier.height(12.dp))
    Text(
        text = "DUET",
        fontFamily = FontFamily.Serif,
        fontWeight = FontWeight.Light,
        letterSpacing = 6.sp,
        style = MaterialTheme.typography.headlineSmall
    )
    Spacer(modifier = Modifier.height(22.dp))
    Text(
        text = eyebrow.uppercase(),
        color = AccentGold,
        style = MaterialTheme.typography.labelSmall,
        letterSpacing = 3.sp
    )
    Spacer(modifier = Modifier.height(12.dp))
    Text(
        text = title,
        style = MaterialTheme.typography.displaySmall,
        fontFamily = FontFamily.Serif,
        fontWeight = FontWeight.Light,
        lineHeight = 44.sp
    )
}

@Composable
private fun PhonePreviewCard() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = CardSurface),
        shape = RoundedCornerShape(28.dp)
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Text(text = "Good evening, both of you", color = MutedInk, style = MaterialTheme.typography.bodyMedium)
            Spacer(modifier = Modifier.height(10.dp))
            Text(
                text = "18.4M UZS",
                style = MaterialTheme.typography.displaySmall,
                fontFamily = FontFamily.Serif,
                fontWeight = FontWeight.Light
            )
            Spacer(modifier = Modifier.height(18.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(22.dp))
                    .background(PhoneSurface)
                    .padding(18.dp)
            ) {
                Column {
                    Text("Shared balance", color = Color(0xFFF5F0E8).copy(alpha = 0.72f), style = MaterialTheme.typography.labelMedium)
                    Spacer(modifier = Modifier.height(10.dp))
                    Text("+2.1M", color = Color(0xFFF5F0E8), style = MaterialTheme.typography.headlineMedium, fontFamily = FontFamily.Serif)
                    Text("this month", color = Color(0xFFF5F0E8).copy(alpha = 0.72f), style = MaterialTheme.typography.bodySmall)
                }
            }
            Spacer(modifier = Modifier.height(18.dp))
            SampleData.profile.recent.forEach { item ->
                TransactionRow(item)
                Spacer(modifier = Modifier.height(10.dp))
            }
        }
    }
}

@Composable
private fun HorizontalStatRow(items: List<StatCard>) {
    Row(
        modifier = Modifier
            .horizontalScroll(rememberScrollState())
            .fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items.forEach { item ->
            Card(
                colors = CardDefaults.cardColors(containerColor = CardSurface),
                shape = RoundedCornerShape(22.dp)
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Text(item.value, fontFamily = FontFamily.Serif, style = MaterialTheme.typography.headlineSmall)
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(item.label, color = MutedInk, style = MaterialTheme.typography.bodyMedium)
                }
            }
        }
    }
}

@Composable
private fun FeatureCard(item: FeatureItem) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 12.dp),
        colors = CardDefaults.cardColors(containerColor = CardSurface),
        shape = RoundedCornerShape(24.dp)
    ) {
        Row(modifier = Modifier.padding(18.dp), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(16.dp))
                    .background(AccentBlush.copy(alpha = 0.14f))
                    .border(1.dp, AccentGold.copy(alpha = 0.2f), RoundedCornerShape(16.dp))
                    .padding(horizontal = 14.dp, vertical = 10.dp)
            ) {
                Text(item.index, color = DeepInk, style = MaterialTheme.typography.labelLarge)
            }
            Column {
                Text(item.title, style = MaterialTheme.typography.titleLarge, fontFamily = FontFamily.Serif)
                Spacer(modifier = Modifier.height(4.dp))
                Text(item.text, color = MutedInk, style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}

@Composable
private fun AuthCard(action: AuthAction, onContinue: () -> Unit) {
    Card(colors = CardDefaults.cardColors(containerColor = CardSurface), shape = RoundedCornerShape(26.dp)) {
        Column(modifier = Modifier.padding(20.dp)) {
            Text(action.title, style = MaterialTheme.typography.titleLarge, fontFamily = FontFamily.Serif)
            Spacer(modifier = Modifier.height(6.dp))
            Text(action.subtitle, style = MaterialTheme.typography.bodyMedium, color = MutedInk)
            Spacer(modifier = Modifier.height(14.dp))
            action.fields.forEach { field ->
                OutlinedTextField(
                    value = "",
                    onValueChange = {},
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text(field) },
                    singleLine = true
                )
                Spacer(modifier = Modifier.height(10.dp))
            }
            Button(onClick = onContinue, modifier = Modifier.fillMaxWidth()) {
                Text(action.button)
            }
        }
    }
}

@Composable
private fun LargeBalanceCard(balance: String, workspaceName: String) {
    Card(colors = CardDefaults.cardColors(containerColor = DeepInk), shape = RoundedCornerShape(28.dp)) {
        Column(modifier = Modifier.padding(20.dp)) {
            Text(workspaceName, color = Color(0xFFF5F0E8).copy(alpha = 0.72f), style = MaterialTheme.typography.bodyMedium)
            Spacer(modifier = Modifier.height(8.dp))
            Text(balance, color = Color(0xFFF5F0E8), style = MaterialTheme.typography.displaySmall, fontFamily = FontFamily.Serif)
            Spacer(modifier = Modifier.height(6.dp))
            Text("Shared picture, calmer decisions.", color = Color(0xFFF5F0E8).copy(alpha = 0.72f), style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun MetricCard(item: MetricItem) {
    val accent = when (item.tone) {
        MetricTone.Income -> PositiveTone
        MetricTone.Expense -> NegativeTone
        MetricTone.Neutral -> AccentGold
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 12.dp),
        colors = CardDefaults.cardColors(containerColor = CardSurface),
        shape = RoundedCornerShape(24.dp)
    ) {
        Column(modifier = Modifier.padding(18.dp)) {
            Text(item.title, color = MutedInk, style = MaterialTheme.typography.labelLarge)
            Spacer(modifier = Modifier.height(8.dp))
            Text(item.value, color = accent, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun TransactionEntryCard() {
    Card(colors = CardDefaults.cardColors(containerColor = CardSurface), shape = RoundedCornerShape(26.dp)) {
        Column(modifier = Modifier.padding(20.dp)) {
            Text("Add income or expense", style = MaterialTheme.typography.titleLarge, fontFamily = FontFamily.Serif)
            Spacer(modifier = Modifier.height(6.dp))
            Text("Transactions will later post to the existing API and database.", color = MutedInk, style = MaterialTheme.typography.bodyMedium)
            Spacer(modifier = Modifier.height(14.dp))
            listOf("Type", "Amount", "Currency", "Category", "Note").forEach { field ->
                OutlinedTextField(
                    value = "",
                    onValueChange = {},
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text(field) },
                    singleLine = true
                )
                Spacer(modifier = Modifier.height(10.dp))
            }
            Button(onClick = {}, modifier = Modifier.fillMaxWidth()) { Text("Save transaction") }
        }
    }
}

@Composable
private fun RecentActivityCard(
    items: List<TransactionItem>,
    title: String = "Recent activity",
    subtitle: String = "Recent transaction history keeps the same warm Duet presentation."
) {
    Card(colors = CardDefaults.cardColors(containerColor = CardSurface), shape = RoundedCornerShape(26.dp)) {
        Column(modifier = Modifier.padding(20.dp)) {
            Text(title, style = MaterialTheme.typography.titleLarge, fontFamily = FontFamily.Serif)
            Spacer(modifier = Modifier.height(6.dp))
            Text(subtitle, color = MutedInk, style = MaterialTheme.typography.bodyMedium)
            Spacer(modifier = Modifier.height(14.dp))
            items.forEachIndexed { index, item ->
                TransactionRow(item)
                if (index != items.lastIndex) {
                    Spacer(modifier = Modifier.height(10.dp))
                    Divider(color = AccentGold.copy(alpha = 0.14f))
                    Spacer(modifier = Modifier.height(10.dp))
                }
            }
        }
    }
}

@Composable
private fun TransactionRow(item: TransactionItem) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(item.title, style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(2.dp))
            Text(item.meta, style = MaterialTheme.typography.bodySmall, color = MutedInk)
        }
        Spacer(modifier = Modifier.width(14.dp))
        Text(
            item.amount,
            color = if (item.positive) PositiveTone else NegativeTone,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
private fun SectionTitle(text: String) {
    Text(text, style = MaterialTheme.typography.headlineSmall, fontFamily = FontFamily.Serif, fontStyle = FontStyle.Italic)
    Spacer(modifier = Modifier.height(12.dp))
}
