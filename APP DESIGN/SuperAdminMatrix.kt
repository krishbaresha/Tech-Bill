package com.techbill.mobile.appdesign

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.Button
import androidx.compose.material.ButtonDefaults
import androidx.compose.material.Icon
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Warning
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.util.*

// ==========================================
// 📊 STATE & DATA MODELS
// ==========================================
enum class TenantStatus {
    Active, Suspended, Expiring
}

data class TenantUnit(
    val tenantId: String,
    val companyName: String,
    val ownerName: String,
    val subscriptionExpiresAt: String,
    val status: TenantStatus
)

data class SuperAdminDashboardUiState(
    val activeWebSocketsCount: Int = 0,
    val apiTrafficRates: List<Int> = emptyList(), // API hits per min
    val tenants: List<TenantUnit> = emptyList(),
    val serverCpuUsage: Float = 0f,
    val serverMemoryUsage: Float = 0f
)

// ==========================================
// 🌌 COMPOSABLE SCREEN
// ==========================================
@Composable
fun SuperAdminMatrix(
    uiState: SuperAdminDashboardUiState,
    onRenewTenant: (String) -> Unit,
    onSuspendTenant: (String) -> Unit,
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
            // Title Block
            Column {
                Text(
                    text = "GLOBAL CONTROL MATRIX",
                    color = NeonCyan,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 2.sp,
                    fontFamily = FontFamily.Monospace
                )
                Text(
                    text = "Super Admin Telemetry",
                    color = Color.White,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Black
                )
            }

            // 1. TELEMETRY OVERVIEW WIDGETS
            TelemetryOverviewGrid(
                cpu = uiState.serverCpuUsage,
                memory = uiState.serverMemoryUsage,
                sockets = uiState.activeWebSocketsCount,
                trafficData = uiState.apiTrafficRates
            )

            // 2. TENANT MANAGEMENT STACK
            TenantManagementStack(
                tenants = uiState.tenants,
                onRenew = onRenewTenant,
                onSuspend = onSuspendTenant
            )
        }
    }
}

// ==========================================
// 🧱 SUB-COMPONENTS
// ==========================================

@Composable
fun TelemetryOverviewGrid(
    cpu: Float,
    memory: Float,
    sockets: Int,
    trafficData: List<Int>
) {
    Column(
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(
            text = "SYSTEM METADATA & TELEMETRY",
            color = Color.White.copy(alpha = 0.5f),
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.5.sp
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // CPU & Memory
            Column(
                modifier = Modifier
                    .weight(1f)
                    .antigravityGlass(cornerRadius = 14.dp)
                    .padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = "SERVER INSTANCE",
                    color = Color.White.copy(alpha = 0.4f),
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(text = "CPU Load:", color = Color.White, fontSize = 11.sp)
                    Text(
                        text = "${String.format(Locale.US, "%.1f", cpu)}%",
                        color = TerminalGreen,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold,
                        fontSize = 11.sp
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(text = "Mem Usage:", color = Color.White, fontSize = 11.sp)
                    Text(
                        text = "${String.format(Locale.US, "%.1f", memory)}%",
                        color = TerminalGreen,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold,
                        fontSize = 11.sp
                    )
                }
            }

            // Socket Connections Count
            Column(
                modifier = Modifier
                    .weight(1.0f)
                    .antigravityGlass(cornerRadius = 14.dp)
                    .padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = "SOCKET GATEWAY",
                    color = Color.White.copy(alpha = 0.4f),
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "$sockets Channels",
                    color = NeonCyan,
                    fontSize = 18.sp,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Black
                )
                Text(
                    text = "Active streaming rooms",
                    color = Color.White.copy(alpha = 0.5f),
                    fontSize = 10.sp
                )
            }
        }

        // Live API traffic line chart widget
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .antigravityGlass(cornerRadius = 14.dp)
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = "API TRAFFIC RATE (REQUESTS/MIN)",
                color = Color.White.copy(alpha = 0.4f),
                fontSize = 9.sp,
                fontWeight = FontWeight.Bold
            )

            // Dynamic Line Chart Canvas
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(60.dp)
            ) {
                Canvas(modifier = Modifier.fillMaxSize()) {
                    if (trafficData.size >= 2) {
                        val maxTraffic = (trafficData.maxOrNull() ?: 100).coerceAtLeast(1)
                        val stepX = size.width / (trafficData.size - 1)
                        val path = Path()

                        trafficData.forEachIndexed { index, valRate ->
                            val x = index * stepX
                            val y = size.height - (valRate.toFloat() / maxTraffic * size.height)
                            if (index == 0) {
                                path.moveTo(x, y)
                            } else {
                                path.lineTo(x, y)
                            }
                        }

                        drawPath(
                            path = path,
                            color = NeonPurple,
                            style = Stroke(width = 2.dp.toPx())
                        )

                        // Highlight final point
                        val lastIndex = trafficData.size - 1
                        val lastX = lastIndex * stepX
                        val lastY = size.height - (trafficData[lastIndex].toFloat() / maxTraffic * size.height)
                        drawCircle(
                            color = NeonCyan,
                            radius = 4.dp.toPx(),
                            center = Offset(lastX, lastY)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun TenantManagementStack(
    tenants: List<TenantUnit>,
    onRenew: (String) -> Unit,
    onSuspend: (String) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .weight(1f),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Text(
            text = "TENANT ORG UNITS & LIFECYCLE",
            color = Color.White.copy(alpha = 0.5f),
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
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                if (tenants.isEmpty()) {
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(24.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "No tenant metadata parsed.",
                                color = Color.White.copy(alpha = 0.4f),
                                fontSize = 12.sp
                            )
                        }
                    }
                } else {
                    items(tenants, key = { it.tenantId }) { tenant ->
                        TenantRow(
                            tenant = tenant,
                            onRenew = { onRenew(tenant.tenantId) },
                            onSuspend = { onSuspend(tenant.tenantId) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun TenantRow(
    tenant: TenantUnit,
    onRenew: () -> Unit,
    onSuspend: () -> Unit
) {
    val isSuspended = tenant.status == TenantStatus.Suspended
    val isExpiring = tenant.status == TenantStatus.Expiring

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(Color.White.copy(alpha = 0.03f))
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        // Tenant info
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = tenant.companyName,
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp
                )
                Text(
                    text = "Owner: ${tenant.ownerName} • ID: ${tenant.tenantId}",
                    color = Color.White.copy(alpha = 0.5f),
                    fontSize = 10.sp
                )
            }

            // Expiration warning if expiring
            if (isExpiring) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    modifier = Modifier
                        .clip(RoundedCornerShape(4.dp))
                        .background(Color(0x33FFCC00))
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Warning,
                        contentDescription = "Expiring",
                        tint = Color(0xFFFFCC00),
                        modifier = Modifier.size(10.dp)
                    )
                    Text(
                        text = "EXPIRING SOON",
                        color = Color(0xFFFFCC00),
                        fontSize = 8.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace
                    )
                }
            }
        }

        // Action controls
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Expires: ${tenant.subscriptionExpiresAt}",
                color = if (isExpiring) Color(0xFFFFCC00) else Color.White.copy(alpha = 0.6f),
                fontSize = 11.sp,
                fontFamily = FontFamily.Monospace
            )

            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Suspend Account
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .background(
                            if (isSuspended) Color.White.copy(alpha = 0.1f) else Color(0x33FF3366)
                        )
                        .border(
                            width = 1.dp,
                            color = if (isSuspended) Color.White.copy(alpha = 0.3f) else Color(0xFFFF3366),
                            shape = RoundedCornerShape(6.dp)
                        )
                        .elasticClickable(onClick = onSuspend)
                        .padding(horizontal = 10.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = if (isSuspended) "UNSUSPEND" else "SUSPEND",
                        color = if (isSuspended) Color.White else Color(0xFFFF3366),
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace
                    )
                }

                // Renew Account
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .background(NeonCyan.copy(alpha = 0.15f))
                        .border(
                            width = 1.dp,
                            color = NeonCyan,
                            shape = RoundedCornerShape(6.dp)
                        )
                        .elasticClickable(onClick = onRenew)
                        .padding(horizontal = 10.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = "RENEW",
                        color = NeonCyan,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace
                    )
                }
            }
        }
    }
}
