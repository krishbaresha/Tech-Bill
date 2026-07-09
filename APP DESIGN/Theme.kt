package com.techbill.mobile.appdesign

import android.graphics.RenderEffect
import android.graphics.Shader
import android.os.Build
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.forEachGesture
import androidx.compose.foundation.gestures.waitForUpOrCancellation
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

// ==========================================
// 🌌 THEME COLOR TOKENS
// ==========================================
val NeonCyan = Color(0xFF00F0FF)
val NeonPurple = Color(0xFFD900FF)
val ElectricGreen = Color(0xFF00FF66)
val ElectricRed = Color(0xFFFF3366)
val TranslucentGlassWhite = Color(0x1EFFFFFF) // Color.White.copy(alpha = 0.12f)
val DeepSpaceDark = Color(0xFF0A0B10)
val TerminalGreen = Color(0xFF39FF14)

// ==========================================
// 🌌 CUSTOM ANITGRAVITY GLASS MODIFIERS
// ==========================================

/**
 * Applies the Antigravity Glassmorphism visual style:
 * 1. Hardware-accelerated background blur (RenderEffect or fallback).
 * 2. Translucent glass fill.
 * 3. Asymmetrical neon gradient border.
 * 4. Ambient neon drop shadow glows.
 */
fun Modifier.antigravityGlass(
    cornerRadius: Dp = 16.dp,
    borderWidth: Dp = 1.2.dp
): Modifier = composed {
    val glassShape = RoundedCornerShape(cornerRadius)

    this
        // 1. Space Drop Shadow & Ambient Neon Glow
        .drawBehind {
            drawIntoCanvas { canvas ->
                val paint = Paint().asFrameworkPaint().apply {
                    color = NeonPurple.copy(alpha = 0.15f).toArgb()
                    setShadowLayer(
                        30f, 
                        0f, 
                        8f, 
                        NeonCyan.copy(alpha = 0.2f).toArgb()
                    )
                }
                // Ambient glow underneath the card bounds
                canvas.nativeCanvas.drawRoundRect(
                    0f,
                    0f,
                    size.width,
                    size.height,
                    cornerRadius.toPx(),
                    cornerRadius.toPx(),
                    paint
                )
            }
        }
        // 2. Translucent background fill
        .background(
            color = Color.White.copy(alpha = 0.12f),
            shape = glassShape
        )
        // 3. Hardware-Accelerated Blur (Android S+ RenderEffect or fallback)
        .graphicsLayer {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                renderEffect = RenderEffect.createBlurEffect(
                    20f,
                    20f,
                    Shader.TileMode.CLAMP
                ).asComposeRenderEffect()
            }
        }
        // Fallback blur for older platforms
        .then(
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
                Modifier.blur(20.dp, edgeTreatment = androidx.compose.ui.draw.BlurredEdgeTreatment.Unbounded)
            } else Modifier
        )
        .clip(glassShape)
        // 4. Asymmetrical Neon Border (Neon Cyan/Purple highlight to transparent/black)
        .border(
            width = borderWidth,
            brush = Brush.linearGradient(
                colors = listOf(
                    NeonCyan.copy(alpha = 0.8f),
                    NeonPurple.copy(alpha = 0.8f),
                    Color.Black.copy(alpha = 0.2f),
                    Color.Transparent
                ),
                startX = 0f,
                startY = 0f
            ),
            shape = glassShape
        )
}

/**
 * Custom spring-based scale micro-interaction.
 * Scales element down to 0.96f when pressed, releasing with premium elastic bounce.
 */
fun Modifier.elasticClickable(
    interactionSource: MutableInteractionSource = remember { MutableInteractionSource() },
    onClick: () -> Unit
): Modifier = composed {
    var isPressed by remember { mutableStateOf(false) }
    
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.96f else 1.0f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessLow
        ),
        label = "elasticScale"
    )

    this
        .graphicsLayer {
            scaleX = scale
            scaleY = scale
        }
        .pointerInput(Unit) {
            forEachGesture {
                awaitPointerEventScope {
                    val down = awaitFirstDown(requireUnconsumed = false)
                    isPressed = true
                    val up = waitForUpOrCancellation()
                    isPressed = false
                    if (up != null) {
                        onClick()
                    }
                }
            }
        }
}
