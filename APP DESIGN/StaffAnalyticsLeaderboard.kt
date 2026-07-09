package com.techbill.mobile.appdesign

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.Icon
import androidx.compose.material.LinearProgressIndicator
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.text.NumberFormat
import java.util.*

// ==========================================
// 📊 STATE & DATA MODELS
// ==========================================
data class CashierPerformance(
    val cashierId: String,
    val name: String,
    val transactionCount: Int,
    val totalRevenue: Double,
    val targetRevenue: Double,
    val isClockedIn: Boolean,
    val clockInTime: String
)

data class StaffAnalyticsUiState(
    val staffList: List<CashierPerformance> = emptyList()
)

// ==========================================
// 🌌 COMPOSABLE SCREEN
// ==========================================
@Composable
fun StaffAnalyticsLeaderboard(
    uiState: StaffAnalyticsUiState,
    onStaffClick: (CashierPerformance) -> Unit,
    modifier: Modifier = Modifier
) {
    // Sort staff list dynamically by revenue productivity (highest first)
    val sortedStaff = remember(uiState.staffList) {
        uiState.staffList.sortedByDescending { it.totalRevenue }
    }

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
            // Screen Title Zone
            Column {
                Text(
                    text = "STAFF ANALYTICS",
                    color = NeonCyan,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 2.sp,
                    fontFamily = FontFamily.Monospace
                )
                Text(
                    text = "Performance Leaderboard",
                    color = Color.White,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Black
                )
            }

            // Performance Stack
            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                if (sortedStaff.isEmpty()) {
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(40.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "No staff member data available.",
                                color = Color.White.copy(alpha = 0.4f),
                                fontSize = 13.sp
                            )
                        }
                    }
                } else {
                    itemsIndexed(sortedStaff, key = { _, staff -> staff.cashierId }) { index, staff ->
                        StaffPerformanceCard(
                            rank = index + 1,
                            staff = staff,
                            onClick = { onStaffClick(staff) }
                        )
                    }
                }
            }
        }
    }
}

// ==========================================
// 🧱 SUB-COMPONENTS
// ==========================================

@Composable
fun StaffPerformanceCard(
    rank: Int,
    staff: CashierPerformance,
    onClick: () -> Unit
) {
    val progressRatio = (staff.totalRevenue / staff.targetRevenue).coerceIn(0.0, 1.0).toFloat()
    
    // Animate the progress bar upon visibility
    val animatedProgress by animateFloatAsState(
        targetValue = progressRatio,
        animationSpec = tween(durationMillis = 1000, easing = FastOutSlowInEasing),
        label = "progressAnimation"
    )

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .antigravityGlass(cornerRadius = 16.dp)
            .elasticClickable(onClick = onClick)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Top row: Rank, Name, Clock Status
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Rank Circle
                Box(
                    modifier = Modifier
                        .size(24.dp)
                        .clip(CircleShape)
                        .background(
                            if (rank == 1) NeonCyan.copy(alpha = 0.2f) else Color.White.copy(alpha = 0.08f)
                        )
                        .border(
                            width = 1.dp,
                            color = if (rank == 1) NeonCyan else Color.White.copy(alpha = 0.3f),
                            shape = CircleShape
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = rank.toString(),
                        color = if (rank == 1) NeonCyan else Color.White,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace
                    )
                }

                Text(
                    text = staff.name,
                    color = Color.White,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )
            }

            // Clock-In Vector Status Badge
            ClockInStatusBadge(isClockedIn = staff.isClockedIn, clockInTime = staff.clockInTime)
        }

        // Mid Row: Metrics overview
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Text(
                    text = "Sales Volume",
                    color = Color.White.copy(alpha = 0.4f),
                    fontSize = 10.sp
                )
                Text(
                    text = "${staff.transactionCount} Trans",
                    color = Color.White,
                    fontSize = 13.sp,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.SemiBold
                )
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "Generated Revenue",
                    color = Color.White.copy(alpha = 0.4f),
                    fontSize = 10.sp
                )
                Text(
                    text = NumberFormat.getCurrencyInstance(Locale.US).format(staff.totalRevenue),
                    color = NeonCyan,
                    fontSize = 13.sp,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        // Progress bar container
        Column(
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "Target Progress",
                    color = Color.White.copy(alpha = 0.4f),
                    fontSize = 9.sp
                )
                Text(
                    text = "${(progressRatio * 100).toInt()}%",
                    color = NeonPurple,
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace
                )
            }

            // Neon Linear Progress indicator
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(6.dp)
                    .clip(RoundedCornerShape(3.dp))
                    .background(Color.White.copy(alpha = 0.05f))
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(animatedProgress)
                        .fillMaxHeight()
                        .clip(RoundedCornerShape(3.dp))
                        .background(
                            brush = Brush.horizontalGradient(
                                colors = listOf(NeonPurple, NeonCyan)
                            )
                        )
                )
            }
        }
    }
}

@Composable
fun ClockInStatusBadge(
    isClockedIn: Boolean,
    clockInTime: String
) {
    // Breathing green indicator
    val infiniteTransition = rememberInfiniteTransition(label = "badgePulse")
    val alphaAnim by infiniteTransition.animateFloat(
        initialValue = 0.2f,
        targetValue = 1.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = FastOutLinearInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "greenGlow"
    )

    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .background(
                if (isClockedIn) ElectricGreen.copy(alpha = 0.08f) else Color.White.copy(alpha = 0.05f)
            )
            .border(
                width = 1.dp,
                color = if (isClockedIn) ElectricGreen.copy(alpha = 0.3f) else Color.White.copy(alpha = 0.15f),
                shape = RoundedCornerShape(12.dp)
            )
            .padding(horizontal = 8.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Box(
            modifier = Modifier
                .size(6.dp)
                .clip(CircleShape)
                .background(
                    if (isClockedIn) ElectricGreen.copy(alpha = alphaAnim) else Color.White.copy(alpha = 0.4f)
                )
        )
        Text(
            text = if (isClockedIn) "Active - $clockInTime" else "Offline",
            color = if (isClockedIn) ElectricGreen else Color.White.copy(alpha = 0.6f),
            fontSize = 9.sp,
            fontWeight = FontWeight.Bold,
            fontFamily = FontFamily.Monospace
        )
    }
}
