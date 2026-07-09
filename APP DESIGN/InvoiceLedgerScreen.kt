package com.techbill.mobile.appdesign

import android.graphics.pdf.PdfDocument
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.Icon
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Share
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.flow.Flow
import java.text.NumberFormat
import java.util.*

// Note: To compile with real Paging 3, developers import:
// import androidx.paging.PagingData
// import androidx.paging.compose.collectAsLazyPagingItems
// import androidx.paging.compose.items

// ==========================================
// 📊 STATE & DATA MODELS
// ==========================================
enum class InvoiceStatus {
    Paid, Voided
}

data class Invoice(
    val id: String,
    val clientReferenceId: String,
    val clientName: String,
    val clientPhone: String,
    val amount: Double,
    val status: InvoiceStatus,
    val date: String
)

data class InvoiceLedgerUiState(
    val searchQuery: String = "",
    val isExporting: Boolean = false
)

// ==========================================
// 🌌 COMPOSABLE SCREEN
// ==========================================
@Composable
fun InvoiceLedgerScreen(
    uiState: InvoiceLedgerUiState,
    invoiceStream: Flow<List<Invoice>>, // Can be switched to PagingData<Invoice>
    onSearchQueryChange: (String) -> Unit,
    onExportPdf: () -> Unit,
    onShareSheet: () -> Unit,
    onInvoiceClick: (Invoice) -> Unit,
    modifier: Modifier = Modifier
) {
    // Collecting stream items
    val invoicesState = invoiceStream.collectAsState(initial = emptyList())

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
            // Header Zone
            Column {
                Text(
                    text = "TRANSACTION LEDGER",
                    color = NeonCyan,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 2.sp,
                    fontFamily = FontFamily.Monospace
                )
                Text(
                    text = "Invoices & Receipts",
                    color = Color.White,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Black
                )
            }

            // 1. FROSTED INPUT FIELD (Search)
            FrostedSearchField(
                query = uiState.searchQuery,
                onQueryChange = onSearchQueryChange
            )

            // 2. PAGING CORE LAZY LIST
            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                val list = invoicesState.value
                if (list.isEmpty()) {
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(40.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "No invoices matching query.",
                                color = Color.White.copy(alpha = 0.4f),
                                fontSize = 13.sp
                            )
                        }
                    }
                } else {
                    items(list.size, key = { index -> list[index].id }) { index ->
                        InvoiceCard(
                            invoice = list[index],
                            onClick = { onInvoiceClick(list[index]) }
                        )
                    }
                }
            }

            // 3. EXPORT TRIGGER CONTROLS (Double Action)
            ExportTriggerControls(
                isExporting = uiState.isExporting,
                onExportPdf = onExportPdf,
                onShareSheet = onShareSheet
            )
        }
    }
}

// ==========================================
// 🧱 SUB-COMPONENTS
// ==========================================

@Composable
fun FrostedSearchField(
    query: String,
    onQueryChange: (String) -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .antigravityGlass(cornerRadius = 14.dp)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        contentAlignment = Alignment.CenterStart
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(
                imageVector = Icons.Default.Search,
                contentDescription = "Search Lens",
                tint = NeonCyan,
                modifier = Modifier.size(20.dp)
            )

            Box(modifier = Modifier.weight(1f)) {
                if (query.isEmpty()) {
                    Text(
                        text = "Search Client Ref ID or Phone...",
                        color = Color.White.copy(alpha = 0.35f),
                        fontSize = 14.sp
                    )
                }
                BasicTextField(
                    value = query,
                    onValueChange = onQueryChange,
                    textStyle = TextStyle(
                        color = Color.White,
                        fontSize = 14.sp,
                        fontFamily = FontFamily.SansSerif
                    ),
                    cursorBrush = SolidColor(NeonCyan),
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
    }
}

@Composable
fun InvoiceCard(
    invoice: Invoice,
    onClick: () -> Unit
) {
    val isPaid = invoice.status == InvoiceStatus.Paid

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .antigravityGlass(cornerRadius = 16.dp)
            .elasticClickable(onClick = onClick)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Column(
            verticalArrangement = Arrangement.spacedBy(6.dp),
            modifier = Modifier.weight(1f)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = invoice.clientName,
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp
                )
                // Reference ID Badge
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(4.dp))
                        .background(Color.White.copy(alpha = 0.08f))
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = invoice.clientReferenceId,
                        color = NeonCyan,
                        fontSize = 9.sp,
                        fontFamily = FontFamily.Monospace
                    )
                }
            }

            Text(
                text = "Phone: ${invoice.clientPhone} • ${invoice.date}",
                color = Color.White.copy(alpha = 0.5f),
                fontSize = 11.sp
            )
        }

        Column(
            horizontalAlignment = Alignment.End,
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Text(
                text = NumberFormat.getCurrencyInstance(Locale.US).format(invoice.amount),
                color = Color.White,
                fontWeight = FontWeight.Black,
                fontFamily = FontFamily.Monospace,
                fontSize = 16.sp
            )

            // Status indicator badge
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(
                        if (isPaid) ElectricGreen.copy(alpha = 0.08f) else ElectricRed.copy(alpha = 0.08f)
                    )
                    .border(
                        width = 1.dp,
                        color = if (isPaid) ElectricGreen.copy(alpha = 0.3f) else ElectricRed.copy(alpha = 0.3f),
                        shape = RoundedCornerShape(8.dp)
                    )
                    .padding(horizontal = 6.dp, vertical = 2.dp)
            ) {
                Icon(
                    imageVector = if (isPaid) Icons.Default.CheckCircle else Icons.Default.Info,
                    contentDescription = invoice.status.name,
                    tint = if (isPaid) ElectricGreen else ElectricRed,
                    modifier = Modifier.size(10.dp)
                )
                Text(
                    text = invoice.status.name.uppercase(Locale.getDefault()),
                    color = if (isPaid) ElectricGreen else ElectricRed,
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace
                )
            }
        }
    }
}

@Composable
fun ExportTriggerControls(
    isExporting: Boolean,
    onExportPdf: () -> Unit,
    onShareSheet: () -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // PDF compiler trigger
        Box(
            modifier = Modifier
                .weight(1f)
                .antigravityGlass(cornerRadius = 14.dp)
                .elasticClickable(onClick = onExportPdf)
                .padding(vertical = 14.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = if (isExporting) "COMPILING PDF..." else "EXPORT PDF",
                color = NeonCyan,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace,
                fontSize = 12.sp,
                letterSpacing = 1.sp
            )
        }

        // Native share trigger
        Box(
            modifier = Modifier
                .weight(1f)
                .antigravityGlass(cornerRadius = 14.dp)
                .elasticClickable(onClick = onShareSheet)
                .padding(vertical = 14.dp),
            contentAlignment = Alignment.Center
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Share,
                    contentDescription = "Share",
                    tint = NeonPurple,
                    modifier = Modifier.size(16.dp)
                )
                Text(
                    text = "SHARE LEDGER",
                    color = NeonPurple,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace,
                    fontSize = 12.sp,
                    letterSpacing = 1.sp
                )
            }
        }
    }
}
