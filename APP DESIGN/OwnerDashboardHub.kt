package com.techbill.mobile.appdesign

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material.icons.filled.Person
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.text.NumberFormat
import java.util.*

// ==========================================
// 📊 STATE & DATA MODELS
// ==========================================
data class StoreEvent(
    val id: String,
    val message: String,
    val timestamp: String
)

data class OwnerDashboardUiState(
    val totalSales: Int = 0,
    val totalRevenue: Double = 0.0,
    val totalNetProfit: Double = 0.0,
    val onlineSales: Double = 0.0,
    val isOnlineOptionEnabled: Boolean = false,
    val liveEvents: List<StoreEvent> = emptyList()
)

// ==========================================
// 🌌 COMPOSABLE SCREEN
// ==========================================
@Composable
fun OwnerDashboardHub(
    uiState: OwnerDashboardUiState,
    onLogoutClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(DeepSpaceDark)
            .padding(16.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // 1. TOP BAR ZONE (Floating Glass Panel)
            TopBarZone(
                userName = "Admin Owner",
                onLogoutClick = onLogoutClick
            )

            // 2. FINANCIAL METRICS GRID
            FinancialMetricsGrid(
                sales = uiState.totalSales,
                revenue = uiState.totalRevenue,
                netProfit = uiState.totalNetProfit
            )

            // 3. GATED ONLINE ANALYTICS CARD
            AnimatedVisibility(
                visible = uiState.isOnlineOptionEnabled,
                enter = expandVertically(animationSpec = spring(stiffness = Spring.StiffnessLow)) + fadeIn(),
                exit = shrinkVertically(animationSpec = spring(stiffness = Spring.StiffnessLow)) + fadeOut()
            ) {
                OnlineAnalyticsCard(onlineSales = uiState.onlineSales)
            }

            // 4. LIVE ACTIVITY TRACKER
            LiveActivityTracker(events = uiState.liveEvents)
        }
    }
}

// ==========================================
// 🧱 SUB-COMPONENTS
// ==========================================

@Composable
fun TopBarZone(
    userName: String,
    onLogoutClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .antigravityGlass(cornerRadius = 20.dp)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Profile Avatar
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(Color.White.copy(alpha = 0.15f))
                    .border(1.dp, NeonCyan, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Person,
                    contentDescription = "User Avatar",
                    tint = NeonCyan,
                    modifier = Modifier.size(24.dp)
                )
            }
            Column {
                Text(
                    text = userName,
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp
                )
                Text(
                    text = "TechBill Mobile",
                    color = NeonCyan,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    fontFamily = FontFamily.Monospace
                )
            }
        }

        // Logout Trigger
        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(CircleShape)
                .background(Color.White.copy(alpha = 0.08f))
                .border(1.dp, NeonPurple.copy(alpha = 0.5f), CircleShape)
                .elasticClickable(onClick = onLogoutClick),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.ExitToApp,
                contentDescription = "Logout Button",
                tint = NeonPurple,
                modifier = Modifier.size(18.dp)
            )
        }
    }
}

@Composable
fun FinancialMetricsGrid(
    sales: Int,
    revenue: Double,
    netProfit: Double
) {
    Column(
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(
            text = "FINANCIAL PERFORMANCE VECTORS",
            color = Color.White.copy(alpha = 0.6f),
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.5.sp
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Total Sales
            Box(modifier = Modifier.weight(1f)) {
                MetricCard(
                    title = "Total Sales",
                    value = sales.toDouble(),
                    isCurrency = false
                )
            }
            // Total Revenue
            Box(modifier = Modifier.weight(1f)) {
                MetricCard(
                    title = "Revenue",
                    value = revenue,
                    isCurrency = true
                )
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth()
        ) {
            // Total Net Profit
            Box(modifier = Modifier.fillMaxWidth()) {
                MetricCard(
                    title = "Total Net Profit",
                    value = netProfit,
                    isCurrency = true,
                    glowColor = ElectricGreen
                )
            }
        }
    }
}

@Composable
fun MetricCard(
    title: String,
    value: Double,
    isCurrency: Boolean,
    glowColor: Color = NeonCyan
) {
    // 1200ms accumulator animation trigger
    var triggerAnimation by remember { mutableStateOf(false) }
    LaunchedEffect(key1 = value) {
        triggerAnimation = true
    }

    val animatedValue by animateFloatAsState(
        targetValue = if (triggerAnimation) value.toFloat() else 0f,
        animationSpec = tween(durationMillis = 1200, easing = FastOutSlowInEasing),
        label = "numericAccumulator"
    )

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .antigravityGlass(cornerRadius = 16.dp)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Text(
            text = title.uppercase(Locale.getDefault()),
            color = Color.White.copy(alpha = 0.5f),
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold
        )

        // Rolling Number accumulation text representation
        val formattedValue = if (isCurrency) {
            val format = NumberFormat.getCurrencyInstance(Locale.US)
            format.format(animatedValue.toDouble())
        } else {
            animatedValue.toInt().toString()
        }

        Text(
            text = formattedValue,
            color = Color.White,
            fontSize = 24.sp,
            fontWeight = FontWeight.Black,
            fontFamily = FontFamily.Monospace
        )

        // Visual sparkline/glow decorator line
        Box(
            modifier = Modifier
                .fillMaxWidth(0.4f)
                .height(2.dp)
                .background(
                    brush = Brush.horizontalGradient(
                        colors = listOf(glowColor, Color.Transparent)
                    )
                )
        )
    }
}

@Composable
fun OnlineAnalyticsCard(
    onlineSales: Double
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .antigravityGlass(cornerRadius = 16.dp)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "ONLINE INTEGRATION PORTAL",
                color = NeonCyan,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp
            )
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .clip(CircleShape)
                    .background(NeonCyan)
            )
        }

        Text(
            text = "Online Order Analytics is fully operational. Cumulative API telemetry reads are synced.",
            color = Color.White.copy(alpha = 0.7f),
            fontSize = 13.sp
        )

        Spacer(modifier = Modifier.height(4.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = "Direct Digital Inflow:",
                color = Color.White.copy(alpha = 0.5f),
                fontSize = 12.sp
            )
            Text(
                text = NumberFormat.getCurrencyInstance(Locale.US).format(onlineSales),
                color = NeonCyan,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace,
                fontSize = 14.sp
            )
        }
    }
}

@Composable
fun LiveActivityTracker(
    events: List<StoreEvent>
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .weight(1f),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Text(
            text = "LIVE ACTIVITY FEED (WEBSOCKET)",
            color = Color.White.copy(alpha = 0.6f),
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.5.sp
        )

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .antigravityGlass(cornerRadius = 18.dp)
                .padding(12.dp)
        ) {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                if (events.isEmpty()) {
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(24.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "Awaiting socket stream payload...",
                                color = Color.White.copy(alpha = 0.4f),
                                fontSize = 12.sp,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                    }
                } else {
                    items(events, key = { it.id }) { event ->
                        LiveEventRow(event = event)
                    }
                }
            }
        }
    }
}

@Composable
fun LiveEventRow(event: StoreEvent) {
    // Breathing/pulsing Green Indicator
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val alphaAnim by infiniteTransition.animateFloat(
        initialValue = 0.3f,
        targetValue = 1.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseAlpha"
    )

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(Color.White.copy(alpha = 0.04f))
            .padding(8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.weight(1f)
        ) {
            Box(
                modifier = Modifier
                    .size(6.dp)
                    .clip(CircleShape)
                    .background(ElectricGreen.copy(alpha = alphaAnim))
            )
            Text(
                text = event.message,
                color = Color.White.copy(alpha = 0.85f),
                fontSize = 12.sp,
                fontFamily = FontFamily.SansSerif
            )
        }
        Text(
            text = event.timestamp,
            color = Color.White.copy(alpha = 0.4f),
            fontSize = 10.sp,
            fontFamily = FontFamily.Monospace
        )
    }
}
